import { prisma } from '../prisma';
import { calculateLongTermTrend, determineChangeStatus } from '../utils/grading';

export class AnalyticsService {
  /**
   * Overall dashboard KPIs and class trend
   */
  static async getOverviewKPIs(classFilter?: string, academicYear?: string) {
    const settings = await prisma.schoolSettings.findFirst() || {
      passThreshold: 50.0,
      stableThreshold: 1.0,
      academicYear: '2025/2026',
    };

    const year = academicYear || settings.academicYear;

    // Total active students
    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }
    const totalStudents = await prisma.student.count({ where: studentWhere });

    // Completed or active examinations
    const exams = await prisma.examination.findMany({
      where: { academicYear: year },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        scores: {
          where: {
            rawScore: { not: null },
            student: studentWhere,
          },
        },
      },
    });

    const completedMocksCount = exams.filter(e => e.status === 'Completed' || e.status === 'Locked').length;

    // Calculate class averages for each exam
    const examTrends = exams.map((exam) => {
      const validScores = exam.scores.filter(s => s.percentage !== null);
      const avg = validScores.length > 0
        ? Math.round((validScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / validScores.length) * 10) / 10
        : 0;

      const passedScores = validScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
      const passRate = validScores.length > 0
        ? Math.round((passedScores / validScores.length) * 100 * 10) / 10
        : 0;

      return {
        examId: exam.id,
        examName: exam.name,
        sequenceOrder: exam.sequenceOrder,
        status: exam.status,
        average: avg,
        passRate,
        scoreCount: validScores.length,
      };
    });

    // Comparison between latest two mocks
    let improvingCount = 0;
    let decliningCount = 0;
    let stableCount = 0;

    if (exams.length >= 2) {
      const latestExam = exams[exams.length - 1];
      const prevExam = exams[exams.length - 2];

      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          scores: {
            where: {
              examinationId: { in: [latestExam.id, prevExam.id] },
              percentage: { not: null },
            },
          },
        },
      });

      for (const st of students) {
        const sLatest = st.scores.filter(s => s.examinationId === latestExam.id);
        const sPrev = st.scores.filter(s => s.examinationId === prevExam.id);

        if (sLatest.length > 0 && sPrev.length > 0) {
          const avgLatest = sLatest.reduce((sum, s) => sum + (s.percentage || 0), 0) / sLatest.length;
          const avgPrev = sPrev.reduce((sum, s) => sum + (s.percentage || 0), 0) / sPrev.length;
          const diff = avgLatest - avgPrev;

          const status = determineChangeStatus(diff, settings.stableThreshold);
          if (status === 'Improving') improvingCount++;
          else if (status === 'Declining') decliningCount++;
          else stableCount++;
        }
      }
    }

    const latestAvg = examTrends.length > 0 ? examTrends[examTrends.length - 1].average : 0;
    const latestPassRate = examTrends.length > 0 ? examTrends[examTrends.length - 1].passRate : 0;

    return {
      totalStudents,
      completedMocksCount,
      totalMocksCount: exams.length,
      latestAverage: latestAvg,
      latestPassRate: latestPassRate,
      improvingCount,
      decliningCount,
      stableCount,
      examTrends,
    };
  }

  /**
   * Multi-series subject performance across all mock examinations
   */
  static async getSubjectPerformanceAcrossMocks(classFilter?: string, academicYear?: string) {
    const settings = await prisma.schoolSettings.findFirst();
    const year = academicYear || settings?.academicYear || '2025/2026';

    const exams = await prisma.examination.findMany({
      where: { academicYear: year },
      orderBy: { sequenceOrder: 'asc' },
    });

    const subjects = await prisma.subject.findMany({
      where: { status: 'Active' },
      orderBy: { order: 'asc' },
    });

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    // Build timeline matrix for chart
    const dataByMock = await Promise.all(
      exams.map(async (exam) => {
        const item: any = {
          examId: exam.id,
          mockName: exam.name,
          sequence: exam.sequenceOrder,
        };

        for (const sub of subjects) {
          const scores = await prisma.score.findMany({
            where: {
              examinationId: exam.id,
              subjectId: sub.id,
              percentage: { not: null },
              student: studentWhere,
            },
            select: { percentage: true },
          });

          if (scores.length > 0) {
            const avg = scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length;
            item[sub.name] = Math.round(avg * 10) / 10;
          } else {
            item[sub.name] = null;
          }
        }

        return item;
      })
    );

    // Subject summary health across mocks
    const subjectSummaries = await Promise.all(
      subjects.map(async (sub) => {
        const values: (number | null)[] = dataByMock.map(m => m[sub.name] ?? null);
        const validValues = values.filter((v): v is number => v !== null);

        const currentAvg = validValues.length > 0 ? validValues[validValues.length - 1] : null;
        const prevAvg = validValues.length > 1 ? validValues[validValues.length - 2] : null;
        const firstAvg = validValues.length > 0 ? validValues[0] : null;

        const prevChange = (currentAvg !== null && prevAvg !== null)
          ? Math.round((currentAvg - prevAvg) * 10) / 10
          : null;

        const overallChange = (currentAvg !== null && firstAvg !== null)
          ? Math.round((currentAvg - firstAvg) * 10) / 10
          : null;

        const longTermTrend = calculateLongTermTrend(values, settings?.stableThreshold || 1.0);

        return {
          id: sub.id,
          name: sub.name,
          code: sub.code,
          currentAverage: currentAvg,
          previousAverage: prevAvg,
          previousChange: prevChange,
          overallChange,
          longTermTrend,
        };
      })
    );

    return {
      subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })),
      trends: dataByMock,
      subjectSummaries,
    };
  }

  /**
   * Mock-to-mock comparison analysis
   */
  static async getMockToMockComparison(classFilter?: string, academicYear?: string) {
    const settings = await prisma.schoolSettings.findFirst();
    const threshold = settings?.stableThreshold || 1.0;
    const target = settings?.passThreshold || 75.0; // Assume target is pass threshold or fallback to 75
    const year = academicYear || settings?.academicYear || '2025/2026';

    const exams = await prisma.examination.findMany({
      where: { academicYear: year },
      orderBy: { sequenceOrder: 'asc' },
    });

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    const rows = [];
    let previousAvg: number | null = null;
    
    // For subject drivers
    const subjectAveragesList: Record<string, Record<string, number>> = {};
    const subjects = await prisma.subject.findMany({ where: { status: 'Active' }});

    for (const exam of exams) {
      const scores = await prisma.score.findMany({
        where: {
          examinationId: exam.id,
          percentage: { not: null },
          student: studentWhere,
        },
        select: { percentage: true, subjectId: true },
      });

      const avg = scores.length > 0
        ? Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length) * 10) / 10
        : null;

      let change: number | null = null;
      let status: 'Improving' | 'Declining' | 'Stable' | '—' = '—';

      if (avg !== null && previousAvg !== null) {
        change = Math.round((avg - previousAvg) * 10) / 10;
        status = determineChangeStatus(change, threshold);
      }

      // Calculate subject averages for this mock
      subjectAveragesList[exam.id] = {};
      for (const sub of subjects) {
        const subScores = scores.filter(s => s.subjectId === sub.id);
        if (subScores.length > 0) {
          subjectAveragesList[exam.id][sub.id] = subScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / subScores.length;
        }
      }

      rows.push({
        examId: exam.id,
        examName: exam.name,
        sequenceOrder: exam.sequenceOrder,
        average: avg,
        change,
        status,
        studentCount: scores.length > 0 ? (await prisma.student.count({
          where: {
            ...studentWhere,
            scores: { some: { examinationId: exam.id, percentage: { not: null } } },
          },
        })) : 0,
      });

      if (avg !== null) {
        previousAvg = avg;
      }
    }

    let topRisers: any[] = [];
    let topFallers: any[] = [];
    let subjectDrivers: any[] = [];
    let targetAnalysis: any = { target, latestAverage: 0, gap: 0, gapClosed: 0 };
    let gradeDistribution: any = { labels: [], datasets: [] };
    let deltaChartData: any[] = [];

    if (exams.length >= 2) {
      const latestExam = exams[exams.length - 1];
      const prevExam = exams[exams.length - 2];
      
      targetAnalysis.latestAverage = rows[rows.length - 1].average || 0;
      targetAnalysis.gap = Math.round((target - targetAnalysis.latestAverage) * 10) / 10;
      targetAnalysis.gapClosed = targetAnalysis.latestAverage > target ? 100 : Math.max(0, Math.round((targetAnalysis.latestAverage / target) * 100));

      // Calculate subject drivers
      const prevSubAvg = subjectAveragesList[prevExam.id] || {};
      const latestSubAvg = subjectAveragesList[latestExam.id] || {};
      
      for (const sub of subjects) {
        if (prevSubAvg[sub.id] !== undefined && latestSubAvg[sub.id] !== undefined) {
          const diff = latestSubAvg[sub.id] - prevSubAvg[sub.id];
          subjectDrivers.push({
            subjectName: sub.name,
            change: Math.round(diff * 10) / 10
          });
        }
      }
      subjectDrivers.sort((a, b) => b.change - a.change);

      // Calculate top risers and fallers
      const students = await prisma.student.findMany({
        where: studentWhere,
        include: {
          scores: {
            where: {
              examinationId: { in: [latestExam.id, prevExam.id] },
              percentage: { not: null },
            },
          },
        },
      });
      
      const studentChanges = [];
      for (const st of students) {
        const sLatest = st.scores.filter(s => s.examinationId === latestExam.id);
        const sPrev = st.scores.filter(s => s.examinationId === prevExam.id);
        if (sLatest.length > 0 && sPrev.length > 0) {
          const avgLatest = sLatest.reduce((sum, s) => sum + (s.percentage || 0), 0) / sLatest.length;
          const avgPrev = sPrev.reduce((sum, s) => sum + (s.percentage || 0), 0) / sPrev.length;
          const diff = avgLatest - avgPrev;
          studentChanges.push({
            studentId: st.id,
            studentName: st.fullName,
            prevAvg: Math.round(avgPrev * 10) / 10,
            latestAvg: Math.round(avgLatest * 10) / 10,
            change: Math.round(diff * 10) / 10
          });
        }
      }
      
      studentChanges.sort((a, b) => b.change - a.change);
      topRisers = studentChanges.slice(0, 5);
      topFallers = studentChanges.slice(-5).reverse();
      
      // Grade distribution for latest 2 mocks
      const latestGradeDist = await this.getGradeDistribution(latestExam.id, classFilter);
      const prevGradeDist = await this.getGradeDistribution(prevExam.id, classFilter);
      
      gradeDistribution = {
        labels: latestGradeDist.scoreBands.map(b => b.band),
        datasets: [
          {
            label: prevExam.name,
            data: prevGradeDist.scoreBands.map(b => b.count)
          },
          {
            label: latestExam.name,
            data: latestGradeDist.scoreBands.map(b => b.count)
          }
        ]
      };
    }

    deltaChartData = rows.filter(r => r.change !== null).map(r => ({
      name: r.examName,
      change: r.change
    }));

    return {
      tableData: rows,
      topRisers,
      topFallers,
      subjectDrivers,
      targetAnalysis,
      gradeDistribution,
      deltaChartData
    };
  }

  /**
   * Grade & Score Band distributions for an examination or mock comparisons
   */
  static async getGradeDistribution(examId?: string, classFilter?: string) {
    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    const gradeScales = await prisma.gradeScale.findMany({
      orderBy: { order: 'asc' },
    });

    const whereClause: any = {
      percentage: { not: null },
      student: studentWhere,
    };
    if (examId && examId !== 'all') {
      whereClause.examinationId = examId;
    }

    const scores = await prisma.score.findMany({
      where: whereClause,
      select: { grade: true, percentage: true, examinationId: true },
    });

    // Counts by grade
    const gradeMap: Record<string, number> = {};
    gradeScales.forEach(g => { gradeMap[g.grade] = 0; });

    // Score bands
    const scoreBands = [
      { band: '80–100%', min: 80, max: 100, count: 0, label: 'Excellent' },
      { band: '70–79%', min: 70, max: 79.99, count: 0, label: 'Very Good' },
      { band: '60–69%', min: 60, max: 69.99, count: 0, label: 'Good' },
      { band: '50–59%', min: 50, max: 59.99, count: 0, label: 'Satisfactory' },
      { band: '40–49%', min: 40, max: 49.99, count: 0, label: 'Needs Improvement' },
      { band: '0–39%', min: 0, max: 39.99, count: 0, label: 'Unsatisfactory' },
    ];

    scores.forEach(s => {
      if (s.grade && gradeMap[s.grade] !== undefined) {
        gradeMap[s.grade]++;
      }
      if (s.percentage !== null) {
        const band = scoreBands.find(b => s.percentage! >= b.min && s.percentage! <= b.max);
        if (band) band.count++;
      }
    });

    const gradeDistribution = gradeScales.map(g => ({
      grade: g.grade,
      remark: g.remark,
      count: gradeMap[g.grade] || 0,
      percentage: scores.length > 0 ? Math.round(((gradeMap[g.grade] || 0) / scores.length) * 1000) / 10 : 0,
    }));

    return {
      totalScores: scores.length,
      gradeDistribution,
      scoreBands,
    };
  }

  /**
   * Performance Heatmap (Students as rows, Subjects or Mocks as columns)
   */
  static async getPerformanceHeatmap(examId: string, classFilter?: string) {
    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      orderBy: { fullName: 'asc' },
      include: { classRoom: true },
    });

    const subjects = await prisma.subject.findMany({
      where: { status: 'Active' },
      orderBy: { order: 'asc' },
      select: { id: true, name: true, code: true },
    });

    const scores = await prisma.score.findMany({
      where: {
        examinationId: examId,
        student: studentWhere,
      },
      select: {
        studentId: true,
        subjectId: true,
        percentage: true,
        grade: true,
      },
    });

    const scoreLookup: Record<string, { percentage: number | null; grade: string | null }> = {};
    scores.forEach(s => {
      scoreLookup[`${s.studentId}_${s.subjectId}`] = {
        percentage: s.percentage,
        grade: s.grade,
      };
    });

    const rows = students.map(student => {
      const studentScores: Record<string, any> = {};
      let total = 0;
      let count = 0;

      subjects.forEach(sub => {
        const entry = scoreLookup[`${student.id}_${sub.id}`];
        studentScores[sub.id] = entry ? entry.percentage : null;
        if (entry && entry.percentage !== null) {
          total += entry.percentage;
          count++;
        }
      });

      const average = count > 0 ? Math.round((total / count) * 10) / 10 : null;

      return {
        studentId: student.id,
        indexNumber: student.indexNumber,
        fullName: student.fullName,
        class: student.classRoom?.name || '—',
        scores: studentScores,
        average,
      };
    });

    return {
      subjects,
      rows,
    };
  }

  /**
   * Individual Learner Full Analytics
   */
  static async getStudentAnalytics(studentId: string) {
    const settings = await prisma.schoolSettings.findFirst() || {
      passThreshold: 50.0,
      stableThreshold: 1.0,
    };

    const student = await prisma.student.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new Error('Student not found');
    }

    const exams = await prisma.examination.findMany({
      orderBy: { sequenceOrder: 'asc' },
    });

    const subjects = await prisma.subject.findMany({
      where: { status: 'Active' },
      orderBy: { order: 'asc' },
    });

    const allScores = await prisma.score.findMany({
      where: { studentId },
      include: {
        examination: true,
        subject: true,
      },
    });

    // Build timeline of overall mock averages for student
    const mockTimeline = exams.map(exam => {
      const examScores = allScores.filter(s => s.examinationId === exam.id && s.percentage !== null);
      const avg = examScores.length > 0
        ? Math.round((examScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / examScores.length) * 10) / 10
        : null;

      const passedCount = examScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;

      return {
        examId: exam.id,
        examName: exam.name,
        sequence: exam.sequenceOrder,
        average: avg,
        subjectsPassed: passedCount,
        subjectsAttempted: examScores.length,
      };
    });

    const validAverages = mockTimeline.map(m => m.average).filter((a): a is number => a !== null);
    const firstAvg = validAverages.length > 0 ? validAverages[0] : null;
    const latestAvg = validAverages.length > 0 ? validAverages[validAverages.length - 1] : null;
    const prevAvg = validAverages.length > 1 ? validAverages[validAverages.length - 2] : null;

    const previousMockChange = (latestAvg !== null && prevAvg !== null)
      ? Math.round((latestAvg - prevAvg) * 10) / 10
      : null;

    const overallChange = (latestAvg !== null && firstAvg !== null)
      ? Math.round((latestAvg - firstAvg) * 10) / 10
      : null;

    const longTermTrend = calculateLongTermTrend(mockTimeline.map(m => m.average), settings.stableThreshold);

    // Subject trends for this learner
    const subjectTrends = subjects.map(sub => {
      const subScores = exams.map(exam => {
        const sc = allScores.find(s => s.examinationId === exam.id && s.subjectId === sub.id);
        return {
          examId: exam.id,
          mockName: exam.name,
          score: sc?.rawScore ?? null,
          percentage: sc?.percentage ?? null,
          grade: sc?.grade ?? null,
          remark: sc?.remark ?? null,
        };
      });

      const validP = subScores.map(s => s.percentage).filter((p): p is number => p !== null);
      const subFirst = validP.length > 0 ? validP[0] : null;
      const subLatest = validP.length > 0 ? validP[validP.length - 1] : null;
      const subPrev = validP.length > 1 ? validP[validP.length - 2] : null;

      const subPrevChange = (subLatest !== null && subPrev !== null)
        ? Math.round((subLatest - subPrev) * 10) / 10
        : null;

      const subOverallChange = (subLatest !== null && subFirst !== null)
        ? Math.round((subLatest - subFirst) * 10) / 10
        : null;

      const subTrend = calculateLongTermTrend(subScores.map(s => s.percentage), settings.stableThreshold);

      return {
        subjectId: sub.id,
        subjectName: sub.name,
        subjectCode: sub.code,
        scores: subScores,
        latestPercentage: subLatest,
        previousChange: subPrevChange,
        overallChange: subOverallChange,
        trend: subTrend,
      };
    });

    // Best and weakest subjects
    const sortedSub = [...subjectTrends].filter(s => s.latestPercentage !== null)
      .sort((a, b) => (b.latestPercentage || 0) - (a.latestPercentage || 0));

    const bestSubject = sortedSub.length > 0 ? sortedSub[0] : null;
    const weakestSubject = sortedSub.length > 0 ? sortedSub[sortedSub.length - 1] : null;

    return {
      student,
      mockTimeline,
      previousMockChange,
      overallChange,
      longTermTrend,
      bestSubject,
      weakestSubject,
      subjectTrends,
    };
  }

  /**
   * Multi-student comparison
   */
  static async compareMultipleStudents(studentIds: string[]) {
    const students = await prisma.student.findMany({
      where: { id: { in: studentIds } },
    });

    const subjects = await prisma.subject.findMany({
      where: { status: 'Active' },
      orderBy: { order: 'asc' },
    });

    const exams = await prisma.examination.findMany({
      orderBy: { sequenceOrder: 'asc' },
    });

    const studentReports = await Promise.all(
      studentIds.map(async (id) => {
        return await this.getStudentAnalytics(id);
      })
    );

    // Subject by subject comparison across selected students
    const subjectComparison = subjects.map(sub => {
      const studentMap: Record<string, number | null> = {};
      studentReports.forEach(rep => {
        const match = rep.subjectTrends.find(s => s.subjectId === sub.id);
        studentMap[rep.student.fullName] = match ? match.latestPercentage : null;
      });

      return {
        subjectName: sub.name,
        subjectCode: sub.code,
        ...studentMap,
      };
    });

    return {
      students,
      studentReports,
      subjectComparison,
    };
  }

  /**
   * Weak Area Analysis & Configurable Academic Alerts
   */
  static async getWeakAreasAndAlerts(classFilter?: string) {
    const settings = await prisma.schoolSettings.findFirst() || {
      passThreshold: 50.0,
      stableThreshold: 1.0,
      consecutiveDeclineAlertCount: 3,
      consecutiveBelowTargetAlertCount: 3,
    };

    const target = settings.passThreshold;
    const declineAlertThreshold = settings.consecutiveDeclineAlertCount || 3;
    const belowTargetAlertThreshold = settings.consecutiveBelowTargetAlertCount || 3;

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    const exams = await prisma.examination.findMany({
      orderBy: { sequenceOrder: 'asc' },
    });

    const subjects = await prisma.subject.findMany({
      where: { status: 'Active' },
      orderBy: { order: 'asc' },
    });

    const latestExam = exams.length > 0 ? exams[exams.length - 1] : null;

    // 1. Subjects below target in latest mock
    const subjectsBelowTarget = [];
    if (latestExam) {
      for (const sub of subjects) {
        const scores = await prisma.score.findMany({
          where: {
            examinationId: latestExam.id,
            subjectId: sub.id,
            percentage: { not: null },
            student: studentWhere,
          },
          select: { percentage: true },
        });

        if (scores.length > 0) {
          const avg = Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length) * 10) / 10;
          if (avg < target) {
            subjectsBelowTarget.push({
              subjectId: sub.id,
              subjectName: sub.name,
              average: avg,
              deficit: Math.round((target - avg) * 10) / 10,
              target,
            });
          }
        }
      }
    }

    // 2. Learners declining for 2 or 3 consecutive mocks
    const students = await prisma.student.findMany({
      where: studentWhere,
      include: {
        scores: {
          where: { percentage: { not: null } },
          include: { examination: true, subject: true },
        },
      },
    });

    const alerts: {
      type: 'warning' | 'critical' | 'positive';
      title: string;
      description: string;
      studentId?: string;
      studentName?: string;
      subjectName?: string;
    }[] = [];

    for (const student of students) {
      // Calculate overall student mock average progression
      const averages = exams.map(exam => {
        const examScores = student.scores.filter(s => s.examinationId === exam.id && s.percentage !== null);
        return examScores.length > 0
          ? examScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / examScores.length
          : null;
      }).filter((v): v is number => v !== null);

      if (averages.length >= declineAlertThreshold) {
        // Check consecutive decline at the tail
        let consecutiveDeclines = 0;
        for (let i = averages.length - 1; i > 0; i--) {
          if (averages[i] < averages[i - 1] - settings.stableThreshold) {
            consecutiveDeclines++;
          } else {
            break;
          }
        }

        if (consecutiveDeclines >= declineAlertThreshold - 1) {
          alerts.push({
            type: 'critical',
            title: `Persistent Decline Detected`,
            description: `${student.fullName} has recorded declining overall mock performance across ${consecutiveDeclines + 1} consecutive mocks (latest: ${Math.round(averages[averages.length - 1])}%).`,
            studentId: student.id,
            studentName: student.fullName,
          });
        }
      }

      // Check persistent below-target in specific subjects
      for (const sub of subjects) {
        const subScores = exams.map(exam => {
          const sc = student.scores.find(s => s.examinationId === exam.id && s.subjectId === sub.id);
          return sc?.percentage ?? null;
        }).filter((v): v is number => v !== null);

        if (subScores.length >= belowTargetAlertThreshold) {
          const recentBelowTarget = subScores.slice(-belowTargetAlertThreshold).every(s => s < target);
          if (recentBelowTarget) {
            alerts.push({
              type: 'warning',
              title: `Persistent Deficit: ${sub.name}`,
              description: `${student.fullName} has remained below target (${target}%) in ${sub.name} across the last ${belowTargetAlertThreshold} consecutive mocks.`,
              studentId: student.id,
              studentName: student.fullName,
              subjectName: sub.name,
            });
          }
        }
      }
    }

    // Class level alert: significant improvement or decline between last 2 mocks
    if (exams.length >= 2) {
      const examA = exams[exams.length - 2];
      const examB = exams[exams.length - 1];

      const scoresA = await prisma.score.findMany({
        where: { examinationId: examA.id, percentage: { not: null }, student: studentWhere },
        select: { percentage: true },
      });
      const scoresB = await prisma.score.findMany({
        where: { examinationId: examB.id, percentage: { not: null }, student: studentWhere },
        select: { percentage: true },
      });

      if (scoresA.length > 0 && scoresB.length > 0) {
        const avgA = scoresA.reduce((sum, s) => sum + (s.percentage || 0), 0) / scoresA.length;
        const avgB = scoresB.reduce((sum, s) => sum + (s.percentage || 0), 0) / scoresB.length;
        const diff = Math.round((avgB - avgA) * 10) / 10;

        if (diff >= 5.0) {
          alerts.unshift({
            type: 'positive',
            title: 'Significant Class Growth',
            description: `Class average increased by +${diff}% from ${examA.name} to ${examB.name}.`,
          });
        } else if (diff <= -5.0) {
          alerts.unshift({
            type: 'critical',
            title: 'Class Average Drop',
            description: `Class average declined by ${diff}% from ${examA.name} to ${examB.name}.`,
          });
        }
      }
    }

    return {
      target,
      subjectsBelowTarget,
      alerts: alerts.slice(0, 20), // Top relevant alerts
    };
  }

  /**
   * Multi-mock comparison: compare any number of mock examinations side by side.
   * Returns per-mock KPIs, subject averages across all selected mocks,
   * grade distributions, top/bottom performers per mock, and delta vs baseline (first selected mock).
   */
  static async compareMultipleMocks(examIds: string[], classFilter?: string) {
    if (!examIds || examIds.length === 0) return { mocks: [], subjects: [], subjectMatrix: [], topStudents: [] };

    const settings = await prisma.schoolSettings.findFirst();
    const passThreshold = settings?.passThreshold ?? 50;
    const stableThreshold = settings?.stableThreshold ?? 1.0;

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = classFilter;
    }

    // Load all requested exams in sequence order
    const exams = await prisma.examination.findMany({
      where: { id: { in: examIds } },
      orderBy: { sequenceOrder: 'asc' },
      include: {
        examinationSubjects: { include: { subject: { select: { id: true, name: true, code: true } } } },
      },
    });

    // Build union of all subjects across selected exams
    const subjectMap = new Map<string, { id: string; name: string; code: string }>();
    for (const exam of exams) {
      for (const es of exam.examinationSubjects) {
        if (!subjectMap.has(es.subject.id)) {
          subjectMap.set(es.subject.id, es.subject);
        }
      }
    }
    const subjects = Array.from(subjectMap.values());

    // For each exam compute KPIs and subject averages
    const mockResults = await Promise.all(
      exams.map(async (exam) => {
        // All percentage scores for this exam (student-level, one per student-subject)
        const allScores = await prisma.score.findMany({
          where: {
            examinationId: exam.id,
            percentage: { not: null },
            student: studentWhere,
          },
          select: { studentId: true, subjectId: true, percentage: true, grade: true },
        });

        // Student averages
        const studentTotals: Record<string, { sum: number; count: number }> = {};
        for (const s of allScores) {
          if (!studentTotals[s.studentId]) studentTotals[s.studentId] = { sum: 0, count: 0 };
          studentTotals[s.studentId].sum += s.percentage ?? 0;
          studentTotals[s.studentId].count++;
        }
        const studentAvgList = Object.entries(studentTotals).map(([id, t]) => ({
          studentId: id,
          avg: Math.round((t.sum / t.count) * 100) / 100,
        }));

        const classAvg = studentAvgList.length > 0
          ? Math.round(studentAvgList.reduce((s, x) => s + x.avg, 0) / studentAvgList.length * 10) / 10
          : null;

        const passCount = studentAvgList.filter(s => s.avg >= passThreshold).length;
        const passRate = studentAvgList.length > 0
          ? Math.round(passCount / studentAvgList.length * 1000) / 10
          : null;

        const sorted = [...studentAvgList].sort((a, b) => b.avg - a.avg);
        const highestAvg = sorted.length > 0 ? sorted[0].avg : null;
        const lowestAvg = sorted.length > 0 ? sorted[sorted.length - 1].avg : null;

        // Grade distribution
        const gradeDistribution: Record<string, number> = {};
        for (const s of allScores) {
          if (s.grade) gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
        }

        // Subject averages for this exam
        const subjectAverages: Record<string, number | null> = {};
        for (const sub of subjects) {
          const subScores = allScores.filter(s => s.subjectId === sub.id);
          subjectAverages[sub.id] = subScores.length > 0
            ? Math.round(subScores.reduce((a, s) => a + (s.percentage ?? 0), 0) / subScores.length * 10) / 10
            : null;
        }

        return {
          examId: exam.id,
          examName: exam.name,
          sequenceOrder: exam.sequenceOrder,
          status: exam.status,
          studentCount: studentAvgList.length,
          classAverage: classAvg,
          passRate,
          highestAverage: highestAvg,
          lowestAverage: lowestAvg,
          gradeDistribution,
          subjectAverages,
          // Top 3 students for display
          topStudents: sorted.slice(0, 3),
        };
      })
    );

    // Delta vs baseline (first selected mock in sequence order)
    const baseline = mockResults[0];
    const mocksWithDelta = mockResults.map((m, idx) => ({
      ...m,
      deltaVsBaseline: idx === 0
        ? null
        : (m.classAverage !== null && baseline.classAverage !== null)
          ? Math.round((m.classAverage - baseline.classAverage) * 10) / 10
          : null,
      deltaVsPrevious: idx === 0
        ? null
        : (m.classAverage !== null && mockResults[idx - 1].classAverage !== null)
          ? Math.round((m.classAverage - mockResults[idx - 1].classAverage!) * 10) / 10
          : null,
      progressStatus: idx === 0
        ? 'Baseline'
        : (() => {
            const d = m.classAverage !== null && mockResults[idx - 1].classAverage !== null
              ? m.classAverage - mockResults[idx - 1].classAverage!
              : 0;
            if (d > stableThreshold) return 'Improving';
            if (d < -stableThreshold) return 'Declining';
            return 'Stable';
          })(),
    }));

    // Build subject matrix — rows = subjects, cols = each mock
    const subjectMatrix = subjects.map(sub => {
      const row: any = { subjectId: sub.id, subjectName: sub.name, subjectCode: sub.code };
      for (const m of mocksWithDelta) {
        row[m.examId] = m.subjectAverages[sub.id] ?? null;
      }
      // Net change first to last across selected mocks
      const values = mocksWithDelta.map(m => m.subjectAverages[sub.id] ?? null).filter((v): v is number => v !== null);
      row.netChange = values.length >= 2 ? Math.round((values[values.length - 1] - values[0]) * 10) / 10 : null;
      row.trend = calculateLongTermTrend(
        mocksWithDelta.map(m => m.subjectAverages[sub.id] ?? null),
        stableThreshold
      );
      return row;
    });

    // Chart-friendly time-series data (for line/bar charts)
    const chartSeries = mocksWithDelta.map(m => ({
      mockName: m.examName,
      examId: m.examId,
      sequence: m.sequenceOrder,
      average: m.classAverage,
      passRate: m.passRate,
    }));

    return {
      mocks: mocksWithDelta,
      subjects,
      subjectMatrix,
      chartSeries,
      baselineMockId: baseline.examId,
    };
  }
}

