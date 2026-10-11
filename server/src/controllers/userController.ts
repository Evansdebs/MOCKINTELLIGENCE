import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';
import { getSupabaseAdmin } from '../services/supabaseAdmin';

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        subjects: {
          select: {
            subject: {
              select: { id: true, name: true, code: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' },
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve users.' });
  }
}

export async function createUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { username, email, name, role, password } = req.body;
    if (!username || !email || !name || !role) {
      res.status(400).json({ error: 'Username, email, name, and role are required.' });
      return;
    }

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedUsername = username.trim();

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: trimmedUsername }, { email: trimmedEmail }],
      },
    });

    if (existing) {
      res.status(400).json({ error: 'A user with this username or email already exists in the system.' });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    let authUserId: string | null = null;
    let setupLink: string | null = null;
    let successMessage = '';

    // Track A: Admin specified an initial password for the staff member
    if (password && password.trim().length >= 6) {
      const { data: createData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: trimmedEmail,
        password: password.trim(),
        email_confirm: true,
      });

      if (createError || !createData?.user) {
        res.status(400).json({
          error: `Supabase Auth error: ${createError?.message || 'Failed to create user in Auth.'}`,
        });
        return;
      }
      authUserId = createData.user.id;
      successMessage = 'Staff account created successfully with initial password in Supabase Auth.';
    } else {
      // Track B: Invite by email. If SMTP fails, fallback gracefully to generateLink so admin isn't blocked!
      const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
        trimmedEmail
      );

      if (!inviteError && inviteData?.user) {
        authUserId = inviteData.user.id;
        successMessage = 'Staff account created and invitation email sent successfully.';
      } else {
        // SMTP dispatch failed (e.g. rate limit, unconfigured SMTP). Fallback to generateLink!
        const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
          type: 'invite',
          email: trimmedEmail,
        });

        if (linkError || !linkData?.user) {
          res.status(400).json({
            error: `Supabase Auth error: ${inviteError?.message || linkError?.message}. If this email exists in Auth, remove it from Supabase before re-adding.`,
          });
          return;
        }

        authUserId = linkData.user.id;
        setupLink = linkData.properties?.action_link || null;
        successMessage =
          'Staff account created in Supabase Auth. Because email delivery is currently restricted, use the setup link provided below.';
      }
    }

    // Step 2: Insert public."User" pre-bound to authUserId with passwordHash: null
    try {
      const user = await prisma.user.create({
        data: {
          username: trimmedUsername,
          email: trimmedEmail,
          name: name.trim(),
          passwordHash: null,
          role,
          status: 'Active',
          authUserId,
        },
        select: {
          id: true,
          username: true,
          name: true,
          email: true,
          role: true,
          status: true,
          createdAt: true,
          authUserId: true,
        },
      });

      await logAudit({
        userId: req.user?.userId,
        userName: req.user?.name || 'Admin',
        action: 'CREATE_USER',
        recordType: 'User',
        recordId: user.id,
        newValue: `Created staff user ${user.name} (${user.role}) in Supabase Auth`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        user,
        message: successMessage,
        setupLink,
      });
    } catch (prismaErr: any) {
      // Compensating action: Delete the created Auth user to prevent orphaned identities.
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((delErr) => {
          console.error('Failed compensating delete of auth user:', delErr);
        });
      }

      console.error('Database write failed during staff creation:', prismaErr);
      res.status(500).json({
        error: 'Failed to record user in database. The Supabase identity was revoked for consistency.',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
}

/**
 * Admin action: Invites an existing legacy staff member to Supabase Auth and binds authUserId.
 */
export async function inviteStaffToAuth(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      res.status(404).json({ error: 'Staff account not found.' });
      return;
    }

    if (user.authUserId) {
      res.status(400).json({ error: 'This staff account is already bound to a Supabase Auth identity.' });
      return;
    }

    const supabaseAdmin = getSupabaseAdmin();
    let authUserId: string | null = null;
    let setupLink: string | null = null;
    let successMessage = '';

    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      user.email
    );

    if (!inviteError && inviteData?.user) {
      authUserId = inviteData.user.id;
      successMessage = `Supabase Auth invitation email sent to ${user.email} and account bound.`;
    } else {
      // Fallback to generateLink if email sending failed
      const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
        type: 'invite',
        email: user.email,
      });

      if (linkError || !linkData?.user) {
        res.status(400).json({
          error: `Supabase Auth error: ${inviteError?.message || linkError?.message}. If this email is already registered in Auth, please resolve it in Supabase Dashboard.`,
        });
        return;
      }

      authUserId = linkData.user.id;
      setupLink = linkData.properties?.action_link || null;
      successMessage = `Account bound to Supabase Auth. Email delivery failed, so use the setup link provided below.`;
    }

    try {
      await prisma.user.update({
        where: { id },
        data: { authUserId },
      });

      await logAudit({
        userId: req.user?.userId,
        userName: req.user?.name || 'Admin',
        action: 'INVITE_STAFF_AUTH',
        recordType: 'User',
        recordId: id,
        newValue: `Invited user ${user.name} to Supabase Auth (bound authUserId: ${authUserId})`,
        ipAddress: req.ip,
      });

      res.json({
        message: successMessage,
        authUserId,
        setupLink,
      });
    } catch (prismaErr: any) {
      if (authUserId) {
        await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((delErr) => {
          console.error('Failed compensating delete of auth user on invite:', delErr);
        });
      }

      res.status(500).json({
        error: 'Failed to bind authUserId in database. The Supabase identity has been revoked.',
      });
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to invite staff member.' });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, email, role, status, password } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const nextName = name ? name.trim() : existing.name;
    const nextEmail = email ? email.trim().toLowerCase() : existing.email;
    const nextRole = role || existing.role;
    const nextStatus = status || existing.status;

    // Check uniqueness if email changed
    if (nextEmail !== existing.email) {
      const emailCollision = await prisma.user.findUnique({ where: { email: nextEmail } });
      if (emailCollision && emailCollision.id !== id) {
        res.status(400).json({ error: 'Another user already has this email address.' });
        return;
      }
    }

    // If account is linked to Supabase Auth, sync changes to auth.users
    if (existing.authUserId) {
      const supabaseAdmin = getSupabaseAdmin();
      const authUpdates: any = {};

      if (nextEmail !== existing.email) {
        authUpdates.email = nextEmail;
        authUpdates.email_confirm = true;
      }
      if (password && password.trim()) {
        if (password.trim().length < 6) {
          res.status(400).json({ error: 'Password must be at least 6 characters long.' });
          return;
        }
        authUpdates.password = password.trim();
      }
      if (nextName !== existing.name) {
        authUpdates.user_metadata = { name: nextName };
      }

      if (Object.keys(authUpdates).length > 0) {
        const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
          existing.authUserId,
          authUpdates
        );

        if (authErr) {
          res.status(400).json({
            error: `Failed to update Supabase Auth user: ${authErr.message}`,
          });
          return;
        }
      }
    }

    const data: any = {
      name: nextName,
      email: nextEmail,
      role: nextRole,
      status: nextStatus,
    };

    // If password provided and account still has legacy hash / not linked, update passwordHash
    if (password && password.trim()) {
      if (password.trim().length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }
      if (!existing.authUserId) {
        data.passwordHash = await bcrypt.hash(password.trim(), 10);
      }
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        status: true,
        authUserId: true,
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_USER',
      recordType: 'User',
      recordId: id,
      newValue: `Updated user ${updated.name} (${updated.role}, ${updated.status})`,
      ipAddress: req.ip,
    });

    res.json({ user: updated, message: 'User updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update user.' });
  }
}

export async function updateUserSubjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { subjectIds } = req.body;

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing || existing.role !== 'TEACHER') {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }

    // Replace subjects
    await prisma.teacherSubject.deleteMany({
      where: { userId: id }
    });

    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      await prisma.teacherSubject.createMany({
        data: subjectIds.map((subjectId: string) => ({
          userId: id,
          subjectId
        }))
      });
    }

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_TEACHER_SUBJECTS',
      recordType: 'User',
      recordId: id,
      newValue: `Updated subjects for teacher ${existing.name}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Teacher subjects updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update teacher subjects.' });
  }
}

export async function resetUserPassword(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.trim().length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const trimmedPassword = newPassword.trim();

    // If bound to Supabase Auth, update via Admin API
    if (existing.authUserId) {
      const supabaseAdmin = getSupabaseAdmin();
      const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(
        existing.authUserId,
        { password: trimmedPassword }
      );

      if (authErr) {
        res.status(400).json({
          error: `Failed to reset password in Supabase Auth: ${authErr.message}`,
        });
        return;
      }
    } else {
      // Legacy account: hash locally
      const passwordHash = await bcrypt.hash(trimmedPassword, 10);
      await prisma.user.update({
        where: { id },
        data: { passwordHash },
      });
    }

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'RESET_USER_PASSWORD',
      recordType: 'User',
      recordId: id,
      newValue: `Reset password for user ${existing.name}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
}
