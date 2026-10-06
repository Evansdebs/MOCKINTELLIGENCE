"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getExaminations = getExaminations;
exports.getExaminationById = getExaminationById;
exports.createExamination = createExamination;
exports.updateExamination = updateExamination;
exports.lockExamination = lockExamination;
exports.unlockExamination = unlockExamination;
exports.completeExamination = completeExamination;
exports.getExamSnapshot = getExamSnapshot;
exports.deleteExamination = deleteExamination;
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
async function getExaminations(req, res) {
    try {
        const { academicYear } = req.query;
        let examsRef = index_1.db.collection('examinations');
        if (academicYear) {
            examsRef = examsRef.where('academicYear', '==', String(academicYear));
        }
        const snapshot = await examsRef.orderBy('sequenceOrder', 'asc').get();
        const examinations = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Simulating nested relational includes
        for (let exam of examinations) {
            const examSubjectsSnapshot = await index_1.db.collection(`examinations/${exam.id}/examinationSubjects`).get();
            const examSubjects = examSubjectsSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
            const populatedSubjects = [];
            for (const es of examSubjects) {
                const subDoc = await index_1.db.collection('subjects').doc(es.subjectId).get();
                if (subDoc.exists) {
                    populatedSubjects.push(Object.assign(Object.assign({}, es), { subject: Object.assign({ id: subDoc.id }, subDoc.data()) }));
                }
            }
            exam.examinationSubjects = populatedSubjects;
            exam._count = { scores: 0 }; // Simplified
        }
        res.json({ examinations });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve examinations.' });
    }
}
async function getExaminationById(req, res) {
    try {
        const id = req.params.id;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const examination = Object.assign({ id: examDoc.id }, examDoc.data());
        // Fetch examinationSubjects subcollection with subject details
        const esSnap = await index_1.db.collection('examinations').doc(id).collection('examinationSubjects').get();
        const examinationSubjects = await Promise.all(esSnap.docs.map(async (es) => {
            const esData = es.data();
            const subDoc = await index_1.db.collection('subjects').doc(esData.subjectId).get();
            return Object.assign(Object.assign({ id: es.id }, esData), { subject: subDoc.exists ? Object.assign({ id: subDoc.id }, subDoc.data()) : null });
        }));
        examination.examinationSubjects = examinationSubjects;
        // Count of scores
        const scoresCount = await index_1.db.collection('scores').where('examinationId', '==', id).get();
        examination._count = { scores: scoresCount.size };
        res.json({ examination });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve examination details.' });
    }
}
async function createExamination(req, res) {
    var _a, _b, _c;
    try {
        const { name, academicYear, description, sequenceOrder, startDate, endDate, subjectIds } = req.body;
        if (!name) {
            res.status(400).json({ error: 'Examination name is required.' });
            return;
        }
        const settingsDoc = await index_1.db.collection('schoolSettings').doc('default-settings').get();
        const settings = settingsDoc.data();
        const year = academicYear || (settings === null || settings === void 0 ? void 0 : settings.academicYear) || '2025/2026';
        // Auto-calculate sequence order if not specified
        let seq = Number(sequenceOrder);
        if (!seq || isNaN(seq)) {
            const highestSnapshot = await index_1.db.collection('examinations')
                .where('academicYear', '==', year)
                .orderBy('sequenceOrder', 'desc')
                .limit(1)
                .get();
            const highest = (_a = highestSnapshot.docs[0]) === null || _a === void 0 ? void 0 : _a.data();
            seq = ((highest === null || highest === void 0 ? void 0 : highest.sequenceOrder) || 0) + 1;
        }
        // Default to active subjects if no specific subject IDs given
        let assignedSubjectIds = subjectIds;
        if (!assignedSubjectIds || assignedSubjectIds.length === 0) {
            const activeSubjectsSnapshot = await index_1.db.collection('subjects')
                .where('status', '==', 'Active')
                .get();
            assignedSubjectIds = activeSubjectsSnapshot.docs.map(doc => doc.id);
        }
        const examData = {
            name: name.trim(),
            academicYear: year,
            description: (description === null || description === void 0 ? void 0 : description.trim()) || null,
            sequenceOrder: seq,
            startDate: startDate ? new Date(startDate).toISOString() : null,
            endDate: endDate ? new Date(endDate).toISOString() : null,
            status: 'Active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        const batch = index_1.db.batch();
        const examRef = index_1.db.collection('examinations').doc();
        batch.set(examRef, examData);
        // Create examinationSubjects inside a subcollection
        for (const subId of assignedSubjectIds) {
            const examSubjectRef = index_1.db.collection(`examinations/${examRef.id}/examinationSubjects`).doc();
            batch.set(examSubjectRef, {
                subjectId: subId,
                maxScore: 100
            });
        }
        await batch.commit();
        const examination = Object.assign({ id: examRef.id }, examData);
        await (0, auth_1.logAudit)({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
            userName: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Admin',
            action: 'CREATE_EXAMINATION',
            recordType: 'Examination',
            recordId: examination.id,
            newValue: `${examination.name} (Seq: ${examination.sequenceOrder}) with ${assignedSubjectIds.length} subjects`,
            ipAddress: req.ip,
        });
        res.status(201).json({ examination, message: 'Examination created successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create examination.' });
    }
}
async function updateExamination(req, res) {
    var _a, _b;
    try {
        const id = req.params.id;
        const { name, academicYear, description, sequenceOrder, startDate, endDate, status, subjectIds } = req.body;
        const existingDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!existingDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const existing = existingDoc.data();
        if (existing.status === 'Locked' && status !== 'Active') {
            res.status(403).json({ error: 'This examination is locked. Unlock it before making modifications.' });
            return;
        }
        const updatedData = {
            name: name ? name.trim() : existing.name,
            academicYear: academicYear || existing.academicYear,
            description: description !== undefined ? description : existing.description,
            sequenceOrder: sequenceOrder !== undefined ? Number(sequenceOrder) : existing.sequenceOrder,
            startDate: startDate ? new Date(startDate).toISOString() : existing.startDate,
            endDate: endDate ? new Date(endDate).toISOString() : existing.endDate,
            status: status || existing.status,
            updatedAt: new Date().toISOString(),
        };
        const batch = index_1.db.batch();
        batch.update(index_1.db.collection('examinations').doc(id), updatedData);
        if (Array.isArray(subjectIds) && subjectIds.length > 0) {
            // Delete existing examinationSubjects
            const existingEsSnap = await index_1.db.collection('examinations').doc(id).collection('examinationSubjects').get();
            existingEsSnap.docs.forEach(d => batch.delete(d.ref));
            // Re-create
            for (const subId of subjectIds) {
                const newEsRef = index_1.db.collection('examinations').doc(id).collection('examinationSubjects').doc();
                batch.set(newEsRef, { subjectId: subId, maxScore: 100 });
            }
        }
        await batch.commit();
        const updated = Object.assign(Object.assign({ id }, existing), updatedData);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UPDATE_EXAMINATION',
            recordType: 'Examination',
            recordId: id,
            newValue: JSON.stringify({ name: updated.name, status: updated.status }),
            ipAddress: req.ip,
        });
        res.json({ examination: updated, message: 'Examination updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update examination.' });
    }
}
async function lockExamination(req, res) {
    var _a, _b, _c, _d;
    try {
        const id = req.params.id;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = examDoc.data();
        const lockData = {
            status: 'Locked',
            lockedAt: new Date().toISOString(),
            lockedBy: ((_a = req.user) === null || _a === void 0 ? void 0 : _a.name) || 'Admin',
            updatedAt: new Date().toISOString(),
        };
        await index_1.db.collection('examinations').doc(id).update(lockData);
        const updated = Object.assign(Object.assign({ id }, exam), lockData);
        await (0, auth_1.logAudit)({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
            userName: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Admin',
            action: 'LOCK_EXAMINATION',
            recordType: 'Examination',
            recordId: id,
            newValue: `Locked by ${(_d = req.user) === null || _d === void 0 ? void 0 : _d.name}. Scores are now read-only.`,
            ipAddress: req.ip,
        });
        res.json({ examination: updated, message: `${updated.name} has been locked. Score modifications are disabled.` });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to lock examination.' });
    }
}
async function unlockExamination(req, res) {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        const { reason } = req.body;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = examDoc.data();
        const unlockData = { status: 'Active', lockedAt: null, lockedBy: null, updatedAt: new Date().toISOString() };
        await index_1.db.collection('examinations').doc(id).update(unlockData);
        const updated = Object.assign(Object.assign({ id }, exam), unlockData);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UNLOCK_EXAMINATION',
            recordType: 'Examination',
            recordId: id,
            newValue: `Unlocked by ${(_c = req.user) === null || _c === void 0 ? void 0 : _c.name}. Reason: ${reason || 'Administrative review'}`,
            ipAddress: req.ip,
        });
        res.json({ examination: updated, message: `${updated.name} has been unlocked with authorization.` });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to unlock examination.' });
    }
}
async function completeExamination(req, res) {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = examDoc.data();
        if (exam.status === 'Locked') {
            res.status(403).json({ error: 'Examination is already locked. Unlock first to modify.' });
            return;
        }
        const completedData = { status: 'Completed', updatedAt: new Date().toISOString() };
        await index_1.db.collection('examinations').doc(id).update(completedData);
        const updated = Object.assign(Object.assign({ id }, exam), completedData);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'COMPLETE_EXAMINATION',
            recordType: 'Examination',
            recordId: id,
            newValue: `Marked as Completed by ${(_c = req.user) === null || _c === void 0 ? void 0 : _c.name}. All score entries finalised.`,
            ipAddress: req.ip,
        });
        res.json({ examination: updated, message: `${updated.name} has been marked as Completed. All results are now finalised.` });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to complete examination.' });
    }
}
async function getExamSnapshot(req, res) {
    var _a, _b;
    try {
        const id = req.params.id;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = Object.assign({ id: examDoc.id }, examDoc.data());
        // Fetch examinationSubjects
        const esSnap = await index_1.db.collection('examinations').doc(id).collection('examinationSubjects').get();
        const examinationSubjects = esSnap.docs.map(d => d.data());
        exam.examinationSubjects = examinationSubjects;
        // Get all scores for this exam
        const scoresSnap = await index_1.db.collection('scores').where('examinationId', '==', id).get();
        const scores = scoresSnap.docs.map(d => d.data()).filter((s) => s.percentage != null);
        if (scores.length === 0) {
            res.json({
                examId: id,
                examName: exam.name,
                status: exam.status,
                studentCount: 0,
                average: null,
                passRate: null,
                highestAverage: null,
                lowestAverage: null,
                gradeDistribution: {},
            });
            return;
        }
        // Aggregate by student
        const studentTotals = {};
        for (const s of scores) {
            if (!studentTotals[s.studentId])
                studentTotals[s.studentId] = { sum: 0, count: 0 };
            studentTotals[s.studentId].sum += (_a = s.percentage) !== null && _a !== void 0 ? _a : 0;
            studentTotals[s.studentId].count++;
        }
        const studentAverages = Object.values(studentTotals).map((t) => Math.round((t.sum / t.count) * 100) / 100);
        const settingsSnap = await index_1.db.collection('schoolSettings').limit(1).get();
        const settingsData = settingsSnap.empty ? {} : settingsSnap.docs[0].data();
        const passThreshold = (_b = settingsData.passThreshold) !== null && _b !== void 0 ? _b : 50;
        const overallAvg = studentAverages.reduce((a, b) => a + b, 0) / studentAverages.length;
        const passCount = studentAverages.filter((a) => a >= passThreshold).length;
        // Grade distribution
        const gradeDistribution = {};
        for (const s of scores) {
            if (s.grade) {
                gradeDistribution[s.grade] = (gradeDistribution[s.grade] || 0) + 1;
            }
        }
        res.json({
            examId: id,
            examName: exam.name,
            status: exam.status,
            sequenceOrder: exam.sequenceOrder,
            subjectCount: exam.examinationSubjects.length,
            studentCount: studentAverages.length,
            average: Math.round(overallAvg * 100) / 100,
            passRate: Math.round((passCount / studentAverages.length) * 100 * 10) / 10,
            highestAverage: Math.max(...studentAverages),
            lowestAverage: Math.min(...studentAverages),
            gradeDistribution,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to retrieve exam snapshot.' });
    }
}
async function deleteExamination(req, res) {
    var _a, _b;
    try {
        const id = req.params.id;
        const examDoc = await index_1.db.collection('examinations').doc(id).get();
        if (!examDoc.exists) {
            res.status(404).json({ error: 'Examination not found.' });
            return;
        }
        const exam = examDoc.data();
        await index_1.db.collection('examinations').doc(id).delete();
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'DELETE_EXAMINATION',
            recordType: 'Examination',
            recordId: id,
            newValue: `Deleted examination: ${exam.name}`,
            ipAddress: req.ip,
        });
        res.json({ message: 'Examination deleted successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete examination.' });
    }
}
//# sourceMappingURL=examinationController.js.map