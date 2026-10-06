import { Request, Response } from 'express';
import { db } from '../index';
import { calculateGradeForScore } from '../utils/grading';

export const scanOmrSheet = async (req: Request, res: Response): Promise<void> => {
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
  } catch (error) {
    console.error('OMR Scan error:', error);
    res.status(500).json({ error: 'Failed to process OMR sheet' });
  }
};

export const saveOmrScores = async (req: Request, res: Response): Promise<void> => {
  try {
    const { studentId, examinationId, subjectId, rawScore } = req.body;

    const subjectDoc = await db.collection('subjects').doc(subjectId).get();
    if (!subjectDoc.exists) {
      res.status(404).json({ error: 'Subject not found' });
      return;
    }
    const subject = { id: subjectDoc.id, ...subjectDoc.data() } as any;

    const gradeScalesSnap = await db.collection('gradeScales').orderBy('order', 'asc').get();
    const gradeScales = gradeScalesSnap.docs.map(d => ({ id: d.id, ...d.data() })) as any[];

    const scoreResult = calculateGradeForScore(rawScore, subject.maxScore, gradeScales);

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

    await db.collection('scores').doc(docId).set(scoreData, { merge: true });
    const score = { id: docId, ...scoreData };

    res.json(score);
  } catch (error) {
    console.error('Save OMR score error:', error);
    res.status(500).json({ error: 'Failed to save OMR score' });
  }
};
