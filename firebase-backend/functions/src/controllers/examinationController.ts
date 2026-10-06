import { Response } from 'express';
import { db } from '../index';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getExaminations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { academicYear } = req.query;
    
    let examsRef: FirebaseFirestore.Query = db.collection('examinations');
    if (academicYear) {
      examsRef = examsRef.where('academicYear', '==', String(academicYear));
    }

    const snapshot = await examsRef.orderBy('sequenceOrder', 'asc').get();
    const examinations = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    // Simulating nested relational includes
    for (let exam of examinations) {
      const examSubjectsSnapshot = await db.collection(`examinations/${exam.id}/examinationSubjects`).get();
      const examSubjects = examSubjectsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const populatedSubjects = [];
      for (const es of examSubjects) {
        const subDoc = await db.collection('subjects').doc((es as any).subjectId as string).get();
        if (subDoc.exists) {
          populatedSubjects.push({ ...es, subject: { id: subDoc.id, ...subDoc.data() } });
        }
      }
      (exam as any).examinationSubjects = populatedSubjects;
      (exam as any)._count = { scores: 0 }; // Simplified
    }

    res.json({ examinations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve examinations.' });
  }
}

export async function getExaminationById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const examDoc = await db.collection('examinations').doc(id).get();

    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const examination = { id: examDoc.id, ...examDoc.data() } as any;

    // Fetch examinationSubjects subcollection with subject details
    const esSnap = await db.collection('examinations').doc(id).collection('examinationSubjects').get();
    const examinationSubjects = await Promise.all(esSnap.docs.map(async es => {
      const esData = es.data();
      const subDoc = await db.collection('subjects').doc(esData.subjectId).get();
      return { id: es.id, ...esData, subject: subDoc.exists ? { id: subDoc.id, ...subDoc.data() } : null };
    }));
    examination.examinationSubjects = examinationSubjects;

    // Count of scores
    const scoresCount = await db.collection('scores').where('examinationId', '==', id).get();
    examination._count = { scores: scoresCount.size };

    res.json({ examination });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve examination details.' });
  }
}

export async function createExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { name, academicYear, description, sequenceOrder, startDate, endDate, subjectIds } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Examination name is required.' });
      return;
    }

    const settingsDoc = await db.collection('schoolSettings').doc('default-settings').get();
    const settings = settingsDoc.data();
    const year = academicYear || settings?.academicYear || '2025/2026';

    // Auto-calculate sequence order if not specified
    let seq = Number(sequenceOrder);
    if (!seq || isNaN(seq)) {
      const highestSnapshot = await db.collection('examinations')
        .where('academicYear', '==', year)
        .orderBy('sequenceOrder', 'desc')
        .limit(1)
        .get();
      
      const highest = highestSnapshot.docs[0]?.data();
      seq = (highest?.sequenceOrder || 0) + 1;
    }

    // Default to active subjects if no specific subject IDs given
    let assignedSubjectIds = subjectIds;
    if (!assignedSubjectIds || assignedSubjectIds.length === 0) {
      const activeSubjectsSnapshot = await db.collection('subjects')
        .where('status', '==', 'Active')
        .get();
      assignedSubjectIds = activeSubjectsSnapshot.docs.map(doc => doc.id);
    }

    const examData = {
      name: name.trim(),
      academicYear: year,
      description: description?.trim() || null,
      sequenceOrder: seq,
      startDate: startDate ? new Date(startDate).toISOString() : null,
      endDate: endDate ? new Date(endDate).toISOString() : null,
      status: 'Active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const batch = db.batch();
    const examRef = db.collection('examinations').doc();
    batch.set(examRef, examData);

    // Create examinationSubjects inside a subcollection
    for (const subId of assignedSubjectIds) {
      const examSubjectRef = db.collection(`examinations/${examRef.id}/examinationSubjects`).doc();
      batch.set(examSubjectRef, {
        subjectId: subId,
        maxScore: 100
      });
    }

    await batch.commit();
    const examination = { id: examRef.id, ...examData };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'CREATE_EXAMINATION',
      recordType: 'Examination',
      recordId: examination.id,
      newValue: `${examination.name} (Seq: ${examination.sequenceOrder}) with ${assignedSubjectIds.length} subjects`,
      ipAddress: req.ip,
    });

    res.status(201).json({ examination, message: 'Examination created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create examination.' });
  }
}

export async function updateExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { name, academicYear, description, sequenceOrder, startDate, endDate, status, subjectIds } = req.body;

    const existingDoc = await db.collection('examinations').doc(id).get();
    if (!existingDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const existing = existingDoc.data() as any;

    if (existing.status === 'Locked' && status !== 'Active') {
      res.status(403).json({ error: 'This examination is locked. Unlock it before making modifications.' });
      return;
    }

    const updatedData: any = {
      name: name ? name.trim() : existing.name,
      academicYear: academicYear || existing.academicYear,
      description: description !== undefined ? description : existing.description,
      sequenceOrder: sequenceOrder !== undefined ? Number(sequenceOrder) : existing.sequenceOrder,
      startDate: startDate ? new Date(startDate).toISOString() : existing.startDate,
      endDate: endDate ? new Date(endDate).toISOString() : existing.endDate,
      status: status || existing.status,
      updatedAt: new Date().toISOString(),
    };

    const batch = db.batch();
    batch.update(db.collection('examinations').doc(id), updatedData);

    if (Array.isArray(subjectIds) && subjectIds.length > 0) {
      // Delete existing examinationSubjects
      const existingEsSnap = await db.collection('examinations').doc(id).collection('examinationSubjects').get();
      existingEsSnap.docs.forEach(d => batch.delete(d.ref));
      // Re-create
      for (const subId of subjectIds) {
        const newEsRef = db.collection('examinations').doc(id).collection('examinationSubjects').doc();
        batch.set(newEsRef, { subjectId: subId, maxScore: 100 });
      }
    }

    await batch.commit();
    const updated = { id, ...existing, ...updatedData };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: JSON.stringify({ name: updated.name, status: updated.status }),
      ipAddress: req.ip,
    });

    res.json({ examination: updated, message: 'Examination updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update examination.' });
  }
}

export async function lockExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const examDoc = await db.collection('examinations').doc(id).get();

    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = examDoc.data() as any;

    const lockData = {
      status: 'Locked',
      lockedAt: new Date().toISOString(),
      lockedBy: req.user?.name || 'Admin',
      updatedAt: new Date().toISOString(),
    };
    await db.collection('examinations').doc(id).update(lockData);
    const updated = { id, ...exam, ...lockData };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'LOCK_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Locked by ${req.user?.name}. Scores are now read-only.`,
      ipAddress: req.ip,
    });

    res.json({ examination: updated, message: `${updated.name} has been locked. Score modifications are disabled.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lock examination.' });
  }
}

export async function unlockExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const examDoc = await db.collection('examinations').doc(id).get();
    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = examDoc.data() as any;

    const unlockData = { status: 'Active', lockedAt: null, lockedBy: null, updatedAt: new Date().toISOString() };
    await db.collection('examinations').doc(id).update(unlockData);
    const updated = { id, ...exam, ...unlockData };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UNLOCK_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Unlocked by ${req.user?.name}. Reason: ${reason || 'Administrative review'}`,
      ipAddress: req.ip,
    });

    res.json({ examination: updated, message: `${updated.name} has been unlocked with authorization.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unlock examination.' });
  }
}

export async function completeExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const examDoc = await db.collection('examinations').doc(id).get();

    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = examDoc.data() as any;

    if (exam.status === 'Locked') {
      res.status(403).json({ error: 'Examination is already locked. Unlock first to modify.' });
      return;
    }

    const completedData = { status: 'Completed', updatedAt: new Date().toISOString() };
    await db.collection('examinations').doc(id).update(completedData);
    const updated = { id, ...exam, ...completedData };

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'COMPLETE_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Marked as Completed by ${req.user?.name}. All score entries finalised.`,
      ipAddress: req.ip,
    });

    res.json({ examination: updated, message: `${updated.name} has been marked as Completed. All results are now finalised.` });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete examination.' });
  }
}

export async function getExamSnapshot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const examDoc = await db.collection('examinations').doc(id).get();
    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = { id: examDoc.id, ...examDoc.data() } as any;

    // Fetch examinationSubjects
    const esSnap = await db.collection('examinations').doc(id).collection('examinationSubjects').get();
    const examinationSubjects = esSnap.docs.map(d => d.data());
    exam.examinationSubjects = examinationSubjects;

    // Get all scores for this exam
    const scoresSnap = await db.collection('scores').where('examinationId', '==', id).get();
    const scores = scoresSnap.docs.map(d => d.data()).filter((s: any) => s.percentage != null) as any[];

    if (scores.length === 0) {
      res.json({
        examId: id,
        examName: exam.name,
        status: exam.status,
        studentCount: 0,
        average: null,
        passRate: null,
        highestAverage: null,
        lowestAverage: null,
        gradeDistribution: {},
      });
      return;
    }

    // Aggregate by student
    const studentTotals: Record<string, { sum: number; count: number }> = {};
    for (const s of scores) {
      if (!studentTotals[s.studentId]) studentTotals[s.studentId] = { sum: 0, count: 0 };
      studentTotals[s.studentId].sum += s.percentage ?? 0;
      studentTotals[s.studentId].count++;
    }

    const studentAverages = Object.values(studentTotals).map(
      (t) => Math.round((t.sum / t.count) * 100) / 100
    );
    const settingsSnap = await db.collection('schoolSettings').limit(1).get();
    const settingsData: any = settingsSnap.empty ? {} : settingsSnap.docs[0].data();
    const passThreshold = settingsData.passThreshold ?? 50;

    const overallAvg = studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length;
    const passCount = studentAverages.filter((a) => a >= passThreshold).length;

    // Grade distribution
    const gradeDistribution: Record<string, number> = {};
    for (const s of scores) {
      if (s.grade) {
        gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
      }
    }

    res.json({
      examId: id,
      examName: exam.name,
      status: exam.status,
      sequenceOrder: exam.sequenceOrder,
      subjectCount: exam.examinationSubjects.length,
      studentCount: studentAverages.length,
      average: Math.round(overallAvg * 100) / 100,
      passRate: Math.round((passCount / studentAverages.length) * 100 * 10) / 10,
      highestAverage: Math.max(...studentAverages),
      lowestAverage: Math.min(...studentAverages),
      gradeDistribution,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to retrieve exam snapshot.' });
  }
}

export async function deleteExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const examDoc = await db.collection('examinations').doc(id).get();

    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = examDoc.data() as any;

    await db.collection('examinations').doc(id).delete();

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'DELETE_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Deleted examination: ${exam.name}`,
      ipAddress: req.ip,
    });

    res.json({ message: 'Examination deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete examination.' });
  }
}
