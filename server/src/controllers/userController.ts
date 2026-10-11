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
    const { username, email, name, role } = req.body;
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

    // Step 1: Send invitation via Supabase Auth Admin API
    const supabaseAdmin = getSupabaseAdmin();
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      trimmedEmail
    );

    if (inviteError || !inviteData?.user) {
      const msg = inviteError?.message || 'Failed to send Supabase Auth invite.';
      res.status(400).json({
        error: `Supabase Auth error: ${msg}. If this email is already registered in Auth, please resolve the Auth identity before creating.`,
      });
      return;
    }

    const authUserId = inviteData.user.id;

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
        newValue: `Created staff user ${user.name} (${user.role}) and sent Supabase invite`,
        ipAddress: req.ip,
      });

      res.status(201).json({
        user,
        message: 'Staff account created and Supabase invitation email sent successfully.',
      });
    } catch (prismaErr: any) {
      // Compensating action: Delete the created Auth user to prevent orphaned identities.
      // Note: An invitation email was already dispatched by Supabase, but deleting the Auth record
      // invalidates the invite token immediately.
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((delErr) => {
        console.error('Failed compensating delete of auth user:', delErr);
      });

      console.error('Database write failed during staff creation:', prismaErr);
      res.status(500).json({
        error: 'Failed to record user in database. The Supabase invitation was revoked for consistency.',
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
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      user.email
    );

    if (inviteError || !inviteData?.user) {
      const msg = inviteError?.message || 'Failed to send Supabase Auth invite.';
      res.status(400).json({
        error: `Supabase Auth error: ${msg}. If this email is already registered in Auth, please resolve the Auth identity before inviting.`,
      });
      return;
    }

    const authUserId = inviteData.user.id;

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
        message: `Supabase Auth invitation sent to ${user.email} and account bound.`,
        authUserId,
      });
    } catch (prismaErr: any) {
      // Compensating action: Delete newly created Auth identity
      await supabaseAdmin.auth.admin.deleteUser(authUserId).catch((delErr) => {
        console.error('Failed compensating delete of auth user on invite:', delErr);
      });

      res.status(500).json({
        error: 'Failed to bind authUserId in database. The Supabase invitation has been revoked.',
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

    const data: any = {
      name: name ? name.trim() : existing.name,
      email: email ? email.trim().toLowerCase() : existing.email,
      role: role || existing.role,
      status: status || existing.status,
    };

    if (password && password.trim()) {
      data.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    const updated = await prisma.user.update({
      where: { id },
      data,
      select: { id: true, username: true, name: true, email: true, role: true, status: true },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_USER',
      recordType: 'User',
      recordId: id,
      newValue: `Updated user ${updated.name}`,
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
    
    if (!newPassword || newPassword.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters long.' });
      return;
    }

    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
      where: { id },
      data: { passwordHash },
    });

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
