/// <reference types="node" />
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Mock Performance Intelligence Database for Production ---');

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
      schoolName: 'Your School Name',
      logoUrl: '',
      address: 'School Address',
      telephone: '',
      email: 'info@school.edu',
      academicYear: '2025/2026',
      currentClass: 'Basic 9',
      motto: '',
      headteacherName: '',
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

  // 3. Admin User
  const adminPassword = await bcrypt.hash('Admin@123', 10);

  const admin = await prisma.user.create({
    data: {
      username: 'admin',
      email: 'admin@school.edu',
      name: 'System Admin',
      passwordHash: adminPassword,
      role: 'ADMIN',
      status: 'Active',
    },
  });

  // 8. Initial Audit Logs
  await prisma.auditLog.createMany({
    data: [
      {
        userName: 'System Initialization',
        action: 'SYSTEM_SETUP',
        recordType: 'SchoolSettings',
        newValue: 'Initialized Performance Intelligence System',
      }
    ],
  });

  console.log('✅ Database seeded successfully with production configuration!');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
