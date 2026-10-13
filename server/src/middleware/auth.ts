import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../prisma';
import { Role, UserTokenPayload } from '../types';
import { getSupabaseAdmin } from '../services/supabaseAdmin';
import { isLegacyAuthAllowed } from '../config/authConfig';

export interface AuthRequest extends Request {
  user?: UserTokenPayload;
}

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mock-intelligence-jwt-key-2026-ghana';

interface CachedAuth {
  user: UserTokenPayload;
  expiresAt: number;
}
const tokenAuthCache = new Map<string, CachedAuth>();
const AUTH_CACHE_TTL = 90 * 1000; // 90 seconds fast memory cache

export function clearTokenAuthCache(token?: string) {
  if (token) {
    tokenAuthCache.delete(token);
  } else {
    tokenAuthCache.clear();
  }
}

/**
 * Authentication Middleware:
 * 1. Checks in-memory session cache for instant sub-millisecond response.
 * 2. Checks Supabase Auth signature and claims via supabaseAdmin.auth.getUser(token).
 * 3. Checks internal JWT verification for students and legacy staff.
 */
export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Access denied. No authentication token provided.' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Fast-path: In-memory session cache hit
  const cached = tokenAuthCache.get(token);
  if (cached && cached.expiresAt > Date.now()) {
    req.user = cached.user;
    next();
    return;
  }

  // =========================================================================
  // Track 1: Try Supabase Auth Token verification
  // =========================================================================
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: authData, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (!authError && authData?.user) {
      const authUser = authData.user;
      // Resolve staff record from public."User" by authUserId
      const dbUser = await prisma.user.findFirst({
        where: { authUserId: authUser.id },
      });

      if (!dbUser) {
        res.status(403).json({
          error: 'Authenticated Supabase account is not linked to any active staff profile in this system.',
        });
        return;
      }

      if (dbUser.status !== 'Active') {
        res.status(403).json({ error: 'User account is deactivated. Please contact an administrator.' });
        return;
      }

      // Enforce valid staff role from database
      const validRoles: Role[] = ['ADMIN', 'TEACHER', 'MANAGEMENT'];
      if (!validRoles.includes(dbUser.role as Role)) {
        res.status(403).json({ error: 'Invalid user role configuration in database.' });
        return;
      }

      // Authoritative payload using database record
      req.user = {
        userId: dbUser.id,
        username: dbUser.username,
        name: dbUser.name,
        email: dbUser.email,
        role: dbUser.role as Role,
      };

      tokenAuthCache.set(token, { user: req.user, expiresAt: Date.now() + AUTH_CACHE_TTL });
      next();
      return;
    }
  } catch (err) {
    // If Supabase check errors out or fails, proceed to internal token checks
  }

  // =========================================================================
  // Track 2: Internal JWT Verification (Students and Legacy Staff)
  // =========================================================================
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;

    // Student sessions are indefinite and separate from staff sunset
    if (decoded.role === 'STUDENT') {
      const student = await prisma.student.findUnique({
        where: { id: decoded.userId },
      });

      if (!student || student.status !== 'Active') {
        res.status(401).json({ error: 'Student account is invalid or inactive.' });
        return;
      }

      req.user = {
        userId: student.id,
        username: student.indexNumber,
        name: student.fullName,
        email: '',
        role: 'STUDENT',
      };
      tokenAuthCache.set(token, { user: req.user, expiresAt: Date.now() + AUTH_CACHE_TTL });
      next();
      return;
    }

    // Legacy Staff JWT check (strictly conditional on sunset date)
    if (!isLegacyAuthAllowed()) {
      res.status(401).json({
        error: 'Legacy staff session tokens have expired permanently. Please log in using Supabase Auth.',
      });
      return;
    }

    // Resolve legacy staff user from database; do NOT trust token claims for role
    const legacyUser = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!legacyUser) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }

    if (legacyUser.status !== 'Active') {
      res.status(403).json({ error: 'User account is deactivated.' });
      return;
    }

    const validRoles: Role[] = ['ADMIN', 'TEACHER', 'MANAGEMENT'];
    if (!validRoles.includes(legacyUser.role as Role)) {
      res.status(403).json({ error: 'Invalid user role.' });
      return;
    }

    // Set role strictly from database row
    req.user = {
      userId: legacyUser.id,
      username: legacyUser.username,
      name: legacyUser.name,
      email: legacyUser.email,
      role: legacyUser.role as Role,
    };

    tokenAuthCache.set(token, { user: req.user, expiresAt: Date.now() + AUTH_CACHE_TTL });
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
