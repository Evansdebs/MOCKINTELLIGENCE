"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.saveOmrScores = exports.scanOmrSheet = void 0;
const index_1 = require("../index");
const grading_1 = require("../utils/grading");
const scanOmrSheet = async (req, res) => {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No image provided for OMR scanning' });
            return;
        }
        // Simulate image processing time for realistic UI feedback
        await new Promise((resolve) => setTimeout(resolve, 2000));
        // Mock extraction data
        const rawScore = Math.floor(Math.random() * 40) + 10; // random score out of 40
        res.json({
            success: true,
            data: {
                extractedIndexNumber: 'B9-2026-001',
                confidence: 94.5,
                rawScore: rawScore,
                maxScore: 40,
                answers: Array.from({ length: 40 }).map((_, i) => {
                    const isCorrect = Math.random() > 0.4;
                    return {
                        question: i + 1,
                        marked: isCorrect ? 'A' : ['B', 'C', 'D'][Math.floor(Math.random() * 3)],
                        isCorrect: isCorrect
                    };
                })
            }
        });
    }
    catch (error) {
        console.error('OMR Scan error:', error);
        res.status(500).json({ error: 'Failed to process OMR sheet' });
    }
};
exports.scanOmrSheet = scanOmrSheet;
const saveOmrScores = async (req, res) => {
    try {
        const { studentId, examinationId, subjectId, rawScore } = req.body;
        const subjectDoc = await index_1.db.collection('subjects').doc(subjectId).get();
        if (!subjectDoc.exists) {
            res.status(404).json({ error: 'Subject not found' });
            return;
        }
        const subject = Object.assign({ id: subjectDoc.id }, subjectDoc.data());
        const gradeScalesSnap = await index_1.db.collection('gradeScales').orderBy('order', 'asc').get();
        const gradeScales = gradeScalesSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const scoreResult = (0, grading_1.calculateGradeForScore)(rawScore, subject.maxScore, gradeScales);
        // Use compound document ID for upsert
        const docId = `${examinationId}_${studentId}_${subjectId}`;
        const scoreData = {
            studentId,
            examinationId,
            subjectId,
            rawScore: scoreResult.rawScore,
            percentage: scoreResult.percentage,
            grade: scoreResult.grade,
            gradePoint: scoreResult.gradePoint,
            remark: scoreResult.remark,
            isVerified: true,
            updatedAt: new Date().toISOString(),
        };
        await index_1.db.collection('scores').doc(docId).set(scoreData, { merge: true });
        const score = Object.assign({ id: docId }, scoreData);
        res.json(score);
    }
    catch (error) {
        console.error('Save OMR score error:', error);
        res.status(500).json({ error: 'Failed to save OMR score' });
    }
};
exports.saveOmrScores = saveOmrScores;
//# sourceMappingURL=omrController.js.map