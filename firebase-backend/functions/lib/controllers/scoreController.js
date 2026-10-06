"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getScoreSheet = getScoreSheet;
exports.batchSaveScores = batchSaveScores;
exports.previewScoreImport = previewScoreImport;
exports.commitScoreImport = commitScoreImport;
exports.downloadScoreTemplate = downloadScoreTemplate;
const XLSX = __importStar(require("xlsx"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const grading_1 = require("../utils/grading");
/**
 * Get score entry matrix for an examination and optional subject/class
 */
async function getScoreSheet(req, res) {
    var _a, _b;
    try {
        const { examinationId, subjectId, classId: classFilter } = req.query;
        if (!examinationId) {
            res.status(400).json({ error: 'examinationId is required.' });
            return;
        }
        const examDoc = await index_1.db.collection('examinations').doc(String(examinationId)).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = Object.assign({ id: examDoc.id }, examDoc.data());
        const settingsDoc = await index_1.db.collection('schoolSettings').doc('default-settings').get();
        const settings = settingsDoc.data();
        let studentsRef = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all') {
            studentsRef = studentsRef.where('classId', '==', String(classFilter));
        }
        const studentsSnapshot = await studentsRef.orderBy('fullName', 'asc').get();
        const students = studentsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Fetch classes for student mapping
        const classSnapshot = await index_1.db.collection('classRooms').get();
        const classes = classSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        students.forEach(s => s.classRoom = classes.find(c => c.id === s.classId));
        let scoresRef = index_1.db.collection('scores').where('examinationId', '==', String(examinationId));
        if (subjectId && subjectId !== 'all') {
            scoresRef = scoresRef.where('subjectId', '==', String(subjectId));
        }
        const scoresSnapshot = await scoresRef.get();
        const existingScores = scoresSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        const activeSubjectsSnapshot = await index_1.db.collection('subjects').where('status', '==', 'Active').orderBy('order', 'asc').get();
        const allActiveSubjects = activeSubjectsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        let subjects = allActiveSubjects
            .filter(s => (subjectId && subjectId !== 'all' ? s.id === subjectId : true));
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'TEACHER') {
            const assignedSnapshot = await index_1.db.collection('teacherSubjects').where('userId', '==', req.user.userId).get();
            const assignedIds = new Set(assignedSnapshot.docs.map(d => d.data().subjectId));
            subjects = subjects.filter(s => assignedIds.has(s.id));
        }
        // Construct matrix
        const scoreMap = {};
        existingScores.forEach(s => {
            scoreMap[`${s.studentId}_${s.subjectId}`] = s;
        });
        const rows = students.map(student => {
            var _a;
            const studentScores = {};
            subjects.forEach(sub => {
                studentScores[sub.id] = scoreMap[`${student.id}_${sub.id}`] || null;
            });
            return {
                student: {
                    id: student.id,
                    studentId: student.studentId,
                    indexNumber: student.indexNumber,
                    fullName: student.fullName,
                    class: (_a = student.classRoom) === null || _a === void 0 ? void 0 : _a.name,
                    gender: student.gender,
                },
                scores: studentScores,
            };
        });
        res.json({
            examination: {
                id: exam.id,
                name: exam.name,
                status: exam.status,
                isLocked: exam.status === 'Locked',
            },
            settings: {
                teachersCanEditScores: (_b = settings === null || settings === void 0 ? void 0 : settings.teachersCanEditScores) !== null && _b !== void 0 ? _b : true,
            },
            subjects,
            rows,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to load score sheet.' });
    }
}
/**
 * Save / Update a batch of scores (used for spreadsheet auto-save and manual save)
 */
async function batchSaveScores(req, res) {
    var _a, _b, _c, _d;
    try {
        const { examinationId, scores } = req.body;
        if (!examinationId || !Array.isArray(scores)) {
            res.status(400).json({ error: 'examinationId and scores array are required.' });
            return;
        }
        const examDoc = await index_1.db.collection('examinations').doc(examinationId).get();
        const exam = examDoc.data();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        // Role check for teachers
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'TEACHER') {
            const assignedSnapshot = await index_1.db.collection('teacherSubjects').where('userId', '==', req.user.userId).get();
            const assignedSubjectIds = new Set(assignedSnapshot.docs.map(doc => doc.data().subjectId));
            const submittedSubjectIds = new Set(scores.map(s => s.subjectId));
            for (const id of submittedSubjectIds) {
                if (!assignedSubjectIds.has(id)) {
                    res.status(403).json({ error: 'You are not assigned to one or more of these subjects.' });
                    return;
                }
            }
        }
        // Role and lock check: teachers and admins cannot edit locked exams
        if (exam.status === 'Locked') {
            res.status(403).json({
                error: `Examination "${exam.name}" is locked. Modification of scores is prohibited. Unlock examination to make changes.`,
            });
            return;
        }
        const settingsDoc = await index_1.db.collection('schoolSettings').doc('default-settings').get();
        const settings = settingsDoc.data();
        if (((_b = req.user) === null || _b === void 0 ? void 0 : _b.role) === 'TEACHER' && (settings === null || settings === void 0 ? void 0 : settings.teachersCanEditScores) === false) {
            res.status(403).json({ error: 'Score entry is currently disabled by administration.' });
            return;
        }
        const gradeScalesSnapshot = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales = gradeScalesSnapshot.docs.map(doc => doc.data());
        const subjectsSnapshot = await index_1.db.collection('subjects').get();
        const subjectMap = new Map(subjectsSnapshot.docs.map(s => [s.id, Object.assign({ id: s.id }, s.data())]));
        const validationErrors = [];
        const savedScores = [];
        // Process each score entry
        for (let i = 0; i < scores.length; i++) {
            const item = scores[i];
            const { studentId, subjectId, rawScore } = item;
            if (!studentId || !subjectId) {
                validationErrors.push(`Row ${i + 1}: Missing studentId or subjectId`);
                continue;
            }
            const subject = subjectMap.get(subjectId);
            const maxScore = (subject === null || subject === void 0 ? void 0 : subject.maxScore) || 100;
            const scoreDocId = `${examinationId}_${studentId}_${subjectId}`;
            const scoreRef = index_1.db.collection('scores').doc(scoreDocId);
            // Handle null/empty (absent or not taken)
            if (rawScore === null || rawScore === undefined || rawScore === '') {
                await scoreRef.delete();
                continue;
            }
            const numericScore = Number(rawScore);
            // Validate numeric score
            if (isNaN(numericScore)) {
                validationErrors.push(`Student score must be a valid number, received: "${rawScore}"`);
                continue;
            }
            if (numericScore < 0) {
                validationErrors.push(`Negative scores are not permitted: ${numericScore}`);
                continue;
            }
            if (numericScore > maxScore) {
                validationErrors.push(`Score ${numericScore} exceeds maximum permissible score of ${maxScore} for ${(subject === null || subject === void 0 ? void 0 : subject.name) || 'subject'}`);
                continue;
            }
            // Calculate grade and percentage
            const gradeResult = (0, grading_1.calculateGradeForScore)(numericScore, maxScore, gradeScales);
            // Upsert into database
            const scoreData = {
                studentId,
                examinationId,
                subjectId,
                rawScore: gradeResult.rawScore,
                percentage: gradeResult.percentage,
                grade: gradeResult.grade,
                gradePoint: gradeResult.gradePoint,
                remark: gradeResult.remark,
                isVerified: true,
                updatedAt: new Date().toISOString()
            };
            await scoreRef.set(scoreData, { merge: true });
            savedScores.push(Object.assign({ id: scoreDocId }, scoreData));
        }
        if (savedScores.length > 0) {
            await (0, auth_1.logAudit)({
                userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId,
                userName: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'User',
                action: 'BATCH_SCORE_UPDATE',
                recordType: 'Score',
                recordId: examinationId,
                newValue: `Saved/updated ${savedScores.length} score entries for exam: ${exam.name}`,
                ipAddress: req.ip,
            });
        }
        res.json({
            message: `Successfully saved ${savedScores.length} scores.`,
            savedCount: savedScores.length,
            errors: validationErrors,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to save scores.' });
    }
}
/**
 * Preview Excel score file with comprehensive validation
 */
async function previewScoreImport(req, res) {
    var _a;
    try {
        const { examinationId, subjectId } = req.body;
        if (!req.file) {
            res.status(400).json({ error: 'Please upload an Excel file.' });
            return;
        }
        if (!examinationId || !subjectId) {
            res.status(400).json({ error: 'examinationId and subjectId are required.' });
            return;
        }
        const examDoc2 = await index_1.db.collection('examinations').doc(examinationId).get();
        if (!examDoc2.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = Object.assign({ id: examDoc2.id }, examDoc2.data());
        if (exam.status === 'Locked') {
            res.status(403).json({ error: `Cannot import scores. Examination "${exam.name}" is locked.` });
            return;
        }
        const subjectDoc2 = await index_1.db.collection('subjects').doc(subjectId).get();
        if (!subjectDoc2.exists) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        const subject = Object.assign({ id: subjectDoc2.id }, subjectDoc2.data());
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'TEACHER') {
            const assignedSnap = await index_1.db.collection('teacherSubjects').where('userId', '==', req.user.userId).where('subjectId', '==', subjectId).limit(1).get();
            if (assignedSnap.empty) {
                res.status(403).json({ error: 'You are not authorized to import scores for this subject.' });
                return;
            }
        }
        const maxScore = subject.maxScore || 100;
        const gradeScalesSnap2 = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales = gradeScalesSnap2.docs.map(d => d.data());
        // Parse Excel
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet);
        if (rawRows.length === 0) {
            res.status(400).json({ error: 'Uploaded sheet contains no rows.' });
            return;
        }
        const studentsSnap2 = await index_1.db.collection('students').where('status', '==', 'Active').get();
        const classRoomCache2 = new Map();
        const studentsArr = await Promise.all(studentsSnap2.docs.map(async (d) => {
            const st = Object.assign({ id: d.id }, d.data());
            if (st.classId && !classRoomCache2.has(st.classId)) {
                const cDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                if (cDoc.exists)
                    classRoomCache2.set(st.classId, Object.assign({ id: cDoc.id }, cDoc.data()));
            }
            st.classRoom = classRoomCache2.get(st.classId) || null;
            return st;
        }));
        const studentByIndex = new Map(studentsArr.map(s => [s.indexNumber.toLowerCase().trim(), s]));
        const seenIndices = new Set();
        const validRecords = [];
        const invalidRecords = [];
        rawRows.forEach((row, i) => {
            var _a, _b, _c, _d, _e, _f, _g;
            const rowNum = i + 2;
            const indexNumber = String(row['Index Number'] || row['indexNumber'] || row['Index'] || row['INDEX'] || '').trim();
            const rawScoreVal = (_c = (_b = (_a = row['Score']) !== null && _a !== void 0 ? _a : row['score']) !== null && _b !== void 0 ? _b : row['Mark']) !== null && _c !== void 0 ? _c : row['RAW SCORE'];
            const studentNameInFile = String(row['Student Name'] || row['Name'] || '').trim();
            const errors = [];
            if (!indexNumber) {
                errors.push('Missing Index Number');
            }
            const idxKey = indexNumber.toLowerCase();
            const student = studentByIndex.get(idxKey);
            if (indexNumber && !student) {
                errors.push(`Unknown index number "${indexNumber}" - no matching active student found`);
            }
            if (indexNumber && seenIndices.has(idxKey)) {
                errors.push(`Duplicate record for index number "${indexNumber}" in sheet`);
            }
            if (indexNumber)
                seenIndices.add(idxKey);
            let numericScore = null;
            if (rawScoreVal === null || rawScoreVal === undefined || rawScoreVal === '') {
                errors.push('Missing score value');
            }
            else {
                numericScore = Number(rawScoreVal);
                if (isNaN(numericScore)) {
                    errors.push(`Score must be a number, received: "${rawScoreVal}"`);
                }
                else if (numericScore < 0) {
                    errors.push(`Negative score not allowed: ${numericScore}`);
                }
                else if (numericScore > maxScore) {
                    errors.push(`Score ${numericScore} exceeds maximum allowed (${maxScore})`);
                }
            }
            const gradeInfo = numericScore !== null && !isNaN(numericScore)
                ? (0, grading_1.calculateGradeForScore)(numericScore, maxScore, gradeScales)
                : null;
            const record = {
                rowNum,
                indexNumber,
                studentName: student ? student.fullName : (studentNameInFile || 'Unknown'),
                studentId: student ? student.id : null,
                class: student ? (_d = student.classRoom) === null || _d === void 0 ? void 0 : _d.name : '—',
                score: numericScore,
                percentage: (_e = gradeInfo === null || gradeInfo === void 0 ? void 0 : gradeInfo.percentage) !== null && _e !== void 0 ? _e : null,
                grade: (_f = gradeInfo === null || gradeInfo === void 0 ? void 0 : gradeInfo.grade) !== null && _f !== void 0 ? _f : null,
                remark: (_g = gradeInfo === null || gradeInfo === void 0 ? void 0 : gradeInfo.remark) !== null && _g !== void 0 ? _g : null,
            };
            if (errors.length > 0) {
                invalidRecords.push(Object.assign(Object.assign({}, record), { errors }));
            }
            else {
                validRecords.push(record);
            }
        });
        res.json({
            examinationName: exam.name,
            subjectName: subject.name,
            maxScore,
            totalFound: rawRows.length,
            validCount: validRecords.length,
            invalidCount: invalidRecords.length,
            validRecords,
            invalidRecords,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Excel processing error: ' + err.message });
    }
}
/**
 * Commit validated score import
 */
async function commitScoreImport(req, res) {
    var _a, _b, _c;
    try {
        const { examinationId, subjectId, records } = req.body;
        if (!examinationId || !subjectId || !Array.isArray(records)) {
            res.status(400).json({ error: 'examinationId, subjectId, and records are required.' });
            return;
        }
        const examDoc3 = await index_1.db.collection('examinations').doc(examinationId).get();
        const exam3 = examDoc3.data();
        if (!examDoc3.exists || exam3.status === 'Locked') {
            res.status(403).json({ error: 'Examination is locked or invalid.' });
            return;
        }
        const subjectDoc3 = await index_1.db.collection('subjects').doc(subjectId).get();
        if (!subjectDoc3.exists) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        const subject3 = Object.assign({ id: subjectDoc3.id }, subjectDoc3.data());
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'TEACHER') {
            const assignedSnap3 = await index_1.db.collection('teacherSubjects').where('userId', '==', req.user.userId).where('subjectId', '==', subjectId).limit(1).get();
            if (assignedSnap3.empty) {
                res.status(403).json({ error: 'You are not authorized to enter scores for this subject.' });
                return;
            }
        }
        const gradeScalesSnap3 = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales3 = gradeScalesSnap3.docs.map(d => d.data());
        const maxScore3 = subject3.maxScore || 100;
        let importedCount = 0;
        for (const rec of records) {
            if (!rec.studentId || rec.score === null || rec.score === undefined)
                continue;
            const scoreNum = Number(rec.score);
            if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore3)
                continue;
            const gradeInfo = (0, grading_1.calculateGradeForScore)(scoreNum, maxScore3, gradeScales3);
            const scoreDocId = `${examinationId}_${rec.studentId}_${subjectId}`;
            await index_1.db.collection('scores').doc(scoreDocId).set({
                studentId: rec.studentId,
                examinationId,
                subjectId,
                rawScore: gradeInfo.rawScore,
                percentage: gradeInfo.percentage,
                grade: gradeInfo.grade,
                gradePoint: gradeInfo.gradePoint,
                remark: gradeInfo.remark,
                isVerified: true,
                updatedAt: new Date().toISOString(),
            }, { merge: true });
            importedCount++;
        }
        await (0, auth_1.logAudit)({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
            userName: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'User',
            action: 'EXCEL_SCORE_IMPORT',
            recordType: 'Score',
            recordId: examinationId,
            newValue: `Imported ${importedCount} scores for ${subject3.name} in ${exam3.name}`,
            ipAddress: req.ip,
        });
        res.json({
            message: `Successfully imported ${importedCount} scores.`,
            importedCount,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Import failed.' });
    }
}
/**
 * Download blank score template for an examination and subject
 */
async function downloadScoreTemplate(req, res) {
    try {
        const { classId: classFilter } = req.query;
        let studentsQ = index_1.db.collection('students').where('status', '==', 'Active');
        if (classFilter && classFilter !== 'all')
            studentsQ = studentsQ.where('classId', '==', String(classFilter));
        const studentsSnap3 = await studentsQ.get();
        const classRoomCacheT = new Map();
        const studentsArr3 = await Promise.all(studentsSnap3.docs.map(async (d) => {
            const st = Object.assign({ id: d.id }, d.data());
            if (st.classId && !classRoomCacheT.has(st.classId)) {
                const cDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                if (cDoc.exists)
                    classRoomCacheT.set(st.classId, Object.assign({ id: cDoc.id }, cDoc.data()));
            }
            st.classRoom = classRoomCacheT.get(st.classId) || null;
            return st;
        }));
        const students = studentsArr3.sort((a, b) => {
            var _a, _b;
            const cn = (((_a = a.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '').localeCompare(((_b = b.classRoom) === null || _b === void 0 ? void 0 : _b.name) || '');
            return cn !== 0 ? cn : a.fullName.localeCompare(b.fullName);
        });
        const rows = students.map((s, idx) => {
            var _a;
            return ({
                '#': idx + 1,
                'Index Number': s.indexNumber,
                'Student Name': s.fullName,
                'Class': ((_a = s.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '—',
                'Score': '', // Blank for teacher entry
            });
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Score Template');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Score_Entry_Template.xlsx"');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate template.' });
    }
}
//# sourceMappingURL=scoreController.js.map