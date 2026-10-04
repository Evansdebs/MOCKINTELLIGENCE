import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getExaminations(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { academicYear } = req.query;
    const where: any = {};
    if (academicYear) {
      where.academicYear = String(academicYear);
    }

    const examinations = await prisma.examination.findMany({
      where,
      orderBy: { sequenceOrder: 'asc' },
      include: {
        examinationSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: { scores: true },
        },
      },
    });

    res.json({ examinations });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve examinations.' });
  }
}

export async function getExaminationById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const examination = await prisma.examination.findUnique({
      where: { id },
      include: {
        examinationSubjects: {
          include: {
            subject: true,
          },
        },
        _count: {
          select: { scores: true },
        },
      },
    });

    if (!examination) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

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

    const settings = await prisma.schoolSettings.findFirst();
    const year = academicYear || settings?.academicYear || '2025/2026';

    // Auto-calculate sequence order if not specified
    let seq = Number(sequenceOrder);
    if (!seq || isNaN(seq)) {
      const highest = await prisma.examination.findFirst({
        where: { academicYear: year },
        orderBy: { sequenceOrder: 'desc' },
      });
      seq = (highest?.sequenceOrder || 0) + 1;
    }

    // Default to active subjects if no specific subject IDs given
    let assignedSubjectIds = subjectIds;
    if (!assignedSubjectIds || assignedSubjectIds.length === 0) {
      const activeSubjects = await prisma.subject.findMany({
        where: { status: 'Active' },
        select: { id: true },
      });
      assignedSubjectIds = activeSubjects.map(s => s.id);
    }

    const examination = await prisma.examination.create({
      data: {
        name: name.trim(),
        academicYear: year,
        description: description?.trim() || null,
        sequenceOrder: seq,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'Active',
        examinationSubjects: {
          create: assignedSubjectIds.map((subId: string) => ({
            subjectId: subId,
            maxScore: 100,
          })),
        },
      },
      include: {
        examinationSubjects: {
          include: { subject: true },
        },
      },
    });

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

    const existing = await prisma.examination.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    if (existing.status === 'Locked' && status !== 'Active') {
      res.status(403).json({ error: 'This examination is locked. Unlock it before making modifications.' });
      return;
    }

    const updated = await prisma.$transaction(async (tx) => {
      const exam = await tx.examination.update({
        where: { id },
        data: {
          name: name ? name.trim() : existing.name,
          academicYear: academicYear || existing.academicYear,
          description: description !== undefined ? description : existing.description,
          sequenceOrder: sequenceOrder !== undefined ? Number(sequenceOrder) : existing.sequenceOrder,
          startDate: startDate ? new Date(startDate) : existing.startDate,
          endDate: endDate ? new Date(endDate) : existing.endDate,
          status: status || existing.status,
        },
      });

      if (Array.isArray(subjectIds) && subjectIds.length > 0) {
        // Sync examination subjects
        await tx.examinationSubject.deleteMany({ where: { examinationId: id } });
        await tx.examinationSubject.createMany({
          data: subjectIds.map((subId: string) => ({
            examinationId: id,
            subjectId: subId,
            maxScore: 100,
          })),
        });
      }

      return exam;
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_EXAMINATION',
      recordType: 'Examination',
      recordId: updated.id,
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
    const exam = await prisma.examination.findUnique({ where: { id } });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const updated = await prisma.examination.update({
      where: { id },
      data: {
        status: 'Locked',
        lockedAt: new Date(),
        lockedBy: req.user?.name || 'Admin',
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'LOCK_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Locked by ${req.user?.name}. Scores are now read-only.`,
      ipAddress: req.ip,
    });

    res.json({
      examination: updated,
      message: `${updated.name} has been locked. Score modifications are disabled.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to lock examination.' });
  }
}

export async function unlockExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const { reason } = req.body;

    const exam = await prisma.examination.findUnique({ where: { id } });
    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const updated = await prisma.examination.update({
      where: { id },
      data: {
        status: 'Active',
        lockedAt: null,
        lockedBy: null,
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UNLOCK_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Unlocked by ${req.user?.name}. Reason: ${reason || 'Administrative review'}`,
      ipAddress: req.ip,
    });

    res.json({
      examination: updated,
      message: `${updated.name} has been unlocked with authorization.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to unlock examination.' });
  }
}

export async function completeExamination(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;
    const exam = await prisma.examination.findUnique({ where: { id } });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    if (exam.status === 'Locked') {
      res.status(403).json({ error: 'Examination is already locked. Unlock first to modify.' });
      return;
    }

    const updated = await prisma.examination.update({
      where: { id },
      data: {
        status: 'Completed',
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'COMPLETE_EXAMINATION',
      recordType: 'Examination',
      recordId: id,
      newValue: `Marked as Completed by ${req.user?.name}. All score entries finalised.`,
      ipAddress: req.ip,
    });

    res.json({
      examination: updated,
      message: `${updated.name} has been marked as Completed. All results are now finalised.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to complete examination.' });
  }
}

export async function getExamSnapshot(req: AuthRequest, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    const exam = await prisma.examination.findUnique({
      where: { id },
      include: {
        examinationSubjects: { include: { subject: true } },
        _count: { select: { scores: true } },
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    // Get all scores for this exam
    const scores = await prisma.score.findMany({
      where: { examinationId: id, percentage: { not: null } },
      select: { studentId: true, percentage: true, grade: true },
    });

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
    const settings = await prisma.schoolSettings.findFirst();
    const passThreshold = settings?.passThreshold ?? 50;

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
    const exam = await prisma.examination.findUnique({ where: { id } });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    await prisma.examination.delete({ where: { id } });

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
