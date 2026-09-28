import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

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
    const { username, email, name, password, role } = req.body;
    if (!username || !email || !name || !password || !role) {
      res.status(400).json({ error: 'All fields are required.' });
      return;
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
      },
    });

    if (existing) {
      res.status(400).json({ error: 'A user with this username or email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        name: name.trim(),
        passwordHash,
        role,
        status: 'Active',
      },
      select: {
        id: true,
        username: true,
        name: true,
        email: true,
        role: true,
        status: true,
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'CREATE_USER',
      recordType: 'User',
      recordId: user.id,
      newValue: `Created ${user.role} account for ${user.name}`,
      ipAddress: req.ip,
    });

    res.status(201).json({ user, message: 'User created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create user.' });
  }
}

export async function updateUser(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
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
    const { id } = req.params;
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
