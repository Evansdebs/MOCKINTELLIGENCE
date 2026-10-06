import { Response } from 'express';
import { db } from '../index';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getSubjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const snapshot = await db.collection('subjects').orderBy('order', 'asc').get();
    let subjects = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];

    // Fetch classes for reference
    const classSnapshot = await db.collection('classRooms').get();
    const classMap = new Map(classSnapshot.docs.map(d => [d.id, { id: d.id, ...d.data() }]));

    subjects = subjects.map(s => ({
      ...s,
      classRoom: s.classId ? classMap.get(s.classId) : null,
      _count: { scores: 0, examinationSubjects: 0 }
    }));

    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve subjects.' });
  }
}

export async function createSubject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, code, maxScore, order, classId } = req.body;
    if (!name || !code) {
      res.status(400).json({ error: 'Subject name and code are required.' });
      return;
    }

    const existing = await db.collection('subjects').where('code', '==', code.trim().toUpperCase()).get();
    if (!existing.empty) {
      res.status(400).json({ error: `Subject code "${code}" already exists.` });
      return;
    }

    const data = {
      name: name.trim(),
      code: code.trim().toUpperCase(),
      maxScore: Number(maxScore) || 100,
      order: Number(order) || 0,
      isCore: req.body.isCore === true || req.body.isCore === 'true',
      status: 'Active',
      classId: classId || null,
      createdAt: new Date().toISOString()
    };

    const docRef = await db.collection('subjects').add(data);
    const subject = { id: docRef.id, ...data };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'CREATE_SUBJECT',
      recordType: 'Subject',
      recordId: subject.id,
      newValue: `${subject.name} (${subject.code})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ subject, message: 'Subject created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create subject.' });
  }
}

export async function updateSubject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, code, maxScore, status, order, classId } = req.body;

    const existingDoc = await db.collection('subjects').doc(id).get();
    if (!existingDoc.exists) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }
    const existing = existingDoc.data() as any;

    const data = {
      name: name ? name.trim() : existing.name,
      code: code ? code.trim().toUpperCase() : existing.code,
      maxScore: maxScore !== undefined ? Number(maxScore) : existing.maxScore,
      status: status || existing.status,
      order: order !== undefined ? Number(order) : existing.order,
      isCore: req.body.isCore !== undefined ? (req.body.isCore === true || req.body.isCore === 'true') : existing.isCore,
      classId: classId !== undefined ? (classId === '' ? null : classId) : existing.classId,
      updatedAt: new Date().toISOString()
    };

    await db.collection('subjects').doc(id).update(data);
    const updated = { id, ...data };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_SUBJECT',
      recordType: 'Subject',
      recordId: updated.id,
      oldValue: `${existing.name} (${existing.code})`,
      newValue: `${updated.name} (${updated.code}) - ${updated.status}`,
      ipAddress: req.ip,
    });

    res.json({ subject: updated, message: 'Subject updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update subject.' });
  }
}

export async function deleteSubject(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const subjectDoc = await db.collection('subjects').doc(id).get();

    if (!subjectDoc.exists) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    // Historical safety check
    const scoresSnapshot = await db.collection('scores').where('subjectId', '==', id).limit(1).get();
    
    if (!scoresSnapshot.empty) {
      await db.collection('subjects').doc(id).update({ status: 'Inactive' });

      await logAudit({
        userId: req.user?.userId,
        userName: req.user?.name || 'Admin',
        action: 'DEACTIVATE_SUBJECT',
        recordType: 'Subject',
        recordId: id,
        newValue: 'Deactivated to preserve historical examination scores',
        ipAddress: req.ip,
      });

      res.json({
        message: 'Subject has historical examination scores and was deactivated to preserve historical results.',
        deactivated: true,
      });
      return;
    }

    await db.collection('subjects').doc(id).delete();

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'DELETE_SUBJECT',
      recordType: 'Subject',
      recordId: id,
      oldValue: `${subjectDoc.data()?.name} (${subjectDoc.data()?.code})`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Subject deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete subject.' });
  }
}
