import { Response } from 'express';
import * as XLSX from 'xlsx';
import { prisma } from '../prisma';
import { AuthRequest, logAudit } from '../middleware/auth';

export async function getStudents(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { search, classId: classFilter, status, gender } = req.query;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = String(status);
    }
    if (classFilter && classFilter !== 'all') {
      where.classId = String(classFilter);
    }
    if (gender && gender !== 'all') {
      where.gender = String(gender);
    }
    if (search) {
      const q = String(search).trim();
      where.OR = [
        { fullName: { contains: q } },
        { indexNumber: { contains: q } },
        { studentId: { contains: q } },
      ];
    }

    const students = await prisma.student.findMany({
      where,
      orderBy: { fullName: 'asc' },
      include: {
        classRoom: true,
        _count: {
          select: { scores: true },
        },
      },
    });

    const classRooms = await prisma.classRoom.findMany({
      orderBy: { name: 'asc' }
    });

    res.json({
      students,
      classes: classRooms,
      total: students.length,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch students.' });
  }
}

export async function getStudentById(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: {
        scores: {
          include: {
            examination: true,
            subject: true,
          },
          orderBy: {
            examination: { sequenceOrder: 'asc' },
          },
        },
      },
    });

    if (!student) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    res.json({ student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student details.' });
  }
}

export async function createStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const {
      studentId,
      indexNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      classId,
      house,
      photoUrl,
    } = req.body;

    if (!studentId || !indexNumber || !firstName || !lastName || !gender) {
      res.status(400).json({ error: 'Student ID, Index Number, First Name, Last Name and Gender are required.' });
      return;
    }

    // Check unique constraints
    const existing = await prisma.student.findFirst({
      where: {
        OR: [
          { studentId: studentId.trim() },
          { indexNumber: indexNumber.trim() },
        ],
      },
    });

    if (existing) {
      res.status(400).json({ error: 'A student with this Student ID or Index Number already exists.' });
      return;
    }

    const fullName = [firstName.trim(), middleName?.trim(), lastName.trim()].filter(Boolean).join(' ');

    const student = await prisma.student.create({
      data: {
        studentId: studentId.trim(),
        indexNumber: indexNumber.trim(),
        firstName: firstName.trim(),
        middleName: middleName?.trim() || null,
        lastName: lastName.trim(),
        fullName,
        gender: gender.trim(),
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
        classId: classId || null,
        house: house?.trim() || null,
        photoUrl: photoUrl || null,
        status: 'Active',
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'CREATE_STUDENT',
      recordType: 'Student',
      recordId: student.id,
      newValue: `Enrolled student ${student.fullName} (${student.indexNumber})`,
      ipAddress: req.ip,
    });

    res.status(201).json({ student, message: 'Student created successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to create student.' });
  }
}

export async function updateStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const {
      studentId,
      indexNumber,
      firstName,
      middleName,
      lastName,
      gender,
      dateOfBirth,
      classId,
      house,
      status,
      photoUrl,
    } = req.body;

    const existing = await prisma.student.findUnique({ where: { id } });
    if (!existing) {
      res.status(404).json({ error: 'Student record not found.' });
      return;
    }

    const fullName = [firstName?.trim() || existing.firstName, middleName?.trim() ?? existing.middleName, lastName?.trim() || existing.lastName]
      .filter(Boolean)
      .join(' ');

    const updated = await prisma.student.update({
      where: { id },
      data: {
        studentId: studentId ? studentId.trim() : existing.studentId,
        indexNumber: indexNumber ? indexNumber.trim() : existing.indexNumber,
        firstName: firstName ? firstName.trim() : existing.firstName,
        middleName: middleName !== undefined ? (middleName ? middleName.trim() : null) : existing.middleName,
        lastName: lastName ? lastName.trim() : existing.lastName,
        fullName,
        gender: gender || existing.gender,
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : existing.dateOfBirth,
        classId: classId !== undefined ? classId : existing.classId,
        house: house !== undefined ? (house ? house.trim() : null) : existing.house,
        status: status || existing.status,
        photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
      },
    });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'UPDATE_STUDENT',
      recordType: 'Student',
      recordId: updated.id,
      oldValue: JSON.stringify({ name: existing.fullName, status: existing.status }),
      newValue: JSON.stringify({ name: updated.fullName, status: updated.status }),
      ipAddress: req.ip,
    });

    res.json({ student: updated, message: 'Student updated successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to update student.' });
  }
}

export async function deleteStudent(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const student = await prisma.student.findUnique({
      where: { id },
      include: { _count: { select: { scores: true } } },
    });

    if (!student) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    // If student has historical exam scores, deactivate instead of wiping out examination integrity
    if (student._count.scores > 0) {
      await prisma.student.update({
        where: { id },
        data: { status: 'Inactive' },
      });

      await logAudit({
        userId: req.user?.userId,
        userName: req.user?.name || 'Admin',
        action: 'DEACTIVATE_STUDENT',
        recordType: 'Student',
        recordId: id,
        newValue: 'Deactivated to preserve historical examination records',
        ipAddress: req.ip,
      });

      res.json({
        message: 'Student has historical examination scores and was deactivated to preserve exam audit integrity.',
        deactivated: true,
      });
      return;
    }

    await prisma.student.delete({ where: { id } });

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'DELETE_STUDENT',
      recordType: 'Student',
      recordId: id,
      oldValue: student.fullName,
      ipAddress: req.ip,
    });

    res.json({ message: 'Student permanently deleted.', deleted: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Failed to delete student.' });
  }
}

/**
 * Validate and preview student Excel file before import
 */
export async function previewStudentImport(req: AuthRequest, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Please upload an Excel file (.xlsx or .xls).' });
      return;
    }

    const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawRows: any[] = XLSX.utils.sheet_to_json(sheet);

    if (rawRows.length === 0) {
      res.status(400).json({ error: 'The uploaded Excel file contains no student records.' });
      return;
    }

    const existingStudents = await prisma.student.findMany({
      select: { studentId: true, indexNumber: true },
    });
    const existingStudentIds = new Set(existingStudents.map(s => s.studentId.toLowerCase()));
    const existingIndexNos = new Set(existingStudents.map(s => s.indexNumber.toLowerCase()));

    const seenInFileIds = new Set<string>();
    const seenInFileIndexNos = new Set<string>();

    const validRecords: any[] = [];
    const invalidRecords: any[] = [];

    rawRows.forEach((row, index) => {
      const rowNum = index + 2; // Accounting for 1-based header
      const studentId = String(row['Student ID'] || row['studentId'] || row['ID'] || '').trim();
      const indexNumber = String(row['Index Number'] || row['indexNumber'] || row['Index'] || '').trim();
      const firstName = String(row['First Name'] || row['firstName'] || '').trim();
      const middleName = String(row['Middle Name'] || row['middleName'] || '').trim();
      const lastName = String(row['Last Name'] || row['lastName'] || '').trim();
      const gender = String(row['Gender'] || row['gender'] || 'Male').trim();
      const studentClass = String(row['Class'] || row['class'] || 'Basic 9').trim();
      const house = String(row['House'] || row['house'] || '').trim();

      const errors: string[] = [];

      if (!studentId) errors.push('Missing Student ID');
      if (!indexNumber) errors.push('Missing Index Number');
      if (!firstName) errors.push('Missing First Name');
      if (!lastName) errors.push('Missing Last Name');

      const sIdKey = studentId.toLowerCase();
      const idxKey = indexNumber.toLowerCase();

      if (studentId && existingStudentIds.has(sIdKey)) {
        errors.push(`Student ID "${studentId}" already exists in database`);
      }
      if (indexNumber && existingIndexNos.has(idxKey)) {
        errors.push(`Index Number "${indexNumber}" already exists in database`);
      }

      if (studentId && seenInFileIds.has(sIdKey)) {
        errors.push(`Duplicate Student ID "${studentId}" in uploaded file`);
      }
      if (indexNumber && seenInFileIndexNos.has(idxKey)) {
        errors.push(`Duplicate Index Number "${indexNumber}" in uploaded file`);
      }

      if (studentId) seenInFileIds.add(sIdKey);
      if (indexNumber) seenInFileIndexNos.add(idxKey);

      const parsedRecord = {
        rowNum,
        studentId,
        indexNumber,
        firstName,
        middleName: middleName || null,
        lastName,
        fullName: [firstName, middleName, lastName].filter(Boolean).join(' '),
        gender: gender.toLowerCase().startsWith('f') ? 'Female' : 'Male',
        class: studentClass || 'Basic 9',
        house: house || null,
      };

      if (errors.length > 0) {
        invalidRecords.push({ ...parsedRecord, errors });
      } else {
        validRecords.push(parsedRecord);
      }
    });

    res.json({
      totalFound: rawRows.length,
      validCount: validRecords.length,
      invalidCount: invalidRecords.length,
      validRecords,
      invalidRecords,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process Excel file: ' + err.message });
  }
}

/**
 * Commit validated student records to database
 */
export async function commitStudentImport(req: AuthRequest, res: Response): Promise<void> {
  try {
    const { students } = req.body;
    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'No valid student records provided to import.' });
      return;
    }

    let importedCount = 0;
    for (const st of students) {
      try {
        await prisma.student.create({
          data: {
            studentId: String(st.studentId).trim(),
            indexNumber: String(st.indexNumber).trim(),
            firstName: String(st.firstName).trim(),
            middleName: st.middleName ? String(st.middleName).trim() : null,
            lastName: String(st.lastName).trim(),
            fullName: st.fullName || [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' '),
            gender: st.gender || 'Male',
            class: st.class || 'Basic 9',
            house: st.house || null,
            status: 'Active',
          },
        });
        importedCount++;
      } catch (e) {
        // Skip duplicate if concurrently created
      }
    }

    await logAudit({
      userId: req.user?.userId,
      userName: req.user?.name || 'Admin',
      action: 'BULK_IMPORT_STUDENTS',
      recordType: 'Student',
      newValue: `Successfully imported ${importedCount} student records`,
      ipAddress: req.ip,
    });

    res.json({
      message: `Successfully imported ${importedCount} students.`,
      importedCount,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message || 'Import failed.' });
  }
}

/**
 * Export all students to Excel
 */
export async function exportStudentsExcel(req: AuthRequest, res: Response): Promise<void> {
  try {
    const students = await prisma.student.findMany({
      include: { classRoom: true },
      orderBy: [{ classRoom: { name: 'asc' } }, { fullName: 'asc' }],
    });

    const rows = students.map((s, idx) => ({
      '#': idx + 1,
      'Student ID': s.studentId,
      'Index Number': s.indexNumber,
      'Full Name': s.fullName,
      'First Name': s.firstName,
      'Middle Name': s.middleName || '',
      'Last Name': s.lastName,
      'Gender': s.gender,
      'Class': s.classRoom?.name || '',
      'House': s.house || '',
      'Status': s.status,
    }));

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="Students_Roster.xlsx"');
    res.send(buffer);
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate Excel export.' });
  }
}
