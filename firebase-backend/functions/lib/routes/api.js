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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const auth_1 = require("../middleware/auth");
const authController = __importStar(require("../controllers/authController"));
const schoolController = __importStar(require("../controllers/schoolController"));
const studentController = __importStar(require("../controllers/studentController"));
const classRoomController = __importStar(require("../controllers/classRoomController"));
const subjectController = __importStar(require("../controllers/subjectController"));
const examinationController = __importStar(require("../controllers/examinationController"));
const scoreController = __importStar(require("../controllers/scoreController"));
const resultsController = __importStar(require("../controllers/resultsController"));
const analyticsController = __importStar(require("../controllers/analyticsController"));
const auditController = __importStar(require("../controllers/auditController"));
const userController = __importStar(require("../controllers/userController"));
const omrController = __importStar(require("../controllers/omrController"));
const upload = (0, multer_1.default)({
    storage: multer_1.default.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});
const router = (0, express_1.Router)();
// ==================== AUTHENTICATION ====================
router.post('/auth/login', authController.login);
router.post('/auth/student-login', authController.studentLogin);
router.get('/auth/me', auth_1.authenticate, authController.me);
// ==================== SCHOOL SETTINGS & GRADES ====================
router.get('/settings', auth_1.authenticate, schoolController.getSettings);
router.put('/settings', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'MANAGEMENT', 'TEACHER']), schoolController.updateSettings);
router.put('/settings/grades', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'MANAGEMENT']), schoolController.updateGradeScales);
// ==================== CLASSROOMS ====================
router.get('/classrooms', auth_1.authenticate, classRoomController.getClassRooms);
router.post('/classrooms', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), classRoomController.createClassRoom);
router.put('/classrooms/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), classRoomController.updateClassRoom);
router.delete('/classrooms/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), classRoomController.deleteClassRoom);
// ==================== STUDENTS ====================
router.get('/students', auth_1.authenticate, studentController.getStudents);
router.get('/students/export/excel', auth_1.authenticate, studentController.exportStudentsExcel);
router.get('/students/:id', auth_1.authenticate, studentController.getStudentById);
router.post('/students', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), studentController.createStudent);
router.put('/students/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), studentController.updateStudent);
router.delete('/students/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), studentController.deleteStudent);
router.post('/students/import/preview', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), upload.single('file'), studentController.previewStudentImport);
router.post('/students/import/commit', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), studentController.commitStudentImport);
// ==================== SUBJECTS ====================
router.get('/subjects', auth_1.authenticate, subjectController.getSubjects);
router.post('/subjects', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), subjectController.createSubject);
router.put('/subjects/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), subjectController.updateSubject);
router.delete('/subjects/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), subjectController.deleteSubject);
// ==================== EXAMINATIONS ====================
router.get('/examinations', auth_1.authenticate, examinationController.getExaminations);
router.get('/examinations/:id/snapshot', auth_1.authenticate, examinationController.getExamSnapshot);
router.get('/examinations/:id', auth_1.authenticate, examinationController.getExaminationById);
router.post('/examinations', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.createExamination);
router.put('/examinations/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.updateExamination);
router.post('/examinations/:id/complete', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.completeExamination);
router.post('/examinations/:id/lock', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.lockExamination);
router.post('/examinations/:id/unlock', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.unlockExamination);
router.delete('/examinations/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), examinationController.deleteExamination);
// ==================== SCORES ====================
router.get('/scores/sheet', auth_1.authenticate, scoreController.getScoreSheet);
router.post('/scores/batch', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'TEACHER']), scoreController.batchSaveScores);
router.get('/scores/template', auth_1.authenticate, scoreController.downloadScoreTemplate);
router.post('/scores/import/preview', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'TEACHER']), upload.single('file'), scoreController.previewScoreImport);
router.post('/scores/import/commit', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'TEACHER']), scoreController.commitScoreImport);
// ==================== OMR PROCESSING ====================
router.post('/omr/scan', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'TEACHER']), upload.single('file'), omrController.scanOmrSheet);
router.post('/omr/save', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN', 'TEACHER']), omrController.saveOmrScores);
// ==================== RESULTS ====================
router.get('/results/student/:studentId/:examinationId', auth_1.authenticate, resultsController.getStudentResult);
router.get('/results/class/:examinationId', auth_1.authenticate, resultsController.getClassResults);
// ==================== ANALYTICS (MOCK PERFORMANCE INTELLIGENCE) ====================
router.get('/analytics/overview', auth_1.authenticate, analyticsController.getOverview);
router.get('/analytics/subject-trends', auth_1.authenticate, analyticsController.getSubjectTrends);
router.get('/analytics/mock-comparison', auth_1.authenticate, analyticsController.getMockComparison);
router.post('/analytics/compare-mocks', auth_1.authenticate, analyticsController.compareMultipleMocks);
router.get('/analytics/grade-distribution', auth_1.authenticate, analyticsController.getGradeDistribution);
router.get('/analytics/heatmap', auth_1.authenticate, analyticsController.getHeatmap);
router.get('/analytics/student/:studentId', auth_1.authenticate, analyticsController.getStudentAnalytics);
router.post('/analytics/compare-students', auth_1.authenticate, analyticsController.compareStudents);
router.get('/analytics/weak-areas', auth_1.authenticate, analyticsController.getWeakAreasAndAlerts);
router.get('/analytics/teacher-dashboard', auth_1.authenticate, (0, auth_1.authorize)(['TEACHER']), analyticsController.getTeacherDashboard);
// ==================== AUDIT LOGS ====================
router.get('/audit-logs', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), auditController.getAuditLogs);
// ==================== USER MANAGEMENT ====================
router.get('/users', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), userController.getUsers);
router.post('/users', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), userController.createUser);
router.put('/users/:id', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), userController.updateUser);
router.put('/users/:id/password', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), userController.resetUserPassword);
router.put('/users/:id/subjects', auth_1.authenticate, (0, auth_1.authorize)(['ADMIN']), userController.updateUserSubjects);
exports.default = router;
//# sourceMappingURL=api.js.map