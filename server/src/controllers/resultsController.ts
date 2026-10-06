// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../prisma';
import { calculateAggregate, calculateGradeForScore } from '../utils/grading';
import { AuthRequest } from '../middleware/auth';

/**
 * Get individual student result slip for a specific examination
 */
export async function getStudentResult(req: AuthRequest, res: Response): Promise<void> {
  try {
    const studentId = req.params.studentId as string;
    const examinationId = req.params.examinationId as string;

    if (req.user?.role === 'STUDENT' && req.user.userId !== studentId) {
      res.status(403).json({ error: 'You can only view your own result.' });
      return;
    }

    const settings = await prisma.schoolSettings.findFirst() || {
      schoolName: 'Achimota Basic Model School',
      passThreshold: 50.0,
      enableRanking: true,
    };
    
    const gradeScales = await prisma.gradeScale.findMany({ orderBy: { minScore: 'desc' } });

    const student = await prisma.student.findUnique({ where: { id: studentId }, include: { classRoom: true } });
    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const exam = await prisma.examination.findUnique({
      where: { id: examinationId },
      include: {
        examinationSubjects: {
          include: { subject: true },
        },
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const scores = await prisma.score.findMany({
      where: { studentId, examinationId },
      include: { subject: true },
      orderBy: { subject: { order: 'asc' } },
    });

    const validScores = scores.filter(s => s.percentage !== null);
    const totalScore = validScores.reduce((sum, s) => sum + (s.rawScore || 0), 0);
    const average = validScores.length > 0
      ? Math.round((validScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / validScores.length) * 10) / 10
      : null;

    const passedCount = validScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
    const failedCount = validScores.length - passedCount;

    const sortedByPercentage = [...validScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    const bestSubject = sortedByPercentage.length > 0 ? sortedByPercentage[0].subject.name : null;
    const weakestSubject = sortedByPercentage.length > 0 ? sortedByPercentage[sortedByPercentage.length - 1].subject.name : null;

    const aggregate = calculateAggregate(
      validScores.map(s => ({ gradePoint: s.gradePoint, isCore: s.subject.isCore }))
    );

    // Optional Class Position / Ranking
    let position: string | null = null;
    if (settings.enableRanking && average !== null) {
      // Calculate averages for all active students in the same class for this exam
      const classStudents = await prisma.student.findMany({
        where: { classId: student.classId, status: 'Active' },
        select: { id: true },
      });

      const classScores = await prisma.score.findMany({
        where: {
          examinationId,
          studentId: { in: classStudents.map(s => s.id) },
          percentage: { not: null },
        },
        select: { studentId: true, percentage: true },
      });

      const studentAvgs: Record<string, { total: number; count: number }> = {};
      classScores.forEach(s => {
        if (!studentAvgs[s.studentId]) studentAvgs[s.studentId] = { total: 0, count: 0 };
        studentAvgs[s.studentId].total += s.percentage || 0;
        studentAvgs[s.studentId].count++;
      });

      const sortedRanking = Object.entries(studentAvgs)
        .map(([id, data]) => ({ id, avg: data.total / data.count }))
        .sort((a, b) => b.avg - a.avg);

      const rankIdx = sortedRanking.findIndex(r => r.id === student.id);
      if (rankIdx !== -1) {
        const rank = rankIdx + 1;
        const totalRanked = sortedRanking.length;
        const suffix = rank === 1 ? 'st' : rank === 2 ? 'nd' : rank === 3 ? 'rd' : 'th';
        position = `${rank}${suffix} of ${totalRanked}`;
      }
    }

    res.json({
      school: settings,
      student,
      examination: exam,
      scores,
      summary: {
        totalScore,
        average,
        aggregate,
        subjectsAttempted: validScores.length,
        subjectsPassed: passedCount,
        subjectsFailed: failedCount,
        bestSubject,
        weakestSubject,
        position,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate result slip: ' + err.message });
  }
}

/**
 * Get class master results table for an examination
 */
export async function getClassResults(req: AuthRequest, res: Response): Promise<void> {
  try {
    const examinationId = req.params.examinationId as string;
    const { classId: classFilter } = req.query;

    const settings = await prisma.schoolSettings.findFirst() || {
      passThreshold: 50.0,
      enableRanking: true,
    };
    const gradeScales = await prisma.gradeScale.findMany({ orderBy: { minScore: 'desc' } });

    const exam = await prisma.examination.findUnique({
      where: { id: examinationId },
      include: {
        examinationSubjects: {
          include: { subject: true },
          orderBy: { subject: { order: 'asc' } },
        },
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = String(classFilter);
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { classRoom: true },
      orderBy: [{ classRoom: { name: 'asc' } }, { fullName: 'asc' }],
    });

    const scores = await prisma.score.findMany({
      where: {
        examinationId,
        student: studentWhere,
      },
      include: { subject: true },
    });

    const scoreMap: Record<string, any> = {};
    scores.forEach(s => {
      scoreMap[`${s.studentId}_${s.subjectId}`] = s;
    });

    const subjects = exam.examinationSubjects.map(es => es.subject);

    const studentRows = students.map(st => {
      let totalRaw = 0;
      let totalPercentage = 0;
      let count = 0;
      let passedCount = 0;

      const subjectResults: Record<string, any> = {};

      subjects.forEach(sub => {
        const sc = scoreMap[`${st.id}_${sub.id}`];
        if (sc && sc.percentage !== null) {
          subjectResults[sub.id] = sc;
          totalRaw += sc.rawScore || 0;
          totalPercentage += sc.percentage || 0;
          count++;
          if (sc.percentage >= settings.passThreshold) {
            passedCount++;
          }
        } else {
          subjectResults[sub.id] = null;
        }
      });

      const average = count > 0 ? Math.round((totalPercentage / count) * 10) / 10 : null;
      
      const aggregateScores = Object.values(subjectResults).filter(Boolean).map((sc: any) => ({
        gradePoint: sc.gradePoint,
        isCore: sc.subject.isCore,
      }));
      const aggregate = calculateAggregate(aggregateScores);
      
      const overallGradeObj = average !== null ? calculateGradeForScore(average, 100, gradeScales) : null;

      return {
        student: st,
        subjectResults,
        totalRaw: Math.round(totalRaw * 10) / 10,
        average,
        overallGrade: overallGradeObj ? overallGradeObj.grade : null,
        aggregate,
        attempted: count,
        passedCount,
        failedCount: count - passedCount,
      };
    });

    // Calculate rank
    if (settings.enableRanking) {
      const sortedByAggregate = [...studentRows]
        .filter(r => r.aggregate !== null)
        .sort((a, b) => {
          if (a.aggregate === b.aggregate) {
            return (b.average || 0) - (a.average || 0);
          }
          return (a.aggregate || 99) - (b.aggregate || 99);
        });

      studentRows.forEach(r => {
        if (r.aggregate !== null) {
          const rank = sortedByAggregate.findIndex(s => s.student.id === r.student.id) + 1;
          (r as any).rank = rank;
        } else {
          (r as any).rank = null; // Maybe they missed some core subjects
        }
      });
    }

    // Class overall subject averages
    const subjectAverages = subjects.map(sub => {
      const subScores = scores.filter(s => s.subjectId === sub.id && s.percentage !== null);
      const avg = subScores.length > 0
        ? Math.round((subScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / subScores.length) * 10) / 10
        : null;
      const passCount = subScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
      const passRate = subScores.length > 0
        ? Math.round((passCount / subScores.length) * 100 * 10) / 10
        : null;

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        average: avg,
        passRate,
        totalStudents: subScores.length,
      };
    });

    res.json({
      school: settings,
      examination: exam,
      subjects,
      studentRows,
      subjectAverages,
      totalStudents: students.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to generate class results: ' + err.message });
  }
}
