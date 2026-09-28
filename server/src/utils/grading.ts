import { GradeDefinition, ScoreCalculationResult, TrendStatus } from '../types';

export function calculateGradeForScore(
  rawScore: number | null | undefined,
  maxScore: number = 100,
  gradeScales: GradeDefinition[]
): ScoreCalculationResult {
  if (rawScore === null || rawScore === undefined || isNaN(rawScore)) {
    return {
      rawScore: null,
      percentage: null,
      grade: null,
      gradePoint: null,
      remark: null,
    };
  }

  // Calculate percentage based on maxScore
  const percentage = Math.round(((rawScore / (maxScore || 100)) * 100) * 10) / 10;

  // Find matching grade
  const matched = gradeScales.find(
    (scale) => percentage >= scale.minScore && percentage <= scale.maxScore
  );

  if (matched) {
    return {
      rawScore,
      percentage,
      grade: matched.grade,
      gradePoint: matched.gradePoint,
      remark: matched.remark,
    };
  }

  // Fallback if slightly out of bounds due to rounding
  if (percentage >= 100 && gradeScales.length > 0) {
    const highest = [...gradeScales].sort((a, b) => b.maxScore - a.maxScore)[0];
    return {
      rawScore,
      percentage: 100,
      grade: highest.grade,
      gradePoint: highest.gradePoint,
      remark: highest.remark,
    };
  }

  return {
    rawScore,
    percentage,
    grade: 'F',
    gradePoint: 9,
    remark: 'Unsatisfactory',
  };
}

export function determineChangeStatus(
  diff: number,
  stableThreshold: number = 1.0
): 'Improving' | 'Declining' | 'Stable' {
  if (Math.abs(diff) <= stableThreshold) {
    return 'Stable';
  }
  return diff > 0 ? 'Improving' : 'Declining';
}

/**
 * Calculates long term trend across an ordered sequence of percentages
 */
export function calculateLongTermTrend(
  percentages: (number | null)[],
  stableThreshold: number = 1.0
): TrendStatus {
  const validScores = percentages.filter((p): p is number => p !== null && p !== undefined);

  if (validScores.length < 3) {
    return 'Insufficient Data';
  }

  let isStrictlyImproving = true;
  let isStrictlyDeclining = true;
  let isStable = true;

  const firstScore = validScores[0];
  const lastScore = validScores[validScores.length - 1];
  const overallDiff = lastScore - firstScore;

  for (let i = 1; i < validScores.length; i++) {
    const stepDiff = validScores[i] - validScores[i - 1];

    if (stepDiff < -stableThreshold) {
      isStrictlyImproving = false;
    }
    if (stepDiff > stableThreshold) {
      isStrictlyDeclining = false;
    }
    if (Math.abs(validScores[i] - firstScore) > stableThreshold * 2) {
      isStable = false;
    }
  }

  if (isStrictlyImproving && overallDiff > stableThreshold) {
    return 'Improving';
  }

  if (isStrictlyDeclining && overallDiff < -stableThreshold) {
    return 'Declining';
  }

  if (isStable) {
    return 'Stable';
  }

  return 'Fluctuating';
}
