import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { db } from '../index';
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

    const usersRef = db.collection('users');
    let snapshot = await usersRef.where('username', '==', username.trim()).get();
    if (snapshot.empty) {
      snapshot = await usersRef.where('email', '==', username.trim().toLowerCase()).get();
    }

    if (snapshot.empty) {
      res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
      return;
    }

    const userDoc = snapshot.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() } as any;

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
        subjects: user.subjects || [],
      },
    });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Authentication failed due to an internal server error.' });
  }
}

export async function studentLogin(req: Request, res: Response): Promise<void> {
  try {
    const { indexNumber, studentId } = req.body;
    if (!indexNumber || !studentId) {
      res.status(400).json({ error: 'Index Number and Student ID are required.' });
      return;
    }

    const snapshot = await db.collection('students')
      .where('indexNumber', '==', indexNumber.trim())
      .where('studentId', '==', studentId.trim())
      .where('status', '==', 'Active')
      .get();

    if (snapshot.empty) {
      res.status(401).json({ error: 'Invalid Index Number or Student ID.' });
      return;
    }

    const studentDoc = snapshot.docs[0];
    const student = { id: studentDoc.id, ...studentDoc.data() } as any;

    const payload: UserTokenPayload = {
      userId: student.id,
      username: student.indexNumber,
      name: student.fullName,
      email: '',
      role: 'STUDENT' as any,
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        id: student.id,
        username: student.indexNumber,
        name: student.fullName,
        email: '',
        role: 'STUDENT',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Authentication failed.' });
  }
}

export async function me(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }

    if (req.user.role === 'STUDENT') {
      const studentDoc = await db.collection('students').doc(req.user.userId).get();
      if (!studentDoc.exists) {
        res.status(404).json({ error: 'Student not found.' });
        return;
      }
      const student = studentDoc.data() as any;
      res.json({
        user: {
          id: studentDoc.id,
          username: student.indexNumber,
          name: student.fullName,
          email: '',
          role: 'STUDENT',
        }
      });
      return;
    }

    const userDoc = await db.collection('users').doc(req.user.userId).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: 'User account not found.' });
      return;
    }

    const user = { id: userDoc.id, ...userDoc.data() } as any;
    delete user.passwordHash;

    // Attach subjects for teachers
    if (user.role === 'TEACHER') {
      const tsSnapshot = await db.collection('teacherSubjects').where('userId', '==', user.id).get();
      const subjects = [];
      for (const tsDoc of tsSnapshot.docs) {
        const subDoc = await db.collection('subjects').doc(tsDoc.data().subjectId).get();
        if (subDoc.exists) {
          subjects.push({ subject: { id: subDoc.id, ...subDoc.data() } });
        }
      }
      user.subjects = subjects;
    }

    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}
