import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getSubjects(req: AuthRequest, res: Response): Promise<void> {
  try {
    const subjects = await prisma.subject.findMany({
      orderBy: { order: 'asc' },
      include: {
        _count: {
          select: { scores: true, examinationSubjects: true },
        },
        classRoom: true,
      },
    });

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

    const existing = await prisma.subject.findUnique({
      where: { code: code.trim().toUpperCase() },
    });

    if (existing) {
      res.status(400).json({ error: `Subject code "${code}" already exists.` });
      return;
    }

    const subject = await prisma.subject.create({
      data: {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        maxScore: Number(maxScore) || 100,
        order: Number(order) || 0,
        status: 'Active',
        classId: classId || null,
      },
    });

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
    const { id } = req.params;
    const { name, code, maxScore, status, order, classId } = req.body;

    const existing = await prisma.subject.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    const updated = await prisma.subject.update({
      where: { id },
      data: {
        name: name ? name.trim() : existing.name,
        code: code ? code.trim().toUpperCase() : existing.code,
        maxScore: maxScore !== undefined ? Number(maxScore) : existing.maxScore,
        status: status || existing.status,
        order: order !== undefined ? Number(order) : existing.order,
        classId: classId !== undefined ? (classId === '' ? null : classId) : existing.classId,
      },
    });

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
    const { id } = req.params;
    const subject = await prisma.subject.findUnique({
      where: { id },
      include: { _count: { select: { scores: true } } },
    });

    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    if (subject._count.scores > 0) {
      // Historical safety: deactivate instead of breaking previous mock records
      await prisma.subject.update({
        where: { id },
        data: { status: 'Inactive' },
      });

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

    await prisma.subject.delete({ where: { id } });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'DELETE_SUBJECT',
      recordType: 'Subject',
      recordId: id,
      oldValue: subject.name,
      ipAddress: req.ip,
    });

    res.json({ message: 'Subject permanently deleted.', deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete subject.' });
  }
}
