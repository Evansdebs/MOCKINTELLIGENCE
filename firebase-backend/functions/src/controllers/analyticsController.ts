import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import { AnalyticsService } from '../services/analyticsService';

export async function getOverview(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const data = await AnalyticsService.getOverviewKPIs(
      classFilter ? String(classFilter) : undefined,
      academicYear ? String(academicYear) : undefined
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate overview: ' + err.message });
  }
}

export async function getSubjectTrends(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const data = await AnalyticsService.getSubjectPerformanceAcrossMocks(
      classFilter ? String(classFilter) : undefined,
      academicYear ? String(academicYear) : undefined
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate subject trends: ' + err.message });
  }
}

export async function getMockComparison(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter, academicYear } = req.query;
    const data = await AnalyticsService.getMockToMockComparison(
      classFilter ? String(classFilter) : undefined,
      academicYear ? String(academicYear) : undefined
    );
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to calculate mock comparison: ' + err.message });
  }
}

export async function getGradeDistribution(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, class: classFilter } = req.query;
    const data = await AnalyticsService.getGradeDistribution(
      examinationId ? String(examinationId) : undefined,
      classFilter ? String(classFilter) : undefined
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
    const data = await AnalyticsService.getPerformanceHeatmap(
      String(examinationId),
      classFilter ? String(classFilter) : undefined
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

    const data = await AnalyticsService.getStudentAnalytics(studentId);
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
    const data = await AnalyticsService.compareMultipleStudents(studentIds);
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to compare students: ' + err.message });
  }
}

export async function getWeakAreasAndAlerts(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { class: classFilter } = req.query;
    const data = await AnalyticsService.getWeakAreasAndAlerts(
      classFilter ? String(classFilter) : undefined
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
