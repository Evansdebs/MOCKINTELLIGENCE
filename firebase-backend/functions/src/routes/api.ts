import { Router } from 'express';
import multer from 'multer';
import { authenticate, authorize } from '../middleware/auth';
import * as authController from '../controllers/authController';
import * as schoolController from '../controllers/schoolController';
import * as studentController from '../controllers/studentController';
import * as classRoomController from '../controllers/classRoomController';
import * as subjectController from '../controllers/subjectController';
import * as examinationController from '../controllers/examinationController';
import * as scoreController from '../controllers/scoreController';
import * as resultsController from '../controllers/resultsController';
import * as analyticsController from '../controllers/analyticsController';
import * as auditController from '../controllers/auditController';
import * as userController from '../controllers/userController';
import * as omrController from '../controllers/omrController';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

const router = Router();

// ==================== AUTHENTICATION ====================
router.post('/auth/login', authController.login);
router.post('/auth/student-login', authController.studentLogin);
router.get('/auth/me', authenticate, authController.me);

// ==================== SCHOOL SETTINGS & GRADES ====================
router.get('/settings', authenticate, schoolController.getSettings);
router.put('/settings', authenticate, authorize(['ADMIN', 'MANAGEMENT', 'TEACHER']), schoolController.updateSettings);
router.put('/settings/grades', authenticate, authorize(['ADMIN', 'MANAGEMENT']), schoolController.updateGradeScales);

// ==================== CLASSROOMS ====================
router.get('/classrooms', authenticate, classRoomController.getClassRooms);
router.post('/classrooms', authenticate, authorize(['ADMIN']), classRoomController.createClassRoom);
router.put('/classrooms/:id', authenticate, authorize(['ADMIN']), classRoomController.updateClassRoom);
router.delete('/classrooms/:id', authenticate, authorize(['ADMIN']), classRoomController.deleteClassRoom);

// ==================== STUDENTS ====================
router.get('/students', authenticate, studentController.getStudents);
router.get('/students/export/excel', authenticate, studentController.exportStudentsExcel);
router.get('/students/:id', authenticate, studentController.getStudentById);
router.post('/students', authenticate, authorize(['ADMIN']), studentController.createStudent);
router.put('/students/:id', authenticate, authorize(['ADMIN']), studentController.updateStudent);
router.delete('/students/:id', authenticate, authorize(['ADMIN']), studentController.deleteStudent);
router.post('/students/import/preview', authenticate, authorize(['ADMIN']), upload.single('file'), studentController.previewStudentImport);
router.post('/students/import/commit', authenticate, authorize(['ADMIN']), studentController.commitStudentImport);

// ==================== SUBJECTS ====================
router.get('/subjects', authenticate, subjectController.getSubjects);
router.post('/subjects', authenticate, authorize(['ADMIN']), subjectController.createSubject);
router.put('/subjects/:id', authenticate, authorize(['ADMIN']), subjectController.updateSubject);
router.delete('/subjects/:id', authenticate, authorize(['ADMIN']), subjectController.deleteSubject);

// ==================== EXAMINATIONS ====================
router.get('/examinations', authenticate, examinationController.getExaminations);
router.get('/examinations/:id/snapshot', authenticate, examinationController.getExamSnapshot);
router.get('/examinations/:id', authenticate, examinationController.getExaminationById);
router.post('/examinations', authenticate, authorize(['ADMIN']), examinationController.createExamination);
router.put('/examinations/:id', authenticate, authorize(['ADMIN']), examinationController.updateExamination);
router.post('/examinations/:id/complete', authenticate, authorize(['ADMIN']), examinationController.completeExamination);
router.post('/examinations/:id/lock', authenticate, authorize(['ADMIN']), examinationController.lockExamination);
router.post('/examinations/:id/unlock', authenticate, authorize(['ADMIN']), examinationController.unlockExamination);
router.delete('/examinations/:id', authenticate, authorize(['ADMIN']), examinationController.deleteExamination);

// ==================== SCORES ====================
router.get('/scores/sheet', authenticate, scoreController.getScoreSheet);
router.post('/scores/batch', authenticate, authorize(['ADMIN', 'TEACHER']), scoreController.batchSaveScores);
router.get('/scores/template', authenticate, scoreController.downloadScoreTemplate);
router.post('/scores/import/preview', authenticate, authorize(['ADMIN', 'TEACHER']), upload.single('file'), scoreController.previewScoreImport);
router.post('/scores/import/commit', authenticate, authorize(['ADMIN', 'TEACHER']), scoreController.commitScoreImport);

// ==================== OMR PROCESSING ====================
router.post('/omr/scan', authenticate, authorize(['ADMIN', 'TEACHER']), upload.single('file'), omrController.scanOmrSheet);
router.post('/omr/save', authenticate, authorize(['ADMIN', 'TEACHER']), omrController.saveOmrScores);

// ==================== RESULTS ====================
router.get('/results/student/:studentId/:examinationId', authenticate, resultsController.getStudentResult);
router.get('/results/class/:examinationId', authenticate, resultsController.getClassResults);

// ==================== ANALYTICS (MOCK PERFORMANCE INTELLIGENCE) ====================
router.get('/analytics/overview', authenticate, analyticsController.getOverview);
router.get('/analytics/subject-trends', authenticate, analyticsController.getSubjectTrends);
router.get('/analytics/mock-comparison', authenticate, analyticsController.getMockComparison);
router.post('/analytics/compare-mocks', authenticate, analyticsController.compareMultipleMocks);
router.get('/analytics/grade-distribution', authenticate, analyticsController.getGradeDistribution);
router.get('/analytics/heatmap', authenticate, analyticsController.getHeatmap);
router.get('/analytics/student/:studentId', authenticate, analyticsController.getStudentAnalytics);
router.post('/analytics/compare-students', authenticate, analyticsController.compareStudents);
router.get('/analytics/weak-areas', authenticate, analyticsController.getWeakAreasAndAlerts);
router.get('/analytics/teacher-dashboard', authenticate, authorize(['TEACHER']), analyticsController.getTeacherDashboard);

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', authenticate, authorize(['ADMIN']), auditController.getAuditLogs);

// ==================== USER MANAGEMENT ====================
router.get('/users', authenticate, authorize(['ADMIN']), userController.getUsers);
router.post('/users', authenticate, authorize(['ADMIN']), userController.createUser);
router.put('/users/:id', authenticate, authorize(['ADMIN']), userController.updateUser);
router.put('/users/:id/password', authenticate, authorize(['ADMIN']), userController.resetUserPassword);
router.put('/users/:id/subjects', authenticate, authorize(['ADMIN']), userController.updateUserSubjects);

export default router;
