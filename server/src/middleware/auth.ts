import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { Role, UserTokenPayload } from '../types';

export interface AuthRequest extends Request {
  user?: UserTokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mock-intelligence-jwt-key-2026-ghana';

export function authenticate(req: AuthRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserTokenPayload;
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired session token.' });
  }
}

export function authorize(allowedRoles: Role[]) {
  return (req: AuthRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        error: `Unauthorized. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
      });
      return;
    }

    next();
  };
}

export async function logAudit(params: {
  userId?: string;
  userName: string;
  action: string;
  recordType: string;
  recordId?: string;
  oldValue?: string;
  newValue?: string;
  ipAddress?: string;
}) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId,
        userName: params.userName,
        action: params.action,
        recordType: params.recordType,
        recordId: params.recordId,
        oldValue: params.oldValue,
        newValue: params.newValue,
        ipAddress: params.ipAddress || '127.0.0.1',
      },
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
