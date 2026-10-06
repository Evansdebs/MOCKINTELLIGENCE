"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudentResult = getStudentResult;
exports.getClassResults = getClassResults;
const index_1 = require("../index");
const grading_1 = require("../utils/grading");
/**
 * Get individual student result slip for a specific examination
 */
async function getStudentResult(req, res) {
    var _a, _b, _c;
    try {
        const studentId = req.params.studentId;
        const examinationId = req.params.examinationId;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'STUDENT' && req.user.userId !== studentId) {
            res.status(403).json({ error: 'You can only view your own result.' });
            return;
        }
        // Fetch settings
        const settingsSnapshot = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnapshot.empty ? {
            schoolName: 'Achimota Basic Model School',
            passThreshold: 50.0,
            enableRanking: true,
        } : Object.assign({ id: settingsSnapshot.docs[0].id }, settingsSnapshot.docs[0].data());
        const gradeScalesSnapshot = await index_1.db.collection('gradeScales').orderBy('minScore', 'desc').get();
        const gradeScales = gradeScalesSnapshot.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        // Fetch student
        const studentDoc = await index_1.db.collection('students').doc(studentId).get();
        if (!studentDoc.exists) {
            res.status(404).json({ error: 'Student not found.' });
            return;
        }
        const student = Object.assign({ id: studentDoc.id }, studentDoc.data());
        // Fetch classroom
        if (student.classId) {
            const classDoc = await index_1.db.collection('classRooms').doc(student.classId).get();
            student.classRoom = classDoc.exists ? Object.assign({ id: classDoc.id }, classDoc.data()) : null;
        }
        // Fetch examination + subjects
        const examDoc = await index_1.db.collection('examinations').doc(examinationId).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = Object.assign({ id: examDoc.id }, examDoc.data());
        const esSnapshot = await index_1.db.collection('examinations').doc(examinationId)
            .collection('examinationSubjects').get();
        const subjectMap = new Map();
        for (const esDoc of esSnapshot.docs) {
            const esData = esDoc.data();
            const subDoc = await index_1.db.collection('subjects').doc(esData.subjectId).get();
            if (subDoc.exists) {
                const sub = Object.assign({ id: subDoc.id }, subDoc.data());
                subjectMap.set(esData.subjectId, sub);
            }
        }
        exam.examinationSubjects = esSnapshot.docs.map(d => (Object.assign(Object.assign({ id: d.id }, d.data()), { subject: subjectMap.get(d.data().subjectId) })));
        // Fetch scores
        const scoresSnapshot = await index_1.db.collection('scores')
            .where('studentId', '==', studentId)
            .where('examinationId', '==', examinationId)
            .get();
        const scores = scoresSnapshot.docs.map(d => (Object.assign(Object.assign({ id: d.id }, d.data()), { subject: subjectMap.get(d.data().subjectId) })));
        // Sort by subject order
        scores.sort((a, b) => { var _a, _b; return (((_a = a.subject) === null || _a === void 0 ? void 0 : _a.order) || 0) - (((_b = b.subject) === null || _b === void 0 ? void 0 : _b.order) || 0); });
        const validScores = scores.filter(s => s.percentage !== null && s.percentage !== undefined);
        const totalScore = validScores.reduce((sum, s) => sum + (s.rawScore || 0), 0);
        const average = validScores.length > 0
            ? Math.round((validScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / validScores.length) * 10) / 10
            : null;
        const passedCount = validScores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
        const failedCount = validScores.length - passedCount;
        const sortedByPercentage = [...validScores].sort((a, b) => (b.percentage || 0) - (a.percentage || 0));
        const bestSubject = sortedByPercentage.length > 0 ? (_b = sortedByPercentage[0].subject) === null || _b === void 0 ? void 0 : _b.name : null;
        const weakestSubject = sortedByPercentage.length > 0 ? (_c = sortedByPercentage[sortedByPercentage.length - 1].subject) === null || _c === void 0 ? void 0 : _c.name : null;
        const aggregate = (0, grading_1.calculateAggregate)(validScores.map(s => { var _a; return ({ gradePoint: s.gradePoint, isCore: (_a = s.subject) === null || _a === void 0 ? void 0 : _a.isCore }); }));
        // Calculate class position
        let position = null;
        if (settings.enableRanking && average !== null && student.classId) {
            const classStudentsSnap = await index_1.db.collection('students')
                .where('classId', '==', student.classId)
                .where('status', '==', 'Active')
                .get();
            const classStudentIds = classStudentsSnap.docs.map(d => d.id);
            const classScoresSnap = await index_1.db.collection('scores')
                .where('examinationId', '==', examinationId)
                .get();
            const classScores = classScoresSnap.docs
                .map(d => d.data())
                .filter(s => classStudentIds.includes(s.studentId) && s.percentage != null);
            const studentAvgs = {};
            classScores.forEach(s => {
                if (!studentAvgs[s.studentId])
                    studentAvgs[s.studentId] = { total: 0, count: 0 };
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate result slip: ' + err.message });
    }
}
/**
 * Get class master results table for an examination
 */
async function getClassResults(req, res) {
    try {
        const examinationId = req.params.examinationId;
        const { classId: classFilter } = req.query;
        // Fetch settings
        const settingsSnapshot = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnapshot.empty ? {
            passThreshold: 50.0,
            enableRanking: true,
        } : Object.assign({ id: settingsSnapshot.docs[0].id }, settingsSnapshot.docs[0].data());
        const gradeScalesSnapshot = await index_1.db.collection('gradeScales').orderBy('minScore', 'desc').get();
        const gradeScales = gradeScalesSnapshot.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        // Fetch examination
        const examDoc = await index_1.db.collection('examinations').doc(examinationId).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = Object.assign({ id: examDoc.id }, examDoc.data());
        // Fetch examination subjects
        const esSnapshot = await index_1.db.collection('examinations').doc(examinationId)
            .collection('examinationSubjects').orderBy('order', 'asc').get();
        const subjectMap = new Map();
        for (const esDoc of esSnapshot.docs) {
            const esData = esDoc.data();
            const subDoc = await index_1.db.collection('subjects').doc(esData.subjectId).get();
            if (subDoc.exists) {
                const sub = Object.assign({ id: subDoc.id }, subDoc.data());
                subjectMap.set(esData.subjectId, sub);
            }
        }
        const subjects = esSnapshot.docs
            .map(d => subjectMap.get(d.data().subjectId))
            .filter(Boolean);
        exam.examinationSubjects = esSnapshot.docs.map(d => (Object.assign(Object.assign({ id: d.id }, d.data()), { subject: subjectMap.get(d.data().subjectId) })));
        // Fetch students
        let studentsQuery = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all') {
            studentsQuery = studentsQuery.where('classId', '==', String(classFilter));
        }
        const studentsSnapshot = await studentsQuery.get();
        let students = studentsSnapshot.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        // Attach classRoom data
        const classRoomCache = new Map();
        for (const st of students) {
            if (st.classId && !classRoomCache.has(st.classId)) {
                const classDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                if (classDoc.exists)
                    classRoomCache.set(st.classId, Object.assign({ id: classDoc.id }, classDoc.data()));
            }
            st.classRoom = classRoomCache.get(st.classId) || null;
        }
        students.sort((a, b) => {
            var _a, _b;
            const cn = (((_a = a.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '').localeCompare(((_b = b.classRoom) === null || _b === void 0 ? void 0 : _b.name) || '');
            return cn !== 0 ? cn : a.fullName.localeCompare(b.fullName);
        });
        // Fetch all scores for this exam
        const scoresSnapshot = await index_1.db.collection('scores')
            .where('examinationId', '==', examinationId)
            .get();
        const allScores = scoresSnapshot.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const studentIds = new Set(students.map(s => s.id));
        const filteredScores = allScores.filter(s => studentIds.has(s.studentId));
        const scoreMap = {};
        filteredScores.forEach(s => {
            scoreMap[`${s.studentId}_${s.subjectId}`] = Object.assign(Object.assign({}, s), { subject: subjectMap.get(s.subjectId) });
        });
        const studentRows = students.map(st => {
            let totalRaw = 0;
            let totalPercentage = 0;
            let count = 0;
            let passedCount = 0;
            const subjectResults = {};
            subjects.forEach(sub => {
                const sc = scoreMap[`${st.id}_${sub.id}`];
                if (sc && sc.percentage != null) {
                    subjectResults[sub.id] = sc;
                    totalRaw += sc.rawScore || 0;
                    totalPercentage += sc.percentage || 0;
                    count++;
                    if (sc.percentage >= settings.passThreshold)
                        passedCount++;
                }
                else {
                    subjectResults[sub.id] = null;
                }
            });
            const average = count > 0 ? Math.round((totalPercentage / count) * 10) / 10 : null;
            const aggregateScores = Object.values(subjectResults).filter(Boolean).map((sc) => {
                var _a;
                return ({
                    gradePoint: sc.gradePoint,
                    isCore: (_a = sc.subject) === null || _a === void 0 ? void 0 : _a.isCore,
                });
            });
            const aggregate = (0, grading_1.calculateAggregate)(aggregateScores);
            const overallGradeObj = average !== null ? (0, grading_1.calculateGradeForScore)(average, 100, gradeScales) : null;
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
                if (a.aggregate === b.aggregate)
                    return (b.average || 0) - (a.average || 0);
                return (a.aggregate || 99) - (b.aggregate || 99);
            });
            studentRows.forEach(r => {
                if (r.aggregate !== null) {
                    const rank = sortedByAggregate.findIndex(s => s.student.id === r.student.id) + 1;
                    r.rank = rank;
                }
                else {
                    r.rank = null;
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate class results: ' + err.message });
    }
}
//# sourceMappingURL=resultsController.js.map