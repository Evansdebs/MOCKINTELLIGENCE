"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOverview = getOverview;
exports.getSubjectTrends = getSubjectTrends;
exports.getMockComparison = getMockComparison;
exports.getGradeDistribution = getGradeDistribution;
exports.getHeatmap = getHeatmap;
exports.getStudentAnalytics = getStudentAnalytics;
exports.compareStudents = compareStudents;
exports.getWeakAreasAndAlerts = getWeakAreasAndAlerts;
exports.compareMultipleMocks = compareMultipleMocks;
exports.getTeacherDashboard = getTeacherDashboard;
const analyticsService_1 = require("../services/analyticsService");
async function getOverview(req, res) {
    try {
        const { class: classFilter, academicYear } = req.query;
        const data = await analyticsService_1.AnalyticsService.getOverviewKPIs(classFilter ? String(classFilter) : undefined, academicYear ? String(academicYear) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate overview: ' + err.message });
    }
}
async function getSubjectTrends(req, res) {
    try {
        const { class: classFilter, academicYear } = req.query;
        const data = await analyticsService_1.AnalyticsService.getSubjectPerformanceAcrossMocks(classFilter ? String(classFilter) : undefined, academicYear ? String(academicYear) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate subject trends: ' + err.message });
    }
}
async function getMockComparison(req, res) {
    try {
        const { class: classFilter, academicYear } = req.query;
        const data = await analyticsService_1.AnalyticsService.getMockToMockComparison(classFilter ? String(classFilter) : undefined, academicYear ? String(academicYear) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate mock comparison: ' + err.message });
    }
}
async function getGradeDistribution(req, res) {
    try {
        const { examinationId, class: classFilter } = req.query;
        const data = await analyticsService_1.AnalyticsService.getGradeDistribution(examinationId ? String(examinationId) : undefined, classFilter ? String(classFilter) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate grade distribution: ' + err.message });
    }
}
async function getHeatmap(req, res) {
    try {
        const { examinationId, class: classFilter } = req.query;
        if (!examinationId) {
            res.status(400).json({ error: 'examinationId is required for performance heatmap.' });
            return;
        }
        const data = await analyticsService_1.AnalyticsService.getPerformanceHeatmap(String(examinationId), classFilter ? String(classFilter) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate heatmap: ' + err.message });
    }
}
async function getStudentAnalytics(req, res) {
    var _a;
    try {
        const studentId = req.params.studentId;
        if (((_a = req.user) === null || _a === void 0 ? void 0 : _a.role) === 'STUDENT' && req.user.userId !== studentId) {
            res.status(403).json({ error: 'You can only view your own analytics.' });
            return;
        }
        const data = await analyticsService_1.AnalyticsService.getStudentAnalytics(studentId);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate student analytics: ' + err.message });
    }
}
async function compareStudents(req, res) {
    try {
        const { studentIds } = req.body;
        if (!Array.isArray(studentIds) || studentIds.length === 0) {
            res.status(400).json({ error: 'studentIds array is required.' });
            return;
        }
        const data = await analyticsService_1.AnalyticsService.compareMultipleStudents(studentIds);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to compare students: ' + err.message });
    }
}
async function getWeakAreasAndAlerts(req, res) {
    try {
        const { class: classFilter } = req.query;
        const data = await analyticsService_1.AnalyticsService.getWeakAreasAndAlerts(classFilter ? String(classFilter) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to calculate weak areas and alerts: ' + err.message });
    }
}
async function compareMultipleMocks(req, res) {
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
        const data = await analyticsService_1.AnalyticsService.compareMultipleMocks(examIds.map(String), classFilter ? String(classFilter) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to compare mock examinations: ' + err.message });
    }
}
async function getTeacherDashboard(req, res) {
    try {
        const { academicYear } = req.query;
        if (!req.user || req.user.role !== 'TEACHER') {
            res.status(403).json({ error: 'Only teachers can access the teacher dashboard.' });
            return;
        }
        const data = await analyticsService_1.AnalyticsService.getTeacherAnalytics(req.user.userId, academicYear ? String(academicYear) : undefined);
        res.json(data);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch teacher analytics: ' + err.message });
    }
}
//# sourceMappingURL=analyticsController.js.map