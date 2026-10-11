// @ts-nocheck
import { Response } from 'express';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

/**
 * Ensures the system backup storage table exists in PostgreSQL.
 */
async function ensureBackupTable(): Promise<void> {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "SystemBackup" (
        "id" TEXT PRIMARY KEY,
        "filename" TEXT NOT NULL,
        "description" TEXT,
        "sizeBytes" INT NOT NULL DEFAULT 0,
        "recordCounts" JSONB NOT NULL,
        "data" JSONB NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdBy" TEXT NOT NULL
      );
    `);
  } catch (err) {
    console.warn('Could not auto-create SystemBackup table via raw query:', err);
  }
}

/**
 * Generates a full system snapshot object from all primary tables.
 */
async function generateSnapshot(username: string) {
  const [
    schoolSettings,
    gradeScales,
    classrooms,
    subjects,
    teacherSubjects,
    users,
    students,
    examinations,
    examinationSubjects,
    scores,
    auditLogs,
  ] = await Promise.all([
    prisma.schoolSettings.findMany(),
    prisma.gradeScale.findMany({ orderBy: { order: 'asc' } }),
    prisma.classRoom.findMany(),
    prisma.subject.findMany(),
    prisma.teacherSubject.findMany(),
    prisma.user.findMany(),
    prisma.student.findMany(),
    prisma.examination.findMany({ orderBy: { sequenceOrder: 'asc' } }),
    prisma.examinationSubject.findMany(),
    prisma.score.findMany(),
    prisma.auditLog.findMany({ take: 1000, orderBy: { createdAt: 'desc' } }),
  ]);

  const timestamp = new Date().toISOString();
  const dateStr = timestamp.replace(/[:.]/g, '-');
  const filename = `mock_intel_backup_${dateStr}.json`;

  const recordCounts = {
    schoolSettings: schoolSettings.length,
    gradeScales: gradeScales.length,
    classrooms: classrooms.length,
    subjects: subjects.length,
    teacherSubjects: teacherSubjects.length,
    users: users.length,
    students: students.length,
    examinations: examinations.length,
    examinationSubjects: examinationSubjects.length,
    scores: scores.length,
    auditLogs: auditLogs.length,
  };

  const snapshot = {
    version: '1.0',
    system: 'Mock Performance Intelligence System',
    exportedAt: timestamp,
    exportedBy: username,
    recordCounts,
    data: {
      schoolSettings,
      gradeScales,
      classrooms,
      subjects,
      teacherSubjects,
      users,
      students,
      examinations,
      examinationSubjects,
      scores,
      auditLogs,
    },
  };

  return { snapshot, filename, recordCounts };
}

/**
 * GET /backup/export
 * Downloads / exports a complete system backup JSON snapshot locally.
 */
export async function exportLocalBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const username = req.user?.name || req.user?.username || 'Admin';
    const { snapshot, filename } = await generateSnapshot(username);

    await logAudit({
      userId: req.user?.userId,
      userName: username,
      action: 'BACKUP_LOCAL_EXPORT',
      recordType: 'SystemBackup',
      newValue: `Generated local backup file: ${filename} with ${snapshot.recordCounts.students} students and ${snapshot.recordCounts.scores} scores`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      filename,
      snapshot,
    });
  } catch (err: any) {
    console.error('Failed to export local backup:', err);
    res.status(500).json({ error: 'Failed to generate local backup snapshot: ' + err.message });
  }
}

/**
 * POST /backup/cloud
 * Creates a complete snapshot and saves it directly to Supabase cloud storage table.
 */
export async function createCloudBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBackupTable();

    const username = req.user?.name || req.user?.username || 'Admin';
    const description = req.body?.description || 'Manual System Cloud Backup';
    const { snapshot, filename, recordCounts } = await generateSnapshot(username);

    const jsonString = JSON.stringify(snapshot);
    const sizeBytes = Buffer.byteLength(jsonString, 'utf8');
    const id = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    await prisma.$executeRawUnsafe(
      `INSERT INTO "SystemBackup" ("id", "filename", "description", "sizeBytes", "recordCounts", "data", "createdAt", "createdBy")
       VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, NOW(), $7)`,
      id,
      filename,
      description,
      sizeBytes,
      JSON.stringify(recordCounts),
      jsonString,
      username
    );

    await logAudit({
      userId: req.user?.userId,
      userName: username,
      action: 'BACKUP_CLOUD_CREATE',
      recordType: 'SystemBackup',
      recordId: id,
      newValue: `Created cloud backup: ${filename} (${(sizeBytes / 1024).toFixed(1)} KB)`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      backup: {
        id,
        filename,
        description,
        sizeBytes,
        recordCounts,
        createdAt: new Date().toISOString(),
        createdBy: username,
      },
    });
  } catch (err: any) {
    console.error('Failed to create cloud backup:', err);
    res.status(500).json({ error: 'Failed to save cloud backup: ' + err.message });
  }
}

/**
 * GET /backup/cloud/list
 * Lists all existing cloud backups with metadata and record stats.
 */
export async function listCloudBackups(req: AuthRequest, res: Response): Promise<void> {
  try {
    await ensureBackupTable();

    const backups: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "filename", "description", "sizeBytes", "recordCounts", "createdAt", "createdBy"
      FROM "SystemBackup"
      ORDER BY "createdAt" DESC
      LIMIT 50;
    `);

    res.json({ backups });
  } catch (err: any) {
    console.error('Failed to list cloud backups:', err);
    res.status(500).json({ error: 'Failed to retrieve cloud backups: ' + err.message });
  }
}

/**
 * GET /backup/cloud/:id/download
 * Retrieves the full data snapshot for a specific cloud backup.
 */
export async function downloadCloudBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const records: any[] = await prisma.$queryRawUnsafe(
      `SELECT "id", "filename", "data" FROM "SystemBackup" WHERE "id" = $1 LIMIT 1;`,
      id
    );

    if (!records || records.length === 0) {
      res.status(404).json({ error: 'Cloud backup not found.' });
      return;
    }

    const backup = records[0];
    res.json({
      success: true,
      filename: backup.filename,
      snapshot: backup.data,
    });
  } catch (err: any) {
    console.error('Failed to download cloud backup:', err);
    res.status(500).json({ error: 'Failed to retrieve cloud backup data: ' + err.message });
  }
}

/**
 * DELETE /backup/cloud/:id
 * Deletes a specific cloud backup snapshot.
 */
export async function deleteCloudBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    await prisma.$executeRawUnsafe(`DELETE FROM "SystemBackup" WHERE "id" = $1;`, id);

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || req.user?.username || 'Admin',
      action: 'BACKUP_CLOUD_DELETE',
      recordType: 'SystemBackup',
      recordId: id,
      newValue: `Deleted cloud backup record ${id}`,
      ipAddress: req.ip,
    });

    res.json({ success: true, message: 'Cloud backup deleted successfully.' });
  } catch (err: any) {
    console.error('Failed to delete cloud backup:', err);
    res.status(500).json({ error: 'Failed to delete cloud backup: ' + err.message });
  }
}

/**
 * POST /backup/restore
 * Restores data from a validated backup snapshot.
 */
export async function restoreBackup(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { snapshot } = req.body;
    if (!snapshot || !snapshot.data) {
      res.status(400).json({ error: 'Invalid backup file format: missing data payload.' });
      return;
    }

    const { data } = snapshot;
    const username = req.user?.name || req.user?.username || 'Admin';

    let restoredCounts = {
      schoolSettings: 0,
      gradeScales: 0,
      classrooms: 0,
      subjects: 0,
      users: 0,
      students: 0,
      examinations: 0,
      scores: 0,
    };

    // 1. School Settings
    if (Array.isArray(data.schoolSettings) && data.schoolSettings.length > 0) {
      for (const s of data.schoolSettings) {
        const { id, updatedAt, ...rest } = s;
        await prisma.schoolSettings.upsert({
          where: { id: id || 'default-settings' },
          create: { id: id || 'default-settings', ...rest },
          update: rest,
        });
        restoredCounts.schoolSettings++;
      }
    }

    // 2. Grade Scales
    if (Array.isArray(data.gradeScales) && data.gradeScales.length > 0) {
      for (const g of data.gradeScales) {
        const { id, createdAt, updatedAt, ...rest } = g;
        await prisma.gradeScale.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.gradeScales++;
      }
    }

    // 3. Classrooms
    if (Array.isArray(data.classrooms) && data.classrooms.length > 0) {
      for (const c of data.classrooms) {
        const { id, createdAt, updatedAt, teacher, students, subjects, ...rest } = c;
        await prisma.classRoom.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.classrooms++;
      }
    }

    // 4. Subjects
    if (Array.isArray(data.subjects) && data.subjects.length > 0) {
      for (const sub of data.subjects) {
        const { id, createdAt, updatedAt, scores, teachers, examinationSubjects, classRoom, ...rest } = sub;
        await prisma.subject.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.subjects++;
      }
    }

    // 5. Users
    if (Array.isArray(data.users) && data.users.length > 0) {
      for (const u of data.users) {
        const { id, createdAt, updatedAt, subjects, classes, ...rest } = u;
        await prisma.user.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.users++;
      }
    }

    // 6. Students
    if (Array.isArray(data.students) && data.students.length > 0) {
      for (const st of data.students) {
        const { id, createdAt, updatedAt, classRoom, scores, ...rest } = st;
        await prisma.student.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.students++;
      }
    }

    // 7. Examinations
    if (Array.isArray(data.examinations) && data.examinations.length > 0) {
      for (const exam of data.examinations) {
        const { id, createdAt, updatedAt, scores, examinationSubjects, ...rest } = exam;
        await prisma.examination.upsert({
          where: { id },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.examinations++;
      }
    }

    // 8. Examination Subjects
    if (Array.isArray(data.examinationSubjects) && data.examinationSubjects.length > 0) {
      for (const es of data.examinationSubjects) {
        const { id, examination, subject, ...rest } = es;
        await prisma.examinationSubject.upsert({
          where: {
            examinationId_subjectId: {
              examinationId: es.examinationId,
              subjectId: es.subjectId,
            },
          },
          create: { id, ...rest },
          update: rest,
        });
      }
    }

    // 9. Scores
    if (Array.isArray(data.scores) && data.scores.length > 0) {
      for (const sc of data.scores) {
        const { id, createdAt, updatedAt, student, examination, subject, ...rest } = sc;
        await prisma.score.upsert({
          where: {
            studentId_examinationId_subjectId: {
              studentId: sc.studentId,
              examinationId: sc.examinationId,
              subjectId: sc.subjectId,
            },
          },
          create: { id, ...rest },
          update: rest,
        });
        restoredCounts.scores++;
      }
    }

    await logAudit({
      userId: req.user?.userId,
      userName: username,
      action: 'BACKUP_RESTORED',
      recordType: 'SystemBackup',
      newValue: `Restored backup successfully: ${restoredCounts.students} students, ${restoredCounts.scores} scores, ${restoredCounts.examinations} exams`,
      ipAddress: req.ip,
    });

    res.json({
      success: true,
      message: 'System restore completed successfully.',
      restoredCounts,
    });
  } catch (err: any) {
    console.error('Failed to restore backup:', err);
    res.status(500).json({ error: 'Failed to restore backup: ' + err.message });
  }
}
