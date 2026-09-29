import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';
import { UserTokenPayload } from '../types';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mock-intelligence-jwt-key-2026-ghana';

export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      res.status(400).json({ error: 'Username/Email and password are required.' });
      return;
    }

    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { username: username.trim() },
          { email: username.trim().toLowerCase() },
        ],
      },
      include: {
        subjects: true,
      }
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
      return;
    }

    const payload: UserTokenPayload = {
      userId: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role as any,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    await logAudit({
      userId: user.id,
      userName: user.name,
      action: 'USER_LOGIN',
      recordType: 'User',
      recordId: user.id,
      newValue: `Logged in with role ${user.role}`,
      ipAddress: req.ip,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        subjects: user.subjects,
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed due to an internal server error.' });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, username: true, name: true, email: true, role: true, status: true, subjects: true },
    });

    if (!user) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}
