"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSettings = getSettings;
exports.updateSettings = updateSettings;
exports.updateGradeScales = updateGradeScales;
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
async function getSettings(req, res) {
    try {
        const settingsRef = index_1.db.collection('schoolSettings').doc('default-settings');
        let settingsDoc = await settingsRef.get();
        let settings = settingsDoc.data();
        if (!settingsDoc.exists) {
            settings = {
                id: 'default-settings',
                schoolName: 'Achimota Basic Model School',
                address: 'P.O. Box AH 123, Achimota, Accra - Ghana',
                telephone: '+233 (0) 24 555 0192',
                email: 'info@achimotabasic.edu.gh',
                academicYear: '2025/2026',
                currentClass: 'Basic 9',
                motto: 'Excellence, Character and Innovation',
                headteacherName: 'Dr. Kwame Mensah-Bonsu',
                passThreshold: 50.0,
                stableThreshold: 1.0,
                enableRanking: true,
                studentsCanDownloadSlips: true,
                teachersCanEditScores: true,
            };
            await settingsRef.set(settings);
        }
        const gradeScalesSnapshot = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales = gradeScalesSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json({ settings, gradeScales });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve school settings.' });
    }
}
async function updateSettings(req, res) {
    var _a, _b;
    try {
        const { schoolName, logoUrl, address, telephone, email, academicYear, currentClass, motto, headteacherName, enableRanking, passThreshold, stableThreshold, consecutiveDeclineAlertCount, consecutiveBelowTargetAlertCount, studentsCanDownloadSlips, teachersCanEditScores, beceStartDate, beceTimetable, headteacherSignature, } = req.body;
        const updatedData = {
            schoolName,
            logoUrl: logoUrl || null,
            address,
            telephone,
            email,
            academicYear,
            currentClass,
            motto,
            headteacherName,
            enableRanking: Boolean(enableRanking),
            passThreshold: Number(passThreshold) || 50.0,
            stableThreshold: Number(stableThreshold) || 1.0,
            consecutiveDeclineAlertCount: Number(consecutiveDeclineAlertCount) || 3,
            consecutiveBelowTargetAlertCount: Number(consecutiveBelowTargetAlertCount) || 3,
            studentsCanDownloadSlips: studentsCanDownloadSlips !== undefined ? Boolean(studentsCanDownloadSlips) : true,
            teachersCanEditScores: teachersCanEditScores !== undefined ? Boolean(teachersCanEditScores) : true,
            beceStartDate: beceStartDate ? new Date(beceStartDate).toISOString() : null,
            beceTimetable: beceTimetable || null,
            headteacherSignature: headteacherSignature || null,
        };
        const settingsRef = index_1.db.collection('schoolSettings').doc('default-settings');
        await settingsRef.set(updatedData, { merge: true });
        const updatedDoc = await settingsRef.get();
        const updated = Object.assign({ id: updatedDoc.id }, updatedDoc.data());
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UPDATE_SETTINGS',
            recordType: 'SchoolSettings',
            recordId: updated.id,
            newValue: JSON.stringify(req.body),
            ipAddress: req.ip,
        });
        res.json({ settings: updated, message: 'School settings updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update settings.' });
    }
}
async function updateGradeScales(req, res) {
    var _a, _b;
    try {
        const { scales } = req.body;
        if (!Array.isArray(scales)) {
            res.status(400).json({ error: 'Scales must be an array.' });
            return;
        }
        // Delete and recreate grade scales using a Firestore batch
        const batch = index_1.db.batch();
        const gradeScalesRef = index_1.db.collection('gradeScales');
        // Get all existing scales to delete
        const existingScales = await gradeScalesRef.get();
        existingScales.forEach(doc => {
            batch.delete(doc.ref);
        });
        const updated = [];
        for (let i = 0; i < scales.length; i++) {
            const s = scales[i];
            const newRef = gradeScalesRef.doc();
            const scaleData = {
                grade: s.grade.trim(),
                minScore: Number(s.minScore),
                maxScore: Number(s.maxScore),
                gradePoint: s.gradePoint ? Number(s.gradePoint) : null,
                remark: s.remark.trim(),
                order: i,
            };
            batch.set(newRef, scaleData);
            updated.push(Object.assign({ id: newRef.id }, scaleData));
        }
        await batch.commit();
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UPDATE_GRADE_SCALES',
            recordType: 'GradeScale',
            newValue: `Updated ${scales.length} grade boundaries`,
            ipAddress: req.ip,
        });
        res.json({ gradeScales: updated, message: 'Grade boundaries saved successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update grade scales.' });
    }
}
//# sourceMappingURL=schoolController.js.map