"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const index_1 = require("../index");
const grading_1 = require("../utils/grading");
class AnalyticsService {
    /**
     * Overall dashboard KPIs and class trend
     */
    static async getOverviewKPIs(classFilter, academicYear) {
        const settingsDoc = await index_1.db.collection('schoolSettings').doc('default-settings').get();
        const settings = settingsDoc.data() || {
            passThreshold: 50.0,
            stableThreshold: 1.0,
            academicYear: '2025/2026',
        };
        const year = academicYear || settings.academicYear;
        // Total active students
        let studentRef = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all') {
            studentRef = studentRef.where('classId', '==', classFilter);
        }
        const studentsSnapshot = await studentRef.get();
        const totalStudents = studentsSnapshot.size;
        const students = studentsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Completed or active examinations
        const examsSnapshot = await index_1.db.collection('examinations')
            .where('academicYear', '==', year)
            .orderBy('sequenceOrder', 'asc')
            .get();
        const exams = examsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Fetch scores manually to emulate JOIN
        const scoresSnapshot = await index_1.db.collection('scores').get();
        const allScores = scoresSnapshot.docs.map(doc => doc.data());
        const studentIds = new Set(students.map(s => s.id));
        const relevantScores = allScores.filter(s => studentIds.has(s.studentId) && s.rawScore !== null);
        // Map scores to exams
        exams.forEach(exam => {
            exam.scores = relevantScores.filter(s => s.examinationId === exam.id);
        });
        const completedMocksCount = exams.filter(e => e.status === 'Completed' || e.status === 'Locked').length;
        // Calculate class averages for each exam
        const examTrends = exams.map((exam) => {
            const validScores = exam.scores.filter((s) => s.percentage !== null && s.percentage !== undefined);
            const avg = validScores.length > 0
                ? Math.round((validScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / validScores.length) * 10) / 10
                : 0;
            const passedScores = validScores.filter((s) => (s.percentage || 0) >= settings.passThreshold).length;
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
            for (const st of students) {
                const sLatest = relevantScores.filter(s => s.studentId === st.id && s.examinationId === latestExam.id);
                const sPrev = relevantScores.filter(s => s.studentId === st.id && s.examinationId === prevExam.id);
                if (sLatest.length > 0 && sPrev.length > 0) {
                    const avgLatest = sLatest.reduce((sum, s) => sum + (s.percentage || 0), 0) / sLatest.length;
                    const avgPrev = sPrev.reduce((sum, s) => sum + (s.percentage || 0), 0) / sPrev.length;
                    const diff = avgLatest - avgPrev;
                    const status = (0, grading_1.determineChangeStatus)(diff, settings.stableThreshold);
                    if (status === 'Improving')
                        improvingCount++;
                    else if (status === 'Declining')
                        decliningCount++;
                    else
                        stableCount++;
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
    static async getSubjectPerformanceAcrossMocks(classFilter, academicYear) {
        const settingsSnap = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnap.empty ? { passThreshold: 50, stableThreshold: 1.0, academicYear: '2025/2026' } : settingsSnap.docs[0].data();
        const year = academicYear || settings.academicYear;
        const examsSnap = await index_1.db.collection('examinations').where('academicYear', '==', year).orderBy('sequenceOrder', 'asc').get();
        const exams = examsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const subjectsSnap = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const subjects = subjectsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        // Fetch all scores once
        let studentsQuery = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQuery = studentsQuery.where('classId', '==', classFilter);
        const studentsSnap = await studentsQuery.get();
        const studentIds = new Set(studentsSnap.docs.map(d => d.id));
        const allScoresSnap = await index_1.db.collection('scores').get();
        const allScores = allScoresSnap.docs.map(d => d.data());
        const relevantScores = allScores.filter(s => studentIds.has(s.studentId) && s.percentage != null);
        const dataByMock = exams.map(exam => {
            const item = { examId: exam.id, mockName: exam.name, sequence: exam.sequenceOrder };
            for (const sub of subjects) {
                const scores = relevantScores.filter(s => s.examinationId === exam.id && s.subjectId === sub.id);
                item[sub.name] = scores.length > 0
                    ? Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length) * 10) / 10
                    : null;
            }
            return item;
        });
        const subjectSummaries = subjects.map(sub => {
            const values = dataByMock.map(m => { var _a; return (_a = m[sub.name]) !== null && _a !== void 0 ? _a : null; });
            const validValues = values.filter((v) => v !== null);
            const currentAvg = validValues.length > 0 ? validValues[validValues.length - 1] : null;
            const prevAvg = validValues.length > 1 ? validValues[validValues.length - 2] : null;
            const firstAvg = validValues.length > 0 ? validValues[0] : null;
            const prevChange = (currentAvg !== null && prevAvg !== null) ? Math.round((currentAvg - prevAvg) * 10) / 10 : null;
            const overallChange = (currentAvg !== null && firstAvg !== null) ? Math.round((currentAvg - firstAvg) * 10) / 10 : null;
            const longTermTrend = (0, grading_1.calculateLongTermTrend)(values, settings.stableThreshold || 1.0);
            return { id: sub.id, name: sub.name, code: sub.code, currentAverage: currentAvg, previousAverage: prevAvg, previousChange: prevChange, overallChange, longTermTrend };
        });
        return { subjects: subjects.map(s => ({ id: s.id, name: s.name, code: s.code })), trends: dataByMock, subjectSummaries };
    }
    /**
     * Mock-to-mock comparison analysis
     */
    static async getMockToMockComparison(classFilter, academicYear) {
        const settingsSnap = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnap.empty ? { passThreshold: 50, stableThreshold: 1.0, academicYear: '2025/2026' } : settingsSnap.docs[0].data();
        const threshold = (settings === null || settings === void 0 ? void 0 : settings.stableThreshold) || 1.0;
        const target = (settings === null || settings === void 0 ? void 0 : settings.passThreshold) || 75.0; // Assume target is pass threshold or fallback to 75
        const year = academicYear || (settings === null || settings === void 0 ? void 0 : settings.academicYear) || '2025/2026';
        const examsSnap = await index_1.db.collection('examinations').where('academicYear', '==', year).orderBy('sequenceOrder', 'asc').get();
        const exams = examsSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        let studentsQuery2 = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQuery2 = studentsQuery2.where('classId', '==', classFilter);
        const studentsSnap2 = await studentsQuery2.get();
        const studentIds2 = new Set(studentsSnap2.docs.map(d => d.id));
        const allScoresSnap2 = await index_1.db.collection('scores').get();
        const allScores2 = allScoresSnap2.docs.map(d => d.data());
        const filteredScores2 = allScores2.filter(s => studentIds2.has(s.studentId) && s.percentage != null);
        const rows = [];
        let previousAvg = null;
        const subjectAveragesList = {};
        const subjectsSnap2 = await index_1.db.collection('subjects').where('status', '==', 'Active').get();
        const subjects2 = subjectsSnap2.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const subjects = subjects2;
        for (const exam of exams) {
            const scores = filteredScores2.filter(s => s.examinationId === exam.id);
            const avg = scores.length > 0
                ? Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length) * 10) / 10
                : null;
            let change = null;
            let status = '—';
            if (avg !== null && previousAvg !== null) {
                change = Math.round((avg - previousAvg) * 10) / 10;
                status = (0, grading_1.determineChangeStatus)(change, threshold);
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
                studentCount: new Set(scores.map((s) => s.studentId)).size,
            });
            if (avg !== null) {
                previousAvg = avg;
            }
        }
        let topRisers = [];
        let topFallers = [];
        let subjectDrivers = [];
        let targetAnalysis = { target, latestAverage: 0, gap: 0, gapClosed: 0 };
        let gradeDistribution = { labels: [], datasets: [] };
        let deltaChartData = [];
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
            const students = studentsSnap2.docs.map(d => (Object.assign({ id: d.id }, d.data())));
            const studentChanges = [];
            for (const st of students) {
                const sLatest = filteredScores2.filter((s) => s.studentId === st.id && s.examinationId === latestExam.id);
                const sPrev = filteredScores2.filter((s) => s.studentId === st.id && s.examinationId === prevExam.id);
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
    static async getGradeDistribution(examId, classFilter) {
        const studentWhere = { status: 'Active' };
        if (classFilter && classFilter !== 'all') {
            studentWhere.classId = classFilter;
        }
        const gradeScalesSnap = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales = gradeScalesSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        let studentsQ3 = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQ3 = studentsQ3.where('classId', '==', classFilter);
        const studentsSnap3 = await studentsQ3.get();
        const studentIds3 = new Set(studentsSnap3.docs.map(d => d.id));
        const allScoresSnap3 = await index_1.db.collection('scores').get();
        let scores = allScoresSnap3.docs.map(d => d.data()).filter((s) => studentIds3.has(s.studentId) && s.percentage != null);
        if (examId && examId !== 'all')
            scores = scores.filter((s) => s.examinationId === examId);
        // Counts by grade
        const gradeMap = {};
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
                const band = scoreBands.find(b => s.percentage >= b.min && s.percentage <= b.max);
                if (band)
                    band.count++;
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
    static async getPerformanceHeatmap(examId, classFilter) {
        let studentsQ4 = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQ4 = studentsQ4.where('classId', '==', classFilter);
        const studentsSnap4 = await studentsQ4.get();
        const studentIds4 = new Set(studentsSnap4.docs.map(d => d.id));
        const classRoomCache4 = new Map();
        const students = await Promise.all(studentsSnap4.docs.map(async (d) => {
            const st = Object.assign({ id: d.id }, d.data());
            if (st.classId && !classRoomCache4.has(st.classId)) {
                const cDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                if (cDoc.exists)
                    classRoomCache4.set(st.classId, Object.assign({ id: cDoc.id }, cDoc.data()));
            }
            st.classRoom = classRoomCache4.get(st.classId) || null;
            return st;
        }));
        students.sort((a, b) => a.fullName.localeCompare(b.fullName));
        const subjectsSnap4 = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const subjects = subjectsSnap4.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const scoresSnap4 = await index_1.db.collection('scores').where('examinationId', '==', examId).get();
        const scores = scoresSnap4.docs.map(d => d.data()).filter((s) => studentIds4.has(s.studentId));
        const scoreLookup = {};
        scores.forEach(s => {
            scoreLookup[`${s.studentId}_${s.subjectId}`] = {
                percentage: s.percentage,
                grade: s.grade,
            };
        });
        const rows = students.map(student => {
            var _a;
            const studentScores = {};
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
                class: ((_a = student.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '—',
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
    static async getStudentAnalytics(studentId) {
        const settingsSnap5 = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnap5.empty ? { passThreshold: 50.0, stableThreshold: 1.0 } : settingsSnap5.docs[0].data();
        const studentDoc = await index_1.db.collection('students').doc(studentId).get();
        if (!studentDoc.exists)
            throw new Error('Student not found');
        const student = Object.assign({ id: studentDoc.id }, studentDoc.data());
        const examsSnap5 = await index_1.db.collection('examinations').orderBy('sequenceOrder', 'asc').get();
        const exams = examsSnap5.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const subjectsSnap5 = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const subjects = subjectsSnap5.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const subjectMap5 = new Map(subjects.map((s) => [s.id, s]));
        const allScoresSnap5 = await index_1.db.collection('scores').where('studentId', '==', studentId).get();
        const allScores = allScoresSnap5.docs.map(d => {
            const data = d.data();
            return Object.assign(Object.assign({ id: d.id }, data), { subject: subjectMap5.get(data.subjectId) });
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
        const validAverages = mockTimeline.map(m => m.average).filter((a) => a !== null);
        const firstAvg = validAverages.length > 0 ? validAverages[0] : null;
        const latestAvg = validAverages.length > 0 ? validAverages[validAverages.length - 1] : null;
        const prevAvg = validAverages.length > 1 ? validAverages[validAverages.length - 2] : null;
        const previousMockChange = (latestAvg !== null && prevAvg !== null)
            ? Math.round((latestAvg - prevAvg) * 10) / 10
            : null;
        const overallChange = (latestAvg !== null && firstAvg !== null)
            ? Math.round((latestAvg - firstAvg) * 10) / 10
            : null;
        const longTermTrend = (0, grading_1.calculateLongTermTrend)(mockTimeline.map(m => m.average), settings.stableThreshold);
        const latestExam = exams.length > 0 ? exams[exams.length - 1] : null;
        let latestExamScores = [];
        if (latestExam && student.classId) {
            const classStudSnap = await index_1.db.collection('students').where('classId', '==', student.classId).where('status', '==', 'Active').get();
            const classStudIds = new Set(classStudSnap.docs.map(d => d.id));
            const latestScoreSnap = await index_1.db.collection('scores').where('examinationId', '==', latestExam.id).get();
            latestExamScores = latestScoreSnap.docs.map(d => d.data()).filter((s) => classStudIds.has(s.studentId));
        }
        // Subject trends for this learner
        const subjectTrends = subjects.map(sub => {
            const subScores = exams.map(exam => {
                var _a, _b, _c, _d;
                const sc = allScores.find(s => s.examinationId === exam.id && s.subjectId === sub.id);
                return {
                    examId: exam.id,
                    mockName: exam.name,
                    score: (_a = sc === null || sc === void 0 ? void 0 : sc.rawScore) !== null && _a !== void 0 ? _a : null,
                    percentage: (_b = sc === null || sc === void 0 ? void 0 : sc.percentage) !== null && _b !== void 0 ? _b : null,
                    grade: (_c = sc === null || sc === void 0 ? void 0 : sc.grade) !== null && _c !== void 0 ? _c : null,
                    remark: (_d = sc === null || sc === void 0 ? void 0 : sc.remark) !== null && _d !== void 0 ? _d : null,
                };
            });
            const validP = subScores.map(s => s.percentage).filter((p) => p !== null);
            const subFirst = validP.length > 0 ? validP[0] : null;
            const subLatest = validP.length > 0 ? validP[validP.length - 1] : null;
            const subPrev = validP.length > 1 ? validP[validP.length - 2] : null;
            const subPrevChange = (subLatest !== null && subPrev !== null)
                ? Math.round((subLatest - subPrev) * 10) / 10
                : null;
            const subOverallChange = (subLatest !== null && subFirst !== null)
                ? Math.round((subLatest - subFirst) * 10) / 10
                : null;
            const subTrend = (0, grading_1.calculateLongTermTrend)(subScores.map(s => s.percentage), settings.stableThreshold);
            // 1. Peer Comparison: Class Average
            const classScores = latestExamScores.filter(s => s.subjectId === sub.id && s.percentage !== null);
            const classAverage = classScores.length > 0
                ? Math.round((classScores.reduce((sum, s) => sum + s.percentage, 0) / classScores.length) * 10) / 10
                : null;
            // 2. Predictive BECE Grade
            // Simple prediction: Give more weight to the most recent mocks
            let predictedScore = null;
            if (validP.length === 1) {
                predictedScore = validP[0];
            }
            else if (validP.length > 1) {
                // Weighted moving average
                let weightSum = 0;
                let weightedScoreSum = 0;
                validP.forEach((score, idx) => {
                    const weight = idx + 1; // More recent mocks have higher weight
                    weightedScoreSum += score * weight;
                    weightSum += weight;
                });
                predictedScore = Math.round(weightedScoreSum / weightSum);
            }
            const getGrade = (score) => {
                if (score >= 80)
                    return '1';
                if (score >= 70)
                    return '2';
                if (score >= 65)
                    return '3';
                if (score >= 60)
                    return '4';
                if (score >= 55)
                    return '5';
                if (score >= 50)
                    return '6';
                if (score >= 45)
                    return '7';
                if (score >= 40)
                    return '8';
                return '9';
            };
            const predictedGrade = predictedScore !== null ? getGrade(predictedScore) : null;
            // 3. Automated Recommendation
            let recommendation = null;
            let status = 'good';
            if (predictedScore !== null && classAverage !== null) {
                if (predictedScore < settings.passThreshold) {
                    recommendation = `High risk of failing ${sub.name}. Immediate intervention required.`;
                    status = 'danger';
                }
                else if (subTrend === 'Declining') {
                    recommendation = `Your performance in ${sub.name} is dropping. Review recent topics.`;
                    status = 'warning';
                }
                else if (predictedScore < classAverage) {
                    recommendation = `You are performing below the class average in ${sub.name}.`;
                    status = 'warning';
                }
                else {
                    recommendation = `Keep it up! You are on track for a good grade in ${sub.name}.`;
                    status = 'good';
                }
            }
            return {
                subjectId: sub.id,
                subjectName: sub.name,
                subjectCode: sub.code,
                scores: subScores,
                latestPercentage: subLatest,
                previousChange: subPrevChange,
                overallChange: subOverallChange,
                trend: subTrend,
                classAverage,
                predictedScore,
                predictedGrade,
                recommendation,
                status
            };
        });
        // Best and weakest subjects
        const sortedSub = [...subjectTrends].filter(s => s.latestPercentage !== null)
            .sort((a, b) => (b.latestPercentage || 0) - (a.latestPercentage || 0));
        const bestSubject = sortedSub.length > 0 ? sortedSub[0] : null;
        const weakestSubject = sortedSub.length > 0 ? sortedSub[sortedSub.length - 1] : null;
        // Predicted Overall Aggregate based on predicted grades
        let predictedAggregate = null;
        const predictedGrades = sortedSub.filter(s => s.predictedScore !== null);
        if (predictedGrades.length >= 6) { // Usually 6 subjects for aggregate
            // Assuming a simplistic sum of grades mapping to aggregate points (A=1, B=2... etc)
            // We will just use ScoreService to map the predicted scores to grades and sum the top 6.
            // Wait, ScoreService calculates grades. But let's just approximate the aggregate from the predicted scores.
            const getAggregateValue = (score) => {
                if (score >= 80)
                    return 1;
                if (score >= 70)
                    return 2;
                if (score >= 65)
                    return 3;
                if (score >= 60)
                    return 4;
                if (score >= 55)
                    return 5;
                if (score >= 50)
                    return 6;
                if (score >= 45)
                    return 7;
                if (score >= 40)
                    return 8;
                return 9;
            };
            const sortedPredicted = [...predictedGrades].sort((a, b) => b.predictedScore - a.predictedScore);
            const coreSubjects = sortedPredicted.filter(s => ['ENGL', 'MATH', 'SCI', 'SST'].includes(s.subjectCode || ''));
            const otherSubjects = sortedPredicted.filter(s => !['ENGL', 'MATH', 'SCI', 'SST'].includes(s.subjectCode || ''));
            let aggregateSum = 0;
            let count = 0;
            for (const core of coreSubjects) {
                aggregateSum += getAggregateValue(core.predictedScore);
                count++;
            }
            for (const other of otherSubjects) {
                if (count >= 6)
                    break;
                aggregateSum += getAggregateValue(other.predictedScore);
                count++;
            }
            predictedAggregate = aggregateSum;
        }
        return {
            settings,
            student,
            mockTimeline,
            previousMockChange,
            overallChange,
            longTermTrend,
            bestSubject,
            weakestSubject,
            predictedAggregate,
            subjectTrends,
        };
    }
    /**
     * Multi-student comparison
     */
    static async compareMultipleStudents(studentIds) {
        const studentsData = await Promise.all(studentIds.map(async (id) => {
            const doc = await index_1.db.collection('students').doc(id).get();
            return doc.exists ? Object.assign({ id: doc.id }, doc.data()) : null;
        }));
        const students = studentsData.filter(Boolean);
        const subjectsSnap6 = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const subjects = subjectsSnap6.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const studentReports = await Promise.all(studentIds.map(id => this.getStudentAnalytics(id)));
        // Subject by subject comparison across selected students
        const subjectComparison = subjects.map(sub => {
            const studentMap = {};
            studentReports.forEach(rep => {
                const match = rep.subjectTrends.find(s => s.subjectId === sub.id);
                studentMap[rep.student.fullName] = match ? match.latestPercentage : null;
            });
            return Object.assign({ subjectName: sub.name, subjectCode: sub.code }, studentMap);
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
    static async getWeakAreasAndAlerts(classFilter) {
        const settingsSnap7 = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnap7.empty ? { passThreshold: 50.0, stableThreshold: 1.0, consecutiveDeclineAlertCount: 3, consecutiveBelowTargetAlertCount: 3 } : settingsSnap7.docs[0].data();
        const target = settings.passThreshold || 50;
        const declineAlertThreshold = settings.consecutiveDeclineAlertCount || 3;
        const belowTargetAlertThreshold = settings.consecutiveBelowTargetAlertCount || 3;
        const examsSnap7 = await index_1.db.collection('examinations').orderBy('sequenceOrder', 'asc').get();
        const exams = examsSnap7.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const subjectsSnap7 = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const subjects = subjectsSnap7.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        let studentsQ7 = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQ7 = studentsQ7.where('classId', '==', classFilter);
        const studentsSnap7 = await studentsQ7.get();
        const studentsArr7 = studentsSnap7.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const studentIds7 = new Set(studentsArr7.map(s => s.id));
        const allScoresSnap7 = await index_1.db.collection('scores').get();
        const allScores7 = allScoresSnap7.docs.map(d => d.data()).filter((s) => studentIds7.has(s.studentId) && s.percentage != null);
        const latestExam = exams.length > 0 ? exams[exams.length - 1] : null;
        // 1. Subjects below target in latest mock
        const subjectsBelowTarget = [];
        if (latestExam) {
            for (const sub of subjects) {
                const scores = allScores7.filter((s) => s.examinationId === latestExam.id && s.subjectId === sub.id);
                if (scores.length > 0) {
                    const avg = Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / scores.length) * 10) / 10;
                    if (avg < target) {
                        subjectsBelowTarget.push({ subjectId: sub.id, subjectName: sub.name, average: avg, deficit: Math.round((target - avg) * 10) / 10, target });
                    }
                }
            }
        }
        // 2. Learners declining for 2 or 3 consecutive mocks
        const students = studentsArr7.map((st) => (Object.assign(Object.assign({}, st), { scores: allScores7.filter((s) => s.studentId === st.id) })));
        const alerts = [];
        for (const student of students) {
            // Calculate overall student mock average progression
            const averages = exams.map((exam) => {
                const examScores = student.scores.filter((s) => s.examinationId === exam.id && s.percentage != null);
                return examScores.length > 0
                    ? examScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / examScores.length
                    : null;
            }).filter((v) => v !== null);
            if (averages.length >= declineAlertThreshold) {
                let consecutiveDeclines = 0;
                for (let i = averages.length - 1; i > 0; i--) {
                    if (averages[i] < averages[i - 1] - (settings.stableThreshold || 1.0)) {
                        consecutiveDeclines++;
                    }
                    else {
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
                const subScores = exams.map((exam) => {
                    const sc = student.scores.find((s) => s.examinationId === exam.id && s.subjectId === sub.id);
                    return sc ? sc.percentage : null;
                }).filter((v) => v !== null);
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
            const scoresA = allScores7.filter((s) => s.examinationId === examA.id);
            const scoresB = allScores7.filter((s) => s.examinationId === examB.id);
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
                }
                else if (diff <= -5.0) {
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
    static async compareMultipleMocks(examIds, classFilter) {
        var _a, _b;
        if (!examIds || examIds.length === 0)
            return { mocks: [], subjects: [], subjectMatrix: [], topStudents: [] };
        const settingsSnap8 = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings8 = settingsSnap8.empty ? { passThreshold: 50, stableThreshold: 1.0 } : settingsSnap8.docs[0].data();
        const passThreshold = (_a = settings8.passThreshold) !== null && _a !== void 0 ? _a : 50;
        const stableThreshold = (_b = settings8.stableThreshold) !== null && _b !== void 0 ? _b : 1.0;
        let studentsQ8 = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQ8 = studentsQ8.where('classId', '==', classFilter);
        const studentsSnap8 = await studentsQ8.get();
        const studentIds8 = new Set(studentsSnap8.docs.map(d => d.id));
        // Load all requested exams in sequence order
        const examsAll8 = await Promise.all(examIds.map(async (id) => {
            const doc = await index_1.db.collection('examinations').doc(id).get();
            if (!doc.exists)
                return null;
            const exam = Object.assign({ id: doc.id }, doc.data());
            const esSnap = await index_1.db.collection('examinations').doc(id).collection('examinationSubjects').get();
            const esSubjects = await Promise.all(esSnap.docs.map(async (es) => {
                const esData = es.data();
                const subDoc = await index_1.db.collection('subjects').doc(esData.subjectId).get();
                return Object.assign(Object.assign({ id: es.id }, esData), { subject: subDoc.exists ? Object.assign({ id: subDoc.id }, subDoc.data()) : null });
            }));
            exam.examinationSubjects = esSubjects;
            return exam;
        }));
        const exams = examsAll8.filter(Boolean).sort((a, b) => a.sequenceOrder - b.sequenceOrder);
        // Build union of all subjects across selected exams
        const subjectMap = new Map();
        for (const exam of exams) {
            for (const es of exam.examinationSubjects) {
                if (!subjectMap.has(es.subject.id)) {
                    subjectMap.set(es.subject.id, es.subject);
                }
            }
        }
        const subjects = Array.from(subjectMap.values());
        // For each exam compute KPIs and subject averages
        const mockResults = await Promise.all(exams.map(async (exam) => {
            var _a;
            // All percentage scores for this exam (student-level, one per student-subject)
            const examScoresSnap8 = await index_1.db.collection('scores').where('examinationId', '==', exam.id).get();
            const allScores = examScoresSnap8.docs.map(d => d.data()).filter((s) => studentIds8.has(s.studentId) && s.percentage != null);
            // Student averages
            const studentTotals = {};
            for (const s of allScores) {
                if (!studentTotals[s.studentId])
                    studentTotals[s.studentId] = { sum: 0, count: 0 };
                studentTotals[s.studentId].sum += (_a = s.percentage) !== null && _a !== void 0 ? _a : 0;
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
            const gradeDistribution = {};
            for (const s of allScores) {
                if (s.grade)
                    gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
            }
            // Subject averages for this exam
            const subjectAverages = {};
            for (const sub of subjects) {
                const subScores = allScores.filter(s => s.subjectId === sub.id);
                subjectAverages[sub.id] = subScores.length > 0
                    ? Math.round(subScores.reduce((a, s) => { var _a; return a + ((_a = s.percentage) !== null && _a !== void 0 ? _a : 0); }, 0) / subScores.length * 10) / 10
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
        }));
        // Delta vs baseline (first selected mock in sequence order)
        const baseline = mockResults[0];
        const mocksWithDelta = mockResults.map((m, idx) => (Object.assign(Object.assign({}, m), { deltaVsBaseline: idx === 0
                ? null
                : (m.classAverage !== null && baseline.classAverage !== null)
                    ? Math.round((m.classAverage - baseline.classAverage) * 10) / 10
                    : null, deltaVsPrevious: idx === 0
                ? null
                : (m.classAverage !== null && mockResults[idx - 1].classAverage !== null)
                    ? Math.round((m.classAverage - mockResults[idx - 1].classAverage) * 10) / 10
                    : null, progressStatus: idx === 0
                ? 'Baseline'
                : (() => {
                    const d = m.classAverage !== null && mockResults[idx - 1].classAverage !== null
                        ? m.classAverage - mockResults[idx - 1].classAverage
                        : 0;
                    if (d > stableThreshold)
                        return 'Improving';
                    if (d < -stableThreshold)
                        return 'Declining';
                    return 'Stable';
                })() })));
        // Build subject matrix — rows = subjects, cols = each mock
        const subjectMatrix = subjects.map(sub => {
            var _a;
            const row = { subjectId: sub.id, subjectName: sub.name, subjectCode: sub.code };
            for (const m of mocksWithDelta) {
                row[m.examId] = (_a = m.subjectAverages[sub.id]) !== null && _a !== void 0 ? _a : null;
            }
            // Net change first to last across selected mocks
            const values = mocksWithDelta.map(m => { var _a; return (_a = m.subjectAverages[sub.id]) !== null && _a !== void 0 ? _a : null; }).filter((v) => v !== null);
            row.netChange = values.length >= 2 ? Math.round((values[values.length - 1] - values[0]) * 10) / 10 : null;
            row.trend = (0, grading_1.calculateLongTermTrend)(mocksWithDelta.map(m => { var _a; return (_a = m.subjectAverages[sub.id]) !== null && _a !== void 0 ? _a : null; }), stableThreshold);
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
    /**
     * Analytics tailored for a specific teacher, filtering by their assigned subjects
     */
    static async getTeacherAnalytics(teacherId, academicYear) {
        const settingsSnap9 = await index_1.db.collection('schoolSettings').limit(1).get();
        const settings = settingsSnap9.empty ? { passThreshold: 50.0, academicYear: '2025/2026' } : settingsSnap9.docs[0].data();
        const year = academicYear || settings.academicYear || '2025/2026';
        // 1. Get Teacher's assigned subjects
        const tsSnap = await index_1.db.collection('teacherSubjects').where('userId', '==', teacherId).get();
        const teacherSubjectLinks = tsSnap.docs.map(d => d.data());
        if (teacherSubjectLinks.length === 0) {
            return { assignedSubjects: [], kpis: { average: 0, passRate: 0, totalScores: 0 }, classPerformance: [], subjectBreakdown: [] };
        }
        const subjectIds = teacherSubjectLinks.map(ts => ts.subjectId);
        const subjectDocs = await Promise.all(subjectIds.map(id => index_1.db.collection('subjects').doc(id).get()));
        const subjectMap9 = new Map(subjectDocs.filter(d => d.exists).map(d => [d.id, Object.assign({ id: d.id }, d.data())]));
        const teacherSubjects = teacherSubjectLinks.map(ts => (Object.assign(Object.assign({}, ts), { subject: subjectMap9.get(ts.subjectId) })));
        // 2. Fetch Exams for the year
        const examsSnap9 = await index_1.db.collection('examinations').where('academicYear', '==', year).orderBy('sequenceOrder', 'asc').get();
        const exams = examsSnap9.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        if (exams.length === 0) {
            return { assignedSubjects: teacherSubjects.map(ts => ts.subject), kpis: { average: 0, passRate: 0, totalScores: 0 }, classPerformance: [], subjectBreakdown: [] };
        }
        const examIds = exams.map((e) => e.id);
        // 3. Fetch scores for these subjects and exams
        const allScoresSnap9 = await index_1.db.collection('scores').get();
        const rawScores = allScoresSnap9.docs.map(d => d.data()).filter((s) => subjectIds.includes(s.subjectId) && examIds.includes(s.examinationId) && s.percentage != null);
        // Attach classRoom to each score's student
        const classRoomCache9 = new Map();
        const studentCache9 = new Map();
        const scores = await Promise.all(rawScores.map(async (s) => {
            if (!studentCache9.has(s.studentId)) {
                const sDoc = await index_1.db.collection('students').doc(s.studentId).get();
                if (sDoc.exists) {
                    const st = Object.assign({ id: sDoc.id }, sDoc.data());
                    if (st.classId && !classRoomCache9.has(st.classId)) {
                        const cDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                        if (cDoc.exists)
                            classRoomCache9.set(st.classId, Object.assign({ id: cDoc.id }, cDoc.data()));
                    }
                    st.classRoom = classRoomCache9.get(st.classId) || null;
                    studentCache9.set(s.studentId, st);
                }
            }
            return Object.assign(Object.assign({}, s), { student: studentCache9.get(s.studentId), subject: subjectMap9.get(s.subjectId) });
        }));
        // KPI Calculation
        const totalScores = scores.length;
        const avgScore = totalScores > 0
            ? Math.round((scores.reduce((sum, s) => sum + (s.percentage || 0), 0) / totalScores) * 10) / 10
            : 0;
        const passedScores = scores.filter(s => (s.percentage || 0) >= settings.passThreshold).length;
        const passRate = totalScores > 0
            ? Math.round((passedScores / totalScores) * 100 * 10) / 10
            : 0;
        // Subject Breakdown
        const subjectBreakdown = teacherSubjects.map((ts) => {
            var _a, _b;
            const subScores = scores.filter((s) => s.subjectId === ts.subjectId);
            const subCount = subScores.length;
            const subAvg = subCount > 0 ? Math.round((subScores.reduce((sum, s) => sum + (s.percentage || 0), 0) / subCount) * 10) / 10 : 0;
            const subPass = subScores.filter((s) => (s.percentage || 0) >= settings.passThreshold).length;
            return {
                subjectName: (_a = ts.subject) === null || _a === void 0 ? void 0 : _a.name,
                subjectCode: (_b = ts.subject) === null || _b === void 0 ? void 0 : _b.code,
                average: subAvg,
                passRate: subCount > 0 ? Math.round((subPass / subCount) * 100 * 10) / 10 : 0,
                count: subCount
            };
        });
        // Class Performance (Average across assigned subjects per class)
        const classMap = new Map();
        scores.forEach((s) => {
            var _a;
            if ((_a = s.student) === null || _a === void 0 ? void 0 : _a.classRoom) {
                const cName = s.student.classRoom.name;
                if (!classMap.has(cName))
                    classMap.set(cName, { className: cName, sum: 0, count: 0 });
                const cData = classMap.get(cName);
                cData.sum += s.percentage || 0;
                cData.count++;
            }
        });
        const classPerformance = Array.from(classMap.values()).map(c => ({
            className: c.className,
            average: Math.round((c.sum / c.count) * 10) / 10,
            count: c.count
        })).sort((a, b) => b.average - a.average);
        return {
            assignedSubjects: teacherSubjects.map((ts) => ts.subject),
            kpis: { average: avgScore, passRate, totalScores },
            classPerformance,
            subjectBreakdown
        };
    }
}
exports.AnalyticsService = AnalyticsService;
//# sourceMappingURL=analyticsService.js.map