"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const grading_1 = require("../src/utils/grading");
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('--- Seeding Mock Performance Intelligence Database ---');
    // Clear existing records
    await prisma.score.deleteMany();
    await prisma.examinationSubject.deleteMany();
    await prisma.examination.deleteMany();
    await prisma.teacherSubject.deleteMany();
    await prisma.classRoom.deleteMany();
    await prisma.student.deleteMany();
    await prisma.subject.deleteMany();
    await prisma.gradeScale.deleteMany();
    await prisma.auditLog.deleteMany();
    await prisma.notification.deleteMany();
    await prisma.user.deleteMany();
    await prisma.schoolSettings.deleteMany();
    // 1. School Settings
    await prisma.schoolSettings.create({
        data: {
            id: 'default-settings',
            schoolName: 'Achimota Basic Model School',
            logoUrl: '',
            address: 'P.O. Box AH 123, Achimota, Accra - Ghana',
            telephone: '+233 (0) 24 555 0192',
            email: 'info@achimotabasic.edu.gh',
            academicYear: '2025/2026',
            currentClass: 'Basic 9',
            motto: 'Excellence, Character and Innovation',
            headteacherName: 'Dr. Kwame Mensah-Bonsu',
            enableRanking: true,
            passThreshold: 50.0,
            stableThreshold: 1.0,
            consecutiveDeclineAlertCount: 3,
            consecutiveBelowTargetAlertCount: 3,
        },
    });
    // 2. Grade Scales (Configurable)
    const gradeScalesData = [
        { grade: '1', minScore: 80, maxScore: 100, gradePoint: 1, remark: 'Highest', order: 0 },
        { grade: '2', minScore: 70, maxScore: 79.99, gradePoint: 2, remark: 'Higher', order: 1 },
        { grade: '3', minScore: 65, maxScore: 69.99, gradePoint: 3, remark: 'High', order: 2 },
        { grade: '4', minScore: 60, maxScore: 64.99, gradePoint: 4, remark: 'High Average', order: 3 },
        { grade: '5', minScore: 55, maxScore: 59.99, gradePoint: 5, remark: 'Average', order: 4 },
        { grade: '6', minScore: 50, maxScore: 54.99, gradePoint: 6, remark: 'Low Average', order: 5 },
        { grade: '7', minScore: 45, maxScore: 49.99, gradePoint: 7, remark: 'Low', order: 6 },
        { grade: '8', minScore: 40, maxScore: 44.99, gradePoint: 8, remark: 'Lower', order: 7 },
        { grade: '9', minScore: 0, maxScore: 39.99, gradePoint: 9, remark: 'Lowest', order: 8 },
    ];
    for (const scale of gradeScalesData) {
        await prisma.gradeScale.create({ data: scale });
    }
    // 3. Users with Roles
    const adminPassword = await bcryptjs_1.default.hash('Admin@123', 10);
    const teacherPassword = await bcryptjs_1.default.hash('Teacher@123', 10);
    const headPassword = await bcryptjs_1.default.hash('Head@123', 10);
    const admin = await prisma.user.create({
        data: {
            username: 'admin',
            email: 'admin@achimota.edu.gh',
            name: 'Mr. Emmanuel Osei (Admin)',
            passwordHash: adminPassword,
            role: 'ADMIN',
            status: 'Active',
        },
    });
    const teacher = await prisma.user.create({
        data: {
            username: 'teacher.evans',
            email: 'teacher.evans@achimota.edu.gh',
            name: 'Evans Kwakye (Maths Teacher)',
            passwordHash: teacherPassword,
            role: 'TEACHER',
            status: 'Active',
        },
    });
    const headteacher = await prisma.user.create({
        data: {
            username: 'headteacher',
            email: 'headteacher@achimota.edu.gh',
            name: 'Dr. Kwame Mensah-Bonsu (Headteacher)',
            passwordHash: headPassword,
            role: 'MANAGEMENT',
            status: 'Active',
        },
    });
    // 3b. ClassRooms
    const classA = await prisma.classRoom.create({ data: { name: 'Basic 9A', status: 'Active' } });
    const classB = await prisma.classRoom.create({ data: { name: 'Basic 9B', status: 'Active' } });
    // 4. Subjects (Basic 9 BECE Curriculum)
    const subjectsData = [
        { name: 'Mathematics', code: 'MATH', maxScore: 100, isCore: true, order: 0 },
        { name: 'English Language', code: 'ENG', maxScore: 100, isCore: true, order: 1 },
        { name: 'Integrated Science', code: 'SCI', maxScore: 100, isCore: true, order: 2 },
        { name: 'Social Studies', code: 'SOC', maxScore: 100, isCore: true, order: 3 },
        { name: 'Computing', code: 'COMP', maxScore: 100, isCore: false, order: 4 },
        { name: 'French', code: 'FREN', maxScore: 100, isCore: false, order: 5 },
        { name: 'Ghanaian Language (Twi)', code: 'GHA', maxScore: 100, isCore: false, order: 6 },
        { name: 'Religious & Moral Education', code: 'RME', maxScore: 100, isCore: false, order: 7 },
        { name: 'Career Technology', code: 'CTECH', maxScore: 100, isCore: false, order: 8 },
        { name: 'Creative Arts & Design', code: 'CAD', maxScore: 100, isCore: false, order: 9 },
    ];
    const createdSubjects = [];
    for (const s of subjectsData) {
        const sub = await prisma.subject.create({
            data: { ...s, status: 'Active' },
        });
        createdSubjects.push(sub);
    }
    // 4b. Assign Teacher to Subject
    const mathSubject = createdSubjects.find(s => s.code === 'MATH');
    if (mathSubject) {
        await prisma.teacherSubject.create({
            data: {
                userId: teacher.id,
                subjectId: mathSubject.id,
            }
        });
    }
    // 5. Examinations (Mocks 1 through 5)
    const examsData = [
        { name: '2026 Basic 9 Mock 1', sequenceOrder: 1, status: 'Completed', description: 'Diagnostic Baseline Mock Examination', startDate: new Date('2026-01-15'), endDate: new Date('2026-01-20') },
        { name: '2026 Basic 9 Mock 2', sequenceOrder: 2, status: 'Completed', description: 'Mid-Term Progress Mock Examination', startDate: new Date('2026-02-18'), endDate: new Date('2026-02-23') },
        { name: '2026 Basic 9 Mock 3', sequenceOrder: 3, status: 'Completed', description: 'Comprehensive Review Mock Examination', startDate: new Date('2026-03-24'), endDate: new Date('2026-03-29') },
        { name: '2026 Basic 9 Mock 4', sequenceOrder: 4, status: 'Completed', description: 'Intensive Pre-Final Mock Examination', startDate: new Date('2026-04-20'), endDate: new Date('2026-04-25') },
        { name: '2026 Basic 9 Mock 5', sequenceOrder: 5, status: 'Active', description: 'Grand Final Pre-BECE Mock Examination', startDate: new Date('2026-05-18'), endDate: new Date('2026-05-23') },
    ];
    const createdExams = [];
    for (const e of examsData) {
        const exam = await prisma.examination.create({
            data: {
                name: e.name,
                academicYear: '2025/2026',
                sequenceOrder: e.sequenceOrder,
                status: e.status,
                description: e.description,
                startDate: e.startDate,
                endDate: e.endDate,
                examinationSubjects: {
                    create: createdSubjects.map(sub => ({
                        subjectId: sub.id,
                        maxScore: sub.maxScore,
                    })),
                },
            },
        });
        createdExams.push(exam);
    }
    // 6. Students (Diverse profiles across Basic 9A and 9B)
    const rawStudents = [
        // Strong Improvment Profile: Daniel Mensah (42 -> 55 -> 64 -> 73 -> 82)
        { studentId: 'ACH/B9/001', indexNumber: '010203001', firstName: 'Daniel', lastName: 'Mensah', gender: 'Male', class: 'Basic 9A', house: 'Guggisberg House', pattern: 'IMPROVING' },
        // Persistent Decline Profile: Michael Tetteh (82 -> 74 -> 66 -> 57 -> 48)
        { studentId: 'ACH/B9/002', indexNumber: '010203002', firstName: 'Michael', lastName: 'Tetteh', gender: 'Male', class: 'Basic 9A', house: 'Aggrey House', pattern: 'DECLINING' },
        // Consistently High & Stable: Akosua Asante (84 -> 86 -> 85 -> 88 -> 89)
        { studentId: 'ACH/B9/003', indexNumber: '010203003', firstName: 'Akosua', middleName: 'Serwaa', lastName: 'Asante', gender: 'Female', class: 'Basic 9A', house: 'Fraser House', pattern: 'HIGH_STABLE' },
        // Fluctuating Profile: Kofi Adjei (54 -> 71 -> 52 -> 73 -> 60)
        { studentId: 'ACH/B9/004', indexNumber: '010203004', firstName: 'Kofi', lastName: 'Adjei', gender: 'Male', class: 'Basic 9A', house: 'Cadbury House', pattern: 'FLUCTUATING' },
        // Late Transfer Student: Abena Boateng (Transferred in Mock 3; M1 and M2 are null!)
        { studentId: 'ACH/B9/005', indexNumber: '010203005', firstName: 'Abena', middleName: 'Afriyie', lastName: 'Boateng', gender: 'Female', class: 'Basic 9A', house: 'Guggisberg House', pattern: 'LATE_TRANSFER' },
        // Moderate Improver: Kwame Darko (48 -> 54 -> 60 -> 66 -> 74)
        { studentId: 'ACH/B9/006', indexNumber: '010203006', firstName: 'Kwame', lastName: 'Darko', gender: 'Male', class: 'Basic 9B', house: 'Aggrey House', pattern: 'IMPROVING' },
        // Consistently Struggling: Yaw Owusu (35 -> 38 -> 36 -> 39 -> 41)
        { studentId: 'ACH/B9/007', indexNumber: '010203007', firstName: 'Yaw', lastName: 'Owusu', gender: 'Male', class: 'Basic 9B', house: 'Fraser House', pattern: 'LOW_STABLE' },
        // Good Performer with Strong STEM: Cynthia Addo (72 -> 75 -> 78 -> 82 -> 85)
        { studentId: 'ACH/B9/008', indexNumber: '010203008', firstName: 'Cynthia', lastName: 'Addo', gender: 'Female', class: 'Basic 9B', house: 'Cadbury House', pattern: 'IMPROVING' },
        // Mixed Pattern: English High, Math Low
        { studentId: 'ACH/B9/009', indexNumber: '010203009', firstName: 'Samuel', middleName: 'Kweku', lastName: 'Baffour', gender: 'Male', class: 'Basic 9B', house: 'Guggisberg House', pattern: 'MIXED' },
        // Typical Average Student: Esi Ansah (58 -> 61 -> 59 -> 64 -> 67)
        { studentId: 'ACH/B9/010', indexNumber: '010203010', firstName: 'Esi', lastName: 'Ansah', gender: 'Female', class: 'Basic 9A', house: 'Aggrey House', pattern: 'MODERATE_UP' },
        // Additional Active Students for realistic class distribution
        { studentId: 'ACH/B9/011', indexNumber: '010203011', firstName: 'Benjamin', lastName: 'Quaye', gender: 'Male', class: 'Basic 9A', house: 'Fraser House', pattern: 'MODERATE_UP' },
        { studentId: 'ACH/B9/012', indexNumber: '010203012', firstName: 'Grace', lastName: 'Acheampong', gender: 'Female', class: 'Basic 9A', house: 'Cadbury House', pattern: 'HIGH_STABLE' },
        { studentId: 'ACH/B9/013', indexNumber: '010203013', firstName: 'Prince', lastName: 'Ofori', gender: 'Male', class: 'Basic 9B', house: 'Guggisberg House', pattern: 'IMPROVING' },
        { studentId: 'ACH/B9/014', indexNumber: '010203014', firstName: 'Mavis', lastName: 'Donkor', gender: 'Female', class: 'Basic 9B', house: 'Aggrey House', pattern: 'FLUCTUATING' },
        { studentId: 'ACH/B9/015', indexNumber: '010203015', firstName: 'Joshua', lastName: 'Nyarko', gender: 'Male', class: 'Basic 9B', house: 'Fraser House', pattern: 'DECLINING' },
    ];
    const createdStudents = [];
    for (const st of rawStudents) {
        const fullName = [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' ');
        const classRoomId = st.class === 'Basic 9A' ? classA.id : classB.id;
        const s = await prisma.student.create({
            data: {
                studentId: st.studentId,
                indexNumber: st.indexNumber,
                firstName: st.firstName,
                middleName: st.middleName || null,
                lastName: st.lastName,
                fullName,
                gender: st.gender,
                classId: classRoomId,
                house: st.house,
                status: 'Active',
            },
        });
        createdStudents.push({ ...s, pattern: st.pattern });
    }
    // 7. Generate Scores for all 5 Mocks
    console.log('Generating realistic examination scores...');
    const gradeScales = await prisma.gradeScale.findMany({ orderBy: { order: 'asc' } });
    for (let mockIndex = 0; mockIndex < createdExams.length; mockIndex++) {
        const exam = createdExams[mockIndex];
        for (const student of createdStudents) {
            // Handle late transfer (joined at Mock 3: index 2)
            if (student.pattern === 'LATE_TRANSFER' && mockIndex < 2) {
                // Do NOT create zero score! Store nothing or null (Requirements #61 & #62)
                continue;
            }
            for (const subject of createdSubjects) {
                // Occasional student absence in 1 subject (properly null / skipped)
                if (student.studentId === 'ACH/B9/004' && subject.code === 'FREN' && mockIndex === 1) {
                    // Absent in French during Mock 2
                    continue;
                }
                let baseScore = 50;
                switch (student.pattern) {
                    case 'IMPROVING':
                        // Steadily improving from ~42 to ~82
                        baseScore = 42 + (mockIndex * 10) + ((subject.order % 3) * 2 - 2);
                        break;
                    case 'DECLINING':
                        // Steadily declining from ~82 to ~46
                        baseScore = 82 - (mockIndex * 9) + ((subject.order % 2) * 2);
                        break;
                    case 'HIGH_STABLE':
                        // Consistently ~84-89
                        baseScore = 84 + (mockIndex % 3) + ((subject.order % 4) - 1);
                        break;
                    case 'LOW_STABLE':
                        // Persistent difficulty ~35-42
                        baseScore = 35 + (mockIndex % 2) * 3 + ((subject.order % 3) - 1);
                        break;
                    case 'FLUCTUATING':
                        // Ups and downs
                        const fluc = [54, 71, 52, 73, 60];
                        baseScore = fluc[mockIndex] + ((subject.order % 3) * 3 - 3);
                        break;
                    case 'LATE_TRANSFER':
                        // Joined in Mock 3 (mockIndex 2, 3, 4)
                        baseScore = 60 + ((mockIndex - 2) * 8) + (subject.order % 3);
                        break;
                    case 'MIXED':
                        if (subject.code === 'MATH' || subject.code === 'SCI') {
                            baseScore = 44 + mockIndex * 2; // Math deficit
                        }
                        else if (subject.code === 'ENG' || subject.code === 'SOC') {
                            baseScore = 76 + mockIndex * 2; // Strong humanities
                        }
                        else {
                            baseScore = 60 + mockIndex * 3;
                        }
                        break;
                    case 'MODERATE_UP':
                    default:
                        baseScore = 52 + (mockIndex * 4) + ((subject.order % 4) * 2 - 2);
                        break;
                }
                // Clamp between 0 and 100
                const finalScore = Math.max(15, Math.min(98, Math.round(baseScore)));
                const gradeResult = (0, grading_1.calculateGradeForScore)(finalScore, subject.maxScore, gradeScales);
                await prisma.score.create({
                    data: {
                        studentId: student.id,
                        examinationId: exam.id,
                        subjectId: subject.id,
                        rawScore: gradeResult.rawScore,
                        percentage: gradeResult.percentage,
                        grade: gradeResult.grade,
                        gradePoint: gradeResult.gradePoint,
                        remark: gradeResult.remark,
                        isVerified: true,
                    },
                });
            }
        }
    }
    // 8. Initial Audit Logs
    await prisma.auditLog.createMany({
        data: [
            {
                userName: 'System Initialization',
                action: 'SYSTEM_SETUP',
                recordType: 'SchoolSettings',
                newValue: 'Initialized Achimota Basic Model School Examination Intelligence System',
            },
            {
                userName: admin.name,
                action: 'CREATE_EXAMINATION',
                recordType: 'Examination',
                newValue: 'Created Mock Examinations 1 through 5 for Academic Year 2025/2026',
            },
            {
                userName: teacher.name,
                action: 'BATCH_SCORE_UPDATE',
                recordType: 'Score',
                newValue: 'Verified and saved scores for Mock 1 through Mock 4',
            },
        ],
    });
    // 9. Initial In-App Notifications
    await prisma.notification.createMany({
        data: [
            {
                title: 'System Ready for BECE Preparation',
                message: 'Mock Performance Intelligence is configured with 5 completed/active Basic 9 mock examinations.',
                type: 'success',
            },
            {
                title: 'Score Verification Notice',
                message: '2026 Basic 9 Mock 4 examination scores have been verified and locked for reporting.',
                type: 'info',
            },
        ],
    });
    console.log('✅ Database seeded successfully with realistic Ghanaian Basic 9 Mock Examination data!');
}
main()
    .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
