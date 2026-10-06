import { Response } from 'express';
import { db } from '../index';
import { AuthRequest } from '../middleware/auth';

export async function getAuditLogs(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { action, recordType, limit = 100 } = req.query;

    let query: FirebaseFirestore.Query = db.collection('auditLogs');

    if (action) query = query.where('action', '==', String(action));
    if (recordType) query = query.where('recordType', '==', String(recordType));

    query = query.orderBy('createdAt', 'desc').limit(Number(limit) || 100);

    const snapshot = await query.get();
    const logs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve audit logs.' });
  }
}
