import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { db } from '../index';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getUsers(req: AuthRequest, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('users').orderBy('name', 'asc').get();
    let users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Map subjects for teachers
    for (let u of users) {
      delete u.passwordHash; // Don't leak passwords
      if (u.role === 'TEACHER') {
        const tsSnapshot = await db.collection('teacherSubjects').where('userId', '==', u.id).get();
        const subjectIds = tsSnapshot.docs.map(doc => doc.data().subjectId);
        
        u.subjects = [];
        for (const sid of subjectIds) {
          const subDoc = await db.collection('subjects').doc(sid).get();
          if (subDoc.exists) {
            u.subjects.push({ subject: { id: subDoc.id, name: subDoc.data()?.name, code: subDoc.data()?.code } });
          }
        }
      } else {
        u.subjects = [];
      }
    }
    
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

    const usersRef = db.collection('users');
    const existUser = await usersRef.where('username', '==', username.trim()).get();
    const existEmail = await usersRef.where('email', '==', email.trim().toLowerCase()).get();

    if (!existUser.empty || !existEmail.empty) {
      res.status(400).json({ error: 'A user with this username or email already exists.' });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const data = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      name: name.trim(),
      passwordHash,
      role,
      status: 'Active',
      createdAt: new Date().toISOString()
    };

    const docRef = await usersRef.add(data);
    const user = { id: docRef.id, ...data };
    delete (user as any).passwordHash;

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
    const id = req.params.id as string;
    const { name, email, role, status, password } = req.body;

    const userRef = db.collection('users').doc(id);
    const existingDoc = await userRef.get();

    if (!existingDoc.exists) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    const existing = existingDoc.data() as any;

    const data: any = {
      name: name ? name.trim() : existing.name,
      email: email ? email.trim().toLowerCase() : existing.email,
      role: role || existing.role,
      status: status || existing.status,
      updatedAt: new Date().toISOString()
    };

    if (password && password.trim()) {
      data.passwordHash = await bcrypt.hash(password.trim(), 10);
    }

    await userRef.update(data);
    const updated = { id, ...data };
    delete updated.passwordHash;

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

    const existingDoc = await db.collection('users').doc(id).get();
    if (!existingDoc.exists || existingDoc.data()?.role !== 'TEACHER') {
      res.status(404).json({ error: 'Teacher not found.' });
      return;
    }

    // Delete existing
    const tsSnapshot = await db.collection('teacherSubjects').where('userId', '==', id).get();
    const batch = db.batch();
    tsSnapshot.docs.forEach(doc => batch.delete(doc.ref));

    // Create new
    if (Array.isArray(subjectIds)) {
      for (const subId of subjectIds) {
        const newRef = db.collection('teacherSubjects').doc(`${id}_${subId}`);
        batch.set(newRef, { userId: id, subjectId: subId });
      }
    }

    await batch.commit();

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_TEACHER_SUBJECTS',
      recordType: 'User',
      recordId: id,
      newValue: `Updated subjects for teacher ${existingDoc.data()?.name}`,
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

    const existingDoc = await db.collection('users').doc(id).get();
    if (!existingDoc.exists) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.collection('users').doc(id).update({ passwordHash });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'RESET_USER_PASSWORD',
      recordType: 'User',
      recordId: id,
      newValue: `Reset password for user ${existingDoc.data()?.name}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Password reset successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to reset password.' });
  }
}
