import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest } from '../middleware/auth';

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, recordType, limit = 100 } = req.query;

    const where: any = {};
    if (action) where.action = String(action);
    if (recordType) where.recordType = String(recordType);

    const logs = await prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Number(limit) || 100,
    });

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}
