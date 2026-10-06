import { Response } from 'express';
import { db } from '../index';
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

    // Fetch settings
    const settingsSnapshot = await db.collection('schoolSettings').limit(1).get();
    const settings = settingsSnapshot.empty ? {
      schoolName: 'Achimota Basic Model School',
      passThreshold: 50.0,
      enableRanking: true,
    } : { id: settingsSnapshot.docs[0].id, ...settingsSnapshot.docs[0].data() } as any;

    const gradeScalesSnapshot = await db.collection('gradeScales').orderBy('minScore', 'desc').get();
    const gradeScales = gradeScalesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Fetch student
    const studentDoc = await db.collection('students').doc(studentId).get();
    if (!studentDoc.exists) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }
    const student = { id: studentDoc.id, ...studentDoc.data() } as any;

    // Fetch classroom
    if (student.classId) {
      const classDoc = await db.collection('classRooms').doc(student.classId).get();
      student.classRoom = classDoc.exists ? { id: classDoc.id, ...classDoc.data() } : null;
    }

    // Fetch examination + subjects
    const examDoc = await db.collection('examinations').doc(examinationId).get();
    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = { id: examDoc.id, ...examDoc.data() } as any;

    const esSnapshot = await db.collection('examinations').doc(examinationId)
      .collection('examinationSubjects').get();

    const subjectMap = new Map<string, any>();
    for (const esDoc of esSnapshot.docs) {
      const esData = esDoc.data();
      const subDoc = await db.collection('subjects').doc(esData.subjectId).get();
      if (subDoc.exists) {
        const sub = { id: subDoc.id, ...subDoc.data() };
        subjectMap.set(esData.subjectId, sub);
      }
    }

    exam.examinationSubjects = esSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      subject: subjectMap.get(d.data().subjectId),
    }));

    // Fetch scores
    const scoresSnapshot = await db.collection('scores')
      .where('studentId', '==', studentId)
      .where('examinationId', '==', examinationId)
      .get();

    const scores = scoresSnapshot.docs.map(d => ({
      id: d.id,
      ...d.data(),
      subject: subjectMap.get((d.data() as any).subjectId),
    })) as any[];

    // Sort by subject order
    scores.sort((a, b) => (a.subject?.order || 0) - (b.subject?.order || 0));

    const validScores = scores.filter(s => s.percentage !== null && s.percentage !== undefined);
    const totalScore = validScores.reduce((sum, s) => sum + (s.rawScore || 0), 0);
    const average = validScores.length > 0
      ? Math.round((validScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / validScores.length) * 10) / 10
      : null;

    const passedCount = validScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
    const failedCount = validScores.length - passedCount;

    const sortedByPercentage = [...validScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
    const bestSubject = sortedByPercentage.length > 0 ? sortedByPercentage[0].subject?.name : null;
    const weakestSubject = sortedByPercentage.length > 0 ? sortedByPercentage[sortedByPercentage.length - 1].subject?.name : null;

    const aggregate = calculateAggregate(
      validScores.map(s => ({ gradePoint: s.gradePoint, isCore: s.subject?.isCore }))
    );

    // Calculate class position
    let position: string | null = null;
    if (settings.enableRanking && average !== null && student.classId) {
      const classStudentsSnap = await db.collection('students')
        .where('classId', '==', student.classId)
        .where('status', '==', 'Active')
        .get();
      const classStudentIds = classStudentsSnap.docs.map(d => d.id);

      const classScoresSnap = await db.collection('scores')
        .where('examinationId', '==', examinationId)
        .get();

      const classScores = classScoresSnap.docs
        .map(d => d.data() as any)
        .filter(s => classStudentIds.includes(s.studentId) && s.percentage != null);

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

    // Fetch settings
    const settingsSnapshot = await db.collection('schoolSettings').limit(1).get();
    const settings = settingsSnapshot.empty ? {
      passThreshold: 50.0,
      enableRanking: true,
    } : { id: settingsSnapshot.docs[0].id, ...settingsSnapshot.docs[0].data() } as any;

    const gradeScalesSnapshot = await db.collection('gradeScales').orderBy('minScore', 'desc').get();
    const gradeScales = gradeScalesSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Fetch examination
    const examDoc = await db.collection('examinations').doc(examinationId).get();
    if (!examDoc.exists) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }
    const exam = { id: examDoc.id, ...examDoc.data() } as any;

    // Fetch examination subjects
    const esSnapshot = await db.collection('examinations').doc(examinationId)
      .collection('examinationSubjects').orderBy('order', 'asc').get();

    const subjectMap = new Map<string, any>();
    for (const esDoc of esSnapshot.docs) {
      const esData = esDoc.data();
      const subDoc = await db.collection('subjects').doc(esData.subjectId).get();
      if (subDoc.exists) {
        const sub = { id: subDoc.id, ...subDoc.data() };
        subjectMap.set(esData.subjectId, sub);
      }
    }

    const subjects = esSnapshot.docs
      .map(d => subjectMap.get(d.data().subjectId))
      .filter(Boolean) as any[];

    exam.examinationSubjects = esSnapshot.docs.map(d => ({
      id: d.id, ...d.data(), subject: subjectMap.get(d.data().subjectId),
    }));

    // Fetch students
    let studentsQuery: FirebaseFirestore.Query = db.collection('students').where('status', '==', 'Active');
    if (classFilter && classFilter !== 'all') {
      studentsQuery = studentsQuery.where('classId', '==', String(classFilter));
    }
    const studentsSnapshot = await studentsQuery.get();
    let students = studentsSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    // Attach classRoom data
    const classRoomCache = new Map<string, any>();
    for (const st of students) {
      if (st.classId && !classRoomCache.has(st.classId)) {
        const classDoc = await db.collection('classRooms').doc(st.classId).get();
        if (classDoc.exists) classRoomCache.set(st.classId, { id: classDoc.id, ...classDoc.data() });
      }
      st.classRoom = classRoomCache.get(st.classId) || null;
    }

    students.sort((a, b) => {
      const cn = (a.classRoom?.name || '').localeCompare(b.classRoom?.name || '');
      return cn !== 0 ? cn : a.fullName.localeCompare(b.fullName);
    });

    // Fetch all scores for this exam
    const scoresSnapshot = await db.collection('scores')
      .where('examinationId', '==', examinationId)
      .get();

    const allScores = scoresSnapshot.docs.map(d => ({ id: d.id, ...d.data() })) as any[];
    const studentIds = new Set(students.map(s => s.id));
    const filteredScores = allScores.filter(s => studentIds.has(s.studentId));

    const scoreMap: Record<string, any> = {};
    filteredScores.forEach(s => {
      scoreMap[`${s.studentId}_${s.subjectId}`] = { ...s, subject: subjectMap.get(s.subjectId) };
    });

    const studentRows = students.map(st => {
      let totalRaw = 0;
      let totalPercentage = 0;
      let count = 0;
      let passedCount = 0;
      const subjectResults: Record<string, any> = {};

      subjects.forEach(sub => {
        const sc = scoreMap[`${st.id}_${sub.id}`];
        if (sc && sc.percentage != null) {
          subjectResults[sub.id] = sc;
          totalRaw += sc.rawScore || 0;
          totalPercentage += sc.percentage || 0;
          count++;
          if (sc.percentage >= settings.passThreshold) passedCount++;
        } else {
          subjectResults[sub.id] = null;
        }
      });

      const average = count > 0 ? Math.round((totalPercentage / count) * 10) / 10 : null;
      const aggregateScores = Object.values(subjectResults).filter(Boolean).map((sc: any) => ({
        gradePoint: sc.gradePoint,
        isCore: sc.subject?.isCore,
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
          if (a.aggregate === b.aggregate) return (b.average || 0) - (a.average || 0);
          return (a.aggregate || 99) - (b.aggregate || 99);
        });

      studentRows.forEach(r => {
        if (r.aggregate !== null) {
          const rank = sortedByAggregate.findIndex(s => s.student.id === r.student.id) + 1;
          (r as any).rank = rank;
        } else {
          (r as any).rank = null;
        }
      });
    }

    // Subject averages
    const subjectAverages = subjects.map(sub => {
      const subScores = filteredScores.filter(s => s.subjectId === sub.id && s.percentage != null);
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
