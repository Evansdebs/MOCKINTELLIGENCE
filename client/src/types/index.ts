export type Role = 'ADMIN' | 'TEACHER' | 'MANAGEMENT' | 'STUDENT';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: Role;
  status: string;
}

export interface SchoolSettings {
  id: string;
  schoolName: string;
  logoUrl?: string;
  address?: string;
  telephone?: string;
  email?: string;
  academicYear: string;
  currentClass: string;
  motto?: string;
  headteacherName: string;
  enableRanking: boolean;
  passThreshold: number;
  stableThreshold: number;
  consecutiveDeclineAlertCount: number;
  consecutiveBelowTargetAlertCount: number;
}

export interface GradeScale {
  id: string;
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint?: number;
  remark: string;
  order: number;
}

export interface Student {
  id: string;
  studentId: string;
  indexNumber: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  gender: string;
  dateOfBirth?: string;
  class?: string;
  classId?: string;
  classRoom?: any;
  house?: string;
  photoUrl?: string;
  status: string;
  _count?: { scores: number };
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  maxScore: number;
  status: string;
  order: number;
}

export interface Examination {
  id: string;
  name: string;
  academicYear: string;
  description?: string;
  sequenceOrder: number;
  startDate?: string;
  endDate?: string;
  status: 'Draft' | 'Active' | 'Completed' | 'Locked';
  lockedAt?: string;
  lockedBy?: string;
  examinationSubjects?: { subject: Subject; maxScore: number }[];
  _count?: { scores: number };
}

export interface Score {
  id: string;
  studentId: string;
  examinationId: string;
  subjectId: string;
  rawScore: number | null;
  percentage: number | null;
  grade: string | null;
  gradePoint: number | null;
  remark: string | null;
  isVerified: boolean;
  subject?: Subject;
  student?: Student;
}

export type TrendStatus = 'Improving' | 'Declining' | 'Stable' | 'Fluctuating' | 'Insufficient Data';
