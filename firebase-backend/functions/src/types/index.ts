export type Role = 'ADMIN' | 'TEACHER' | 'MANAGEMENT' | 'STUDENT';

export interface UserTokenPayload {
  userId: string;
  username: string;
  name: string;
  email: string;
  role: Role;
}

export type TrendStatus = 'Improving' | 'Declining' | 'Stable' | 'Fluctuating' | 'Insufficient Data';

export interface GradeDefinition {
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint: number | null;
  remark: string;
  order: number;
}

export interface ScoreCalculationResult {
  rawScore: number | null;
  percentage: number | null;
  grade: string | null;
  gradePoint: number | null;
  remark: string | null;
}
