"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateAggregate = calculateAggregate;
exports.calculateGradeForScore = calculateGradeForScore;
exports.determineChangeStatus = determineChangeStatus;
exports.calculateLongTermTrend = calculateLongTermTrend;
function calculateAggregate(scores) {
    let aggregate = 0;
    let coreCount = 0;
    let totalCores = scores.filter(s => s.isCore).length; // Depending on how many cores the student took? No, total cores set by admin. Let's assume the caller passes the required core count or we check how many they passed.
    // Actually, the caller just passes the scores. A subject is core if isCore is true.
    const otherScores = [];
    for (const s of scores) {
        if (s.gradePoint === null || s.gradePoint === undefined)
            continue;
        if (s.isCore) {
            aggregate += s.gradePoint;
            coreCount++;
        }
        else {
            otherScores.push(s.gradePoint);
        }
    }
    // If they don't have enough core subjects, wait, how many cores? We can't hardcode 4 anymore. 
    // Let's assume if they miss ANY core subject, they get null. But we don't know total cores here.
    // We'll let the caller decide if the aggregate is valid. We'll just calculate based on what they have.
    // Wait, the prompt: "looks for other two subjewcts with best aggragtes and add"
    // So we add all their core subjects' grade points, plus the best 2 of the remaining.
    if (otherScores.length < 2) {
        return null;
    }
    otherScores.sort((a, b) => a - b);
    aggregate += otherScores[0] + otherScores[1];
    return aggregate;
}
function calculateGradeForScore(rawScore, maxScore = 100, gradeScales) {
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
    const matched = gradeScales.find((scale) => percentage >= scale.minScore && percentage <= scale.maxScore);
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
function determineChangeStatus(diff, stableThreshold = 1.0) {
    if (Math.abs(diff) <= stableThreshold) {
        return 'Stable';
    }
    return diff > 0 ? 'Improving' : 'Declining';
}
/**
 * Calculates long term trend across an ordered sequence of percentages
 */
function calculateLongTermTrend(percentages, stableThreshold = 1.0) {
    const validScores = percentages.filter((p) => p !== null && p !== undefined);
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
//# sourceMappingURL=grading.js.map