// @ts-nocheck
import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}
const analyticsCache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 60 * 1000; // 60 seconds

export function clearAnalyticsCache() {
  analyticsCache.clear();
}

async function getOrCompute<T>(key: string, computeFn: () => Promise<T>): Promise<T> {
  const cached = analyticsCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }
  const result = await computeFn();
  analyticsCache.set(key, { data: result, expiresAt: Date.now() + CACHE_TTL_MS });
  return result;
}

export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const key = `overview:${classFilter || 'all'}:${academicYear || 'default'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getOverviewKPIs(
        classFilter ? String(classFilter) : undefined,
        academicYear ? String(academicYear) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate overview: ' + err.message });
  }
}

export async function getSubjectTrends(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const key = `subjectTrends:${classFilter || 'all'}:${academicYear || 'default'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getSubjectPerformanceAcrossMocks(
        classFilter ? String(classFilter) : undefined,
        academicYear ? String(academicYear) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate subject trends: ' + err.message });
  }
}

export async function getMockComparison(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const key = `mockComparison:${classFilter || 'all'}:${academicYear || 'default'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getMockToMockComparison(
        classFilter ? String(classFilter) : undefined,
        academicYear ? String(academicYear) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate mock comparison: ' + err.message });
  }
}

export async function getGradeDistribution(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, class: classFilter } = req.query;
    const key = `gradeDist:${examinationId || 'all'}:${classFilter || 'all'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getGradeDistribution(
        examinationId ? String(examinationId) : undefined,
        classFilter ? String(classFilter) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate grade distribution: ' + err.message });
  }
}

export async function getHeatmap(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, class: classFilter } = req.query;
    if (!examinationId) {
      res.status(400).json({ error: 'examinationId is required for performance heatmap.' });
      return;
    }
    const key = `heatmap:${examinationId}:${classFilter || 'all'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getPerformanceHeatmap(
        String(examinationId),
        classFilter ? String(classFilter) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate heatmap: ' + err.message });
  }
}

export async function getStudentAnalytics(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.params.studentId as string;
    
    if (req.user?.role === 'STUDENT' && req.user.userId !== studentId) {
      res.status(403).json({ error: 'You can only view your own analytics.' });
      return;
    }

    const key = `studentAnalytics:${studentId}`;
    const data = await getOrCompute(key, () => AnalyticsService.getStudentAnalytics(studentId));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate student analytics: ' + err.message });
  }
}

export async function compareStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { studentIds } = req.body;
    if (!Array.isArray(studentIds) || studentIds.length === 0) {
      res.status(400).json({ error: 'studentIds array is required.' });
      return;
    }
    const key = `compareStudents:${[...studentIds].sort().join(',')}`;
    const data = await getOrCompute(key, () => AnalyticsService.compareMultipleStudents(studentIds));
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compare students: ' + err.message });
  }
}

export async function getWeakAreasAndAlerts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter } = req.query;
    const key = `weakAreas:${classFilter || 'all'}`;
    const data = await getOrCompute(key, () =>
      AnalyticsService.getWeakAreasAndAlerts(
        classFilter ? String(classFilter) : undefined
      )
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate weak areas and alerts: ' + err.message });
  }
}

export async function compareMultipleMocks(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examIds, class: classFilter } = req.body;
    if (!Array.isArray(examIds) || examIds.length === 0) {
      res.status(400).json({ error: 'examIds array is required and must contain at least one examination ID.' });
      return;
    }
    if (examIds.length > 20) {
      res.status(400).json({ error: 'Cannot compare more than 20 mock examinations at once.' });
      return;
    }
    const data = await AnalyticsService.compareMultipleMocks(
      examIds.map(String),
      classFilter ? String(classFilter) : undefined
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compare mock examinations: ' + err.message });
  }
}

export async function getTeacherDashboard(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { academicYear } = req.query;
    if (!req.user || req.user.role !== 'TEACHER') {
      res.status(403).json({ error: 'Only teachers can access the teacher dashboard.' });
      return;
    }
    const data = await AnalyticsService.getTeacherAnalytics(
      req.user.userId,
      academicYear ? String(academicYear) : undefined
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch teacher analytics: ' + err.message });
  }
}
