import { Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';
import { calculateGradeForScore } from '../utils/grading';

/**
 * Get score entry matrix for an examination and optional subject/class
 */
export async function getScoreSheet(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, subjectId, classId: classFilter } = req.query;

    if (!examinationId) {
      res.status(400).json({ error: 'examinationId is required.' });
      return;
    }

    const exam = await prisma.examination.findUnique({
      where: { id: String(examinationId) },
      include: {
        examinationSubjects: {
          include: { subject: true },
        },
      },
    });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    const settings = await prisma.schoolSettings.findFirst();

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = String(classFilter);
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { classRoom: true },
      orderBy: [{ classRoom: { name: 'asc' } }, { fullName: 'asc' }],
    });

    const scoreWhere: any = {
      examinationId: String(examinationId),
      student: studentWhere,
    };
    if (subjectId && subjectId !== 'all') {
      scoreWhere.subjectId = String(subjectId);
    }

    const existingScores = await prisma.score.findMany({
      where: scoreWhere,
      include: { subject: true },
    });

    // Subject definitions
    const subjects = exam.examinationSubjects
      .map(es => es.subject)
      .filter(s => (subjectId && subjectId !== 'all' ? s.id === subjectId : true));

    // Construct matrix
    const scoreMap: Record<string, any> = {};
    existingScores.forEach(s => {
      scoreMap[`${s.studentId}_${s.subjectId}`] = s;
    });

    const rows = students.map(student => {
      const studentScores: Record<string, any> = {};
      subjects.forEach(sub => {
        studentScores[sub.id] = scoreMap[`${student.id}_${sub.id}`] || null;
      });

      return {
        student: {
          id: student.id,
          studentId: student.studentId,
          indexNumber: student.indexNumber,
          fullName: student.fullName,
          class: student.classRoom?.name,
          gender: student.gender,
        },
        scores: studentScores,
      };
    });

    res.json({
      examination: {
        id: exam.id,
        name: exam.name,
        status: exam.status,
        isLocked: exam.status === 'Locked',
      },
      settings: {
        teachersCanEditScores: settings?.teachersCanEditScores ?? true,
      },
      subjects,
      rows,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load score sheet.' });
  }
}

/**
 * Save / Update a batch of scores (used for spreadsheet auto-save and manual save)
 */
export async function batchSaveScores(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, scores } = req.body;

    if (!examinationId || !Array.isArray(scores)) {
      res.status(400).json({ error: 'examinationId and scores array are required.' });
      return;
    }

    const exam = await prisma.examination.findUnique({
      where: { id: examinationId },
    });

    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    // Role check for teachers
    if (req.user?.role === 'TEACHER') {
      const assignedSubjects = await prisma.teacherSubject.findMany({
        where: { userId: req.user.userId }
      });
      const assignedSubjectIds = new Set(assignedSubjects.map(ts => ts.subjectId));
      const submittedSubjectIds = new Set(scores.map(s => s.subjectId));
      for (const id of submittedSubjectIds) {
        if (!assignedSubjectIds.has(id)) {
          res.status(403).json({ error: 'You are not assigned to one or more of these subjects.' });
          return;
        }
      }
    }

    // Role and lock check: teachers and admins cannot edit locked exams
    if (exam.status === 'Locked') {
      res.status(403).json({
        error: `Examination "${exam.name}" is locked. Modification of scores is prohibited. Unlock examination to make changes.`,
      });
      return;
    }

    const settings = await prisma.schoolSettings.findFirst();
    if (req.user?.role === 'TEACHER' && settings?.teachersCanEditScores === false) {
      res.status(403).json({ error: 'Score entry is currently disabled by administration.' });
      return;
    }

    const gradeScales = await prisma.gradeScale.findMany({
      orderBy: { order: 'asc' },
    });

    const subjects = await prisma.subject.findMany();
    const subjectMap = new Map(subjects.map(s => [s.id, s]));

    const validationErrors: string[] = [];
    const savedScores: any[] = [];

    // Process each score entry
    for (let i = 0; i < scores.length; i++) {
      const item = scores[i];
      const { studentId, subjectId, rawScore } = item;

      if (!studentId || !subjectId) {
        validationErrors.push(`Row ${i + 1}: Missing studentId or subjectId`);
        continue;
      }

      const subject = subjectMap.get(subjectId);
      const maxScore = subject?.maxScore || 100;

      // Handle null/empty (absent or not taken)
      if (rawScore === null || rawScore === undefined || rawScore === '') {
        const deleted = await prisma.score.deleteMany({
          where: { studentId, examinationId, subjectId },
        });
        continue;
      }

      const numericScore = Number(rawScore);

      // Validate numeric score
      if (isNaN(numericScore)) {
        validationErrors.push(`Student score must be a valid number, received: "${rawScore}"`);
        continue;
      }

      if (numericScore < 0) {
        validationErrors.push(`Negative scores are not permitted: ${numericScore}`);
        continue;
      }

      if (numericScore > maxScore) {
        validationErrors.push(`Score ${numericScore} exceeds maximum permissible score of ${maxScore} for ${subject?.name || 'subject'}`);
        continue;
      }

      // Calculate grade and percentage
      const gradeResult = calculateGradeForScore(numericScore, maxScore, gradeScales as any);

      // Upsert into database
      const upserted = await prisma.score.upsert({
        where: {
          studentId_examinationId_subjectId: {
            studentId,
            examinationId,
            subjectId,
          },
        },
        create: {
          studentId,
          examinationId,
          subjectId,
          rawScore: gradeResult.rawScore,
          percentage: gradeResult.percentage,
          grade: gradeResult.grade,
          gradePoint: gradeResult.gradePoint,
          remark: gradeResult.remark,
          isVerified: true,
        },
        update: {
          rawScore: gradeResult.rawScore,
          percentage: gradeResult.percentage,
          grade: gradeResult.grade,
          gradePoint: gradeResult.gradePoint,
          remark: gradeResult.remark,
          isVerified: true,
        },
      });

      savedScores.push(upserted);
    }

    if (savedScores.length > 0) {
      await logAudit({
        userId: req.user?.userId,
        userName: req.user?.name || 'User',
        action: 'BATCH_SCORE_UPDATE',
        recordType: 'Score',
        recordId: examinationId,
        newValue: `Saved/updated ${savedScores.length} score entries for exam: ${exam.name}`,
        ipAddress: req.ip,
      });
    }

    res.json({
      message: `Successfully saved ${savedScores.length} scores.`,
      savedCount: savedScores.length,
      errors: validationErrors,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to save scores.' });
  }
}

/**
 * Preview Excel score file with comprehensive validation
 */
export async function previewScoreImport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, subjectId } = req.body;

    if (!req.file) {
      res.status(400).json({ error: 'Please upload an Excel file.' });
      return;
    }

    if (!examinationId || !subjectId) {
      res.status(400).json({ error: 'examinationId and subjectId are required.' });
      return;
    }

    const exam = await prisma.examination.findUnique({ where: { id: examinationId } });
    if (!exam) {
      res.status(404).json({ error: 'Examination not found.' });
      return;
    }

    if (exam.status === 'Locked') {
      res.status(403).json({ error: `Cannot import scores. Examination "${exam.name}" is locked.` });
      return;
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    if (req.user?.role === 'TEACHER') {
      const isAssigned = await prisma.teacherSubject.findFirst({
        where: { userId: req.user.userId, subjectId }
      });
      if (!isAssigned) {
        res.status(403).json({ error: 'You are not authorized to import scores for this subject.' });
        return;
      }
    }

    const maxScore = subject.maxScore || 100;
    const gradeScales = await prisma.gradeScale.findMany({ orderBy: { order: 'asc' } });

    // Parse Excel
    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      res.status(400).json({ error: 'Uploaded sheet contains no rows.' });
      return;
    }

    const students = await prisma.student.findMany({
      where: { status: 'Active' },
      include: { classRoom: true },
    });
    const studentByIndex = new Map(students.map(s => [s.indexNumber.toLowerCase().trim(), s]));

    const seenIndices = new Set<string>();
    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    rawRows.forEach((row, i) => {
      const rowNum = i + 2;
      const indexNumber = String(
        row['Index Number'] || row['indexNumber'] || row['Index'] || row['INDEX'] || ''
      ).trim();
      const rawScoreVal = row['Score'] ?? row['score'] ?? row['Mark'] ?? row['RAW SCORE'];
      const studentNameInFile = String(row['Student Name'] || row['Name'] || '').trim();

      const errors: string[] = [];

      if (!indexNumber) {
        errors.push('Missing Index Number');
      }

      const idxKey = indexNumber.toLowerCase();
      const student = studentByIndex.get(idxKey);

      if (indexNumber && !student) {
        errors.push(`Unknown index number "${indexNumber}" - no matching active student found`);
      }

      if (indexNumber && seenIndices.has(idxKey)) {
        errors.push(`Duplicate record for index number "${indexNumber}" in sheet`);
      }
      if (indexNumber) seenIndices.add(idxKey);

      let numericScore: number | null = null;
      if (rawScoreVal === null || rawScoreVal === undefined || rawScoreVal === '') {
        errors.push('Missing score value');
      } else {
        numericScore = Number(rawScoreVal);
        if (isNaN(numericScore)) {
          errors.push(`Score must be a number, received: "${rawScoreVal}"`);
        } else if (numericScore < 0) {
          errors.push(`Negative score not allowed: ${numericScore}`);
        } else if (numericScore > maxScore) {
          errors.push(`Score ${numericScore} exceeds maximum allowed (${maxScore})`);
        }
      }

      const gradeInfo = numericScore !== null && !isNaN(numericScore)
        ? calculateGradeForScore(numericScore, maxScore, gradeScales as any)
        : null;

      const record = {
        rowNum,
        indexNumber,
        studentName: student ? student.fullName : (studentNameInFile || 'Unknown'),
        studentId: student ? student.id : null,
        class: student ? student.classRoom?.name : '—',
        score: numericScore,
        percentage: gradeInfo?.percentage ?? null,
        grade: gradeInfo?.grade ?? null,
        remark: gradeInfo?.remark ?? null,
      };

      if (errors.length > 0) {
        invalidRecords.push({ ...record, errors });
      } else {
        validRecords.push(record);
      }
    });

    res.json({
      examinationName: exam.name,
      subjectName: subject.name,
      maxScore,
      totalFound: rawRows.length,
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      validRecords,
      invalidRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Excel processing error: ' + err.message });
  }
}

/**
 * Commit validated score import
 */
export async function commitScoreImport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { examinationId, subjectId, records } = req.body;

    if (!examinationId || !subjectId || !Array.isArray(records)) {
      res.status(400).json({ error: 'examinationId, subjectId, and records are required.' });
      return;
    }

    const exam = await prisma.examination.findUnique({ where: { id: examinationId } });
    if (!exam || exam.status === 'Locked') {
      res.status(403).json({ error: 'Examination is locked or invalid.' });
      return;
    }

    const subject = await prisma.subject.findUnique({ where: { id: subjectId } });
    if (!subject) {
      res.status(404).json({ error: 'Subject not found.' });
      return;
    }

    if (req.user?.role === 'TEACHER') {
      const isAssigned = await prisma.teacherSubject.findFirst({
        where: { userId: req.user.userId, subjectId }
      });
      if (!isAssigned) {
        res.status(403).json({ error: 'You are not authorized to enter scores for this subject.' });
        return;
      }
    }

    const gradeScales = await prisma.gradeScale.findMany({ orderBy: { order: 'asc' } });
    const maxScore = subject.maxScore || 100;

    let importedCount = 0;
    for (const rec of records) {
      if (!rec.studentId || rec.score === null || rec.score === undefined) continue;

      const scoreNum = Number(rec.score);
      if (isNaN(scoreNum) || scoreNum < 0 || scoreNum > maxScore) continue;

      const gradeInfo = calculateGradeForScore(scoreNum, maxScore, gradeScales as any);

      await prisma.score.upsert({
        where: {
          studentId_examinationId_subjectId: {
            studentId: rec.studentId,
            examinationId,
            subjectId,
          },
        },
        create: {
          studentId: rec.studentId,
          examinationId,
          subjectId,
          rawScore: gradeInfo.rawScore,
          percentage: gradeInfo.percentage,
          grade: gradeInfo.grade,
          gradePoint: gradeInfo.gradePoint,
          remark: gradeInfo.remark,
          isVerified: true,
        },
        update: {
          rawScore: gradeInfo.rawScore,
          percentage: gradeInfo.percentage,
          grade: gradeInfo.grade,
          gradePoint: gradeInfo.gradePoint,
          remark: gradeInfo.remark,
          isVerified: true,
        },
      });

      importedCount++;
    }

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'User',
      action: 'EXCEL_SCORE_IMPORT',
      recordType: 'Score',
      recordId: examinationId,
      newValue: `Imported ${importedCount} scores for ${subject.name} in ${exam.name}`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${importedCount} scores.`,
      importedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
}

/**
 * Download blank score template for an examination and subject
 */
export async function downloadScoreTemplate(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { classId: classFilter } = req.query;

    const studentWhere: any = { status: 'Active' };
    if (classFilter && classFilter !== 'all') {
      studentWhere.classId = String(classFilter);
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      include: { classRoom: true },
      orderBy: [{ classRoom: { name: 'asc' } }, { fullName: 'asc' }],
    });

    const rows = students.map((s, idx) => ({
      '#': idx + 1,
      'Index Number': s.indexNumber,
      'Student Name': s.fullName,
      'Class': s.classRoom?.name || '—',
      'Score': '', // Blank for teacher entry
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Score Template');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Score_Entry_Template.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate template.' });
  }
}
