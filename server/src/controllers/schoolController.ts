import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getPublicSettings(_req: any, res: Response): Promise<void> {
  try {
    const settings = await prisma.schoolSettings.findFirst({
      select: {
        schoolName: true,
        logoUrl: true,
        motto: true,
      },
    });

    let primaryColor = 'blue';
    let cleanMotto = settings?.motto || '';

    if (cleanMotto && cleanMotto.includes('__THEME:')) {
      const parts = cleanMotto.split('__THEME:');
      cleanMotto = parts[0].trim();
      primaryColor = parts[1].trim() || 'blue';
    }

    res.json({
      settings: {
        ...settings,
        motto: cleanMotto,
        primaryColor,
      },
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve public settings.' });
  }
}

export async function getSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    let settings = await prisma.schoolSettings.findFirst();
    if (!settings) {
      settings = await prisma.schoolSettings.create({
        data: {
          id: 'default-settings',
          schoolName: 'Achimota Basic Model School',
          address: 'P.O. Box AH 123, Achimota, Accra - Ghana',
          telephone: '+233 (0) 24 555 0192',
          email: 'info@achimotabasic.edu.gh',
          academicYear: '2025/2026',
          currentClass: 'Basic 9',
          motto: 'Excellence, Character and Innovation',
          headteacherName: 'Dr. Kwame Mensah-Bonsu',
          passThreshold: 50.0,
          stableThreshold: 1.0,
          enableRanking: true,
          studentsCanDownloadSlips: true,
          teachersCanEditScores: true,
        },
      });
    }

    const gradeScales = await prisma.gradeScale.findMany({
      orderBy: { order: 'asc' },
    });

    let primaryColor = 'blue';
    let cleanMotto = settings.motto || '';

    if (cleanMotto && cleanMotto.includes('__THEME:')) {
      const parts = cleanMotto.split('__THEME:');
      cleanMotto = parts[0].trim();
      primaryColor = parts[1].trim() || 'blue';
    }

    res.json({
      settings: {
        ...settings,
        motto: cleanMotto,
        primaryColor,
      },
      gradeScales,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve school settings.' });
  }
}

export async function updateSettings(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      schoolName,
      logoUrl,
      address,
      telephone,
      email,
      academicYear,
      currentClass,
      motto,
      headteacherName,
      enableRanking,
      passThreshold,
      stableThreshold,
      consecutiveDeclineAlertCount,
      consecutiveBelowTargetAlertCount,
      studentsCanDownloadSlips,
      teachersCanEditScores,
      beceStartDate,
      beceTimetable,
      headteacherSignature,
      primaryColor,
    } = req.body;

    const old = await prisma.schoolSettings.findFirst();

    // Preserve/encode theme into motto
    let effectiveMotto = (motto || '').trim();
    if (primaryColor) {
      if (effectiveMotto.includes('__THEME:')) {
        effectiveMotto = effectiveMotto.split('__THEME:')[0].trim();
      }
      effectiveMotto = effectiveMotto ? `${effectiveMotto} __THEME:${primaryColor}` : `__THEME:${primaryColor}`;
    }

    const updated = await prisma.schoolSettings.upsert({
      where: { id: old?.id || 'default-settings' },
      update: {
        schoolName,
        logoUrl,
        address,
        telephone,
        email,
        academicYear,
        currentClass,
        motto: effectiveMotto,
        headteacherName,
        enableRanking: Boolean(enableRanking),
        passThreshold: Number(passThreshold) || 50.0,
        stableThreshold: Number(stableThreshold) || 1.0,
        consecutiveDeclineAlertCount: Number(consecutiveDeclineAlertCount) || 3,
        consecutiveBelowTargetAlertCount: Number(consecutiveBelowTargetAlertCount) || 3,
        studentsCanDownloadSlips: studentsCanDownloadSlips !== undefined ? Boolean(studentsCanDownloadSlips) : true,
        teachersCanEditScores: teachersCanEditScores !== undefined ? Boolean(teachersCanEditScores) : true,
        beceStartDate: beceStartDate ? new Date(beceStartDate) : null,
        beceTimetable: beceTimetable || null,
        headteacherSignature: headteacherSignature || null,
      },
      create: {
        schoolName,
        logoUrl,
        address,
        telephone,
        email,
        academicYear,
        currentClass,
        motto: effectiveMotto,
        headteacherName,
        enableRanking: Boolean(enableRanking),
        passThreshold: Number(passThreshold) || 50.0,
        stableThreshold: Number(stableThreshold) || 1.0,
        studentsCanDownloadSlips: studentsCanDownloadSlips !== undefined ? Boolean(studentsCanDownloadSlips) : true,
        teachersCanEditScores: teachersCanEditScores !== undefined ? Boolean(teachersCanEditScores) : true,
        beceStartDate: beceStartDate ? new Date(beceStartDate) : null,
        beceTimetable: beceTimetable || null,
        headteacherSignature: headteacherSignature || null,
      },
    });

    let returnMotto = updated.motto || '';
    let returnTheme = primaryColor || 'blue';
    if (returnMotto.includes('__THEME:')) {
      const parts = returnMotto.split('__THEME:');
      returnMotto = parts[0].trim();
      returnTheme = parts[1].trim() || returnTheme;
    }

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_SETTINGS',
      recordType: 'SchoolSettings',
      recordId: updated.id,
      newValue: JSON.stringify(req.body),
      ipAddress: req.ip,
    });

    res.json({
      settings: {
        ...updated,
        motto: returnMotto,
        primaryColor: returnTheme,
      },
      message: 'School settings updated successfully.',
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update settings.' });
  }
}

export async function updateGradeScales(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { scales } = req.body;
    if (!Array.isArray(scales)) {
      res.status(400).json({ error: 'Scales must be an array.' });
      return;
    }

    // Delete and recreate grade scales in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.gradeScale.deleteMany();
      for (let i = 0; i < scales.length; i++) {
        const s = scales[i];
        await tx.gradeScale.create({
          data: {
            grade: s.grade.trim(),
            minScore: Number(s.minScore),
            maxScore: Number(s.maxScore),
            gradePoint: s.gradePoint ? Number(s.gradePoint) : null,
            remark: s.remark.trim(),
            order: i,
          },
        });
      }
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_GRADE_SCALES',
      recordType: 'GradeScale',
      newValue: `Updated ${scales.length} grade boundaries`,
      ipAddress: req.ip,
    });

    const updated = await prisma.gradeScale.findMany({ orderBy: { order: 'asc' } });
    res.json({ gradeScales: updated, message: 'Grade boundaries saved successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update grade scales.' });
  }
}
