"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSubjects = getSubjects;
exports.createSubject = createSubject;
exports.updateSubject = updateSubject;
exports.deleteSubject = deleteSubject;
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
async function getSubjects(req, res) {
    try {
        const snapshot = await index_1.db.collection('subjects').orderBy('order', 'asc').get();
        let subjects = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Fetch classes for reference
        const classSnapshot = await index_1.db.collection('classRooms').get();
        const classMap = new Map(classSnapshot.docs.map(d => [d.id, Object.assign({ id: d.id }, d.data())]));
        subjects = subjects.map(s => (Object.assign(Object.assign({}, s), { classRoom: s.classId ? classMap.get(s.classId) : null, _count: { scores: 0, examinationSubjects: 0 } })));
        res.json({ subjects });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve subjects.' });
    }
}
async function createSubject(req, res) {
    var _a, _b;
    try {
        const { name, code, maxScore, order, classId } = req.body;
        if (!name || !code) {
            res.status(400).json({ error: 'Subject name and code are required.' });
            return;
        }
        const existing = await index_1.db.collection('subjects').where('code', '==', code.trim().toUpperCase()).get();
        if (!existing.empty) {
            res.status(400).json({ error: `Subject code "${code}" already exists.` });
            return;
        }
        const data = {
            name: name.trim(),
            code: code.trim().toUpperCase(),
            maxScore: Number(maxScore) || 100,
            order: Number(order) || 0,
            isCore: req.body.isCore === true || req.body.isCore === 'true',
            status: 'Active',
            classId: classId || null,
            createdAt: new Date().toISOString()
        };
        const docRef = await index_1.db.collection('subjects').add(data);
        const subject = Object.assign({ id: docRef.id }, data);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'CREATE_SUBJECT',
            recordType: 'Subject',
            recordId: subject.id,
            newValue: `${subject.name} (${subject.code})`,
            ipAddress: req.ip,
        });
        res.status(201).json({ subject, message: 'Subject created successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create subject.' });
    }
}
async function updateSubject(req, res) {
    var _a, _b;
    try {
        const id = req.params.id;
        const { name, code, maxScore, status, order, classId } = req.body;
        const existingDoc = await index_1.db.collection('subjects').doc(id).get();
        if (!existingDoc.exists) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        const existing = existingDoc.data();
        const data = {
            name: name ? name.trim() : existing.name,
            code: code ? code.trim().toUpperCase() : existing.code,
            maxScore: maxScore !== undefined ? Number(maxScore) : existing.maxScore,
            status: status || existing.status,
            order: order !== undefined ? Number(order) : existing.order,
            isCore: req.body.isCore !== undefined ? (req.body.isCore === true || req.body.isCore === 'true') : existing.isCore,
            classId: classId !== undefined ? (classId === '' ? null : classId) : existing.classId,
            updatedAt: new Date().toISOString()
        };
        await index_1.db.collection('subjects').doc(id).update(data);
        const updated = Object.assign({ id }, data);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UPDATE_SUBJECT',
            recordType: 'Subject',
            recordId: updated.id,
            oldValue: `${existing.name} (${existing.code})`,
            newValue: `${updated.name} (${updated.code}) - ${updated.status}`,
            ipAddress: req.ip,
        });
        res.json({ subject: updated, message: 'Subject updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update subject.' });
    }
}
async function deleteSubject(req, res) {
    var _a, _b, _c, _d, _e, _f;
    try {
        const id = req.params.id;
        const subjectDoc = await index_1.db.collection('subjects').doc(id).get();
        if (!subjectDoc.exists) {
            res.status(404).json({ error: 'Subject not found.' });
            return;
        }
        // Historical safety check
        const scoresSnapshot = await index_1.db.collection('scores').where('subjectId', '==', id).limit(1).get();
        if (!scoresSnapshot.empty) {
            await index_1.db.collection('subjects').doc(id).update({ status: 'Inactive' });
            await (0, auth_1.logAudit)({
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
                userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
                action: 'DEACTIVATE_SUBJECT',
                recordType: 'Subject',
                recordId: id,
                newValue: 'Deactivated to preserve historical examination scores',
                ipAddress: req.ip,
            });
            res.json({
                message: 'Subject has historical examination scores and was deactivated to preserve historical results.',
                deactivated: true,
            });
            return;
        }
        await index_1.db.collection('subjects').doc(id).delete();
        await (0, auth_1.logAudit)({
            userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId,
            userName: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'Admin',
            action: 'DELETE_SUBJECT',
            recordType: 'Subject',
            recordId: id,
            oldValue: `${(_e = subjectDoc.data()) === null || _e === void 0 ? void 0 : _e.name} (${(_f = subjectDoc.data()) === null || _f === void 0 ? void 0 : _f.code})`,
            ipAddress: req.ip,
        });
        res.json({ message: 'Subject deleted successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete subject.' });
    }
}
//# sourceMappingURL=subjectController.js.map