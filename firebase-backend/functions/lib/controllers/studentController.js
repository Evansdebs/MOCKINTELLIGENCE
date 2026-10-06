"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.getStudents = getStudents;
exports.getStudentById = getStudentById;
exports.createStudent = createStudent;
exports.updateStudent = updateStudent;
exports.deleteStudent = deleteStudent;
exports.previewStudentImport = previewStudentImport;
exports.commitStudentImport = commitStudentImport;
exports.exportStudentsExcel = exportStudentsExcel;
const XLSX = __importStar(require("xlsx"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
async function getStudents(req, res) {
    try {
        const { search, classId: classFilter, status, gender } = req.query;
        let studentsRef = index_1.db.collection('students');
        if (status && status !== 'all') {
            studentsRef = studentsRef.where('status', '==', String(status));
        }
        if (classFilter && classFilter !== 'all') {
            studentsRef = studentsRef.where('classId', '==', String(classFilter));
        }
        if (gender && gender !== 'all') {
            studentsRef = studentsRef.where('gender', '==', String(gender));
        }
        // Note: Firestore doesn't support complex OR queries for search natively
        // We will pull the list and filter in memory if search is provided
        let snapshot = await studentsRef.orderBy('fullName', 'asc').get();
        let students = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        if (search) {
            const q = String(search).trim().toLowerCase();
            students = students.filter(s => (s.fullName && s.fullName.toLowerCase().includes(q)) ||
                (s.indexNumber && s.indexNumber.toLowerCase().includes(q)) ||
                (s.studentId && s.studentId.toLowerCase().includes(q)));
        }
        const classSnapshot = await index_1.db.collection('classRooms').orderBy('name', 'asc').get();
        const classRooms = classSnapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Map classRoom data to students (simulating SQL JOIN)
        students = students.map(s => (Object.assign(Object.assign({}, s), { classRoom: classRooms.find(c => c.id === s.classId) || null, _count: { scores: 0 } // Score count omitted for brevity in NoSQL
         })));
        res.json({
            students,
            classes: classRooms,
            total: students.length,
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch students.' });
    }
}
async function getStudentById(req, res) {
    try {
        const id = req.params.id;
        const studentDoc = await index_1.db.collection('students').doc(id).get();
        if (!studentDoc.exists) {
            res.status(404).json({ error: 'Student record not found.' });
            return;
        }
        const student = Object.assign({ id: studentDoc.id }, studentDoc.data());
        // Fetch classRoom
        if (student.classId) {
            const classDoc = await index_1.db.collection('classRooms').doc(student.classId).get();
            student.classRoom = classDoc.exists ? Object.assign({ id: classDoc.id }, classDoc.data()) : null;
        }
        // Fetch scores with examination + subject
        const scoresSnap = await index_1.db.collection('scores').where('studentId', '==', id).get();
        const scoresRaw = scoresSnap.docs.map(d => (Object.assign({ id: d.id }, d.data())));
        const examCache = new Map();
        const subjectCache = new Map();
        const scores = await Promise.all(scoresRaw.map(async (sc) => {
            if (sc.examinationId && !examCache.has(sc.examinationId)) {
                const eDoc = await index_1.db.collection('examinations').doc(sc.examinationId).get();
                if (eDoc.exists)
                    examCache.set(sc.examinationId, Object.assign({ id: eDoc.id }, eDoc.data()));
            }
            if (sc.subjectId && !subjectCache.has(sc.subjectId)) {
                const sDoc = await index_1.db.collection('subjects').doc(sc.subjectId).get();
                if (sDoc.exists)
                    subjectCache.set(sc.subjectId, Object.assign({ id: sDoc.id }, sDoc.data()));
            }
            return Object.assign(Object.assign({}, sc), { examination: examCache.get(sc.examinationId), subject: subjectCache.get(sc.subjectId) });
        }));
        scores.sort((a, b) => { var _a, _b; return (((_a = a.examination) === null || _a === void 0 ? void 0 : _a.sequenceOrder) || 0) - (((_b = b.examination) === null || _b === void 0 ? void 0 : _b.sequenceOrder) || 0); });
        student.scores = scores;
        res.json({ student });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to fetch student details.' });
    }
}
async function createStudent(req, res) {
    var _a, _b;
    try {
        const { studentId, indexNumber, firstName, middleName, lastName, gender, dateOfBirth, classId, house, photoUrl, } = req.body;
        if (!studentId || !indexNumber || !firstName || !lastName || !gender) {
            res.status(400).json({ error: 'Student ID, Index Number, First Name, Last Name and Gender are required.' });
            return;
        }
        const studentsRef = index_1.db.collection('students');
        // Check unique constraints (Firestore requires multiple queries)
        let snapshot = await studentsRef.where('studentId', '==', studentId.trim()).get();
        if (snapshot.empty) {
            snapshot = await studentsRef.where('indexNumber', '==', indexNumber.trim()).get();
        }
        if (!snapshot.empty) {
            res.status(400).json({ error: 'A student with this Student ID or Index Number already exists.' });
            return;
        }
        const fullName = [firstName.trim(), middleName === null || middleName === void 0 ? void 0 : middleName.trim(), lastName.trim()].filter(Boolean).join(' ');
        const newStudentData = {
            studentId: studentId.trim(),
            indexNumber: indexNumber.trim(),
            firstName: firstName.trim(),
            middleName: (middleName === null || middleName === void 0 ? void 0 : middleName.trim()) || null,
            lastName: lastName.trim(),
            fullName,
            gender: gender.trim(),
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : null,
            classId: classId || null,
            house: (house === null || house === void 0 ? void 0 : house.trim()) || null,
            photoUrl: photoUrl || null,
            status: 'Active',
            pin: Math.floor(1000 + Math.random() * 9000).toString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        const docRef = await studentsRef.add(newStudentData);
        const student = Object.assign({ id: docRef.id }, newStudentData);
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'CREATE_STUDENT',
            recordType: 'Student',
            recordId: student.id,
            newValue: `Enrolled student ${student.fullName} (${student.indexNumber})`,
            ipAddress: req.ip,
        });
        res.status(201).json({ student, message: 'Student created successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create student.' });
    }
}
async function updateStudent(req, res) {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        const { studentId, indexNumber, firstName, middleName, lastName, gender, dateOfBirth, classId, house, status, photoUrl } = req.body;
        const existingDoc = await index_1.db.collection('students').doc(id).get();
        if (!existingDoc.exists) {
            res.status(404).json({ error: 'Student record not found.' });
            return;
        }
        const existing = existingDoc.data();
        const fullName = [(firstName === null || firstName === void 0 ? void 0 : firstName.trim()) || existing.firstName, (_a = middleName === null || middleName === void 0 ? void 0 : middleName.trim()) !== null && _a !== void 0 ? _a : existing.middleName, (lastName === null || lastName === void 0 ? void 0 : lastName.trim()) || existing.lastName]
            .filter(Boolean)
            .join(' ');
        const data = {
            studentId: studentId ? studentId.trim() : existing.studentId,
            indexNumber: indexNumber ? indexNumber.trim() : existing.indexNumber,
            firstName: firstName ? firstName.trim() : existing.firstName,
            middleName: middleName !== undefined ? (middleName ? middleName.trim() : null) : existing.middleName,
            lastName: lastName ? lastName.trim() : existing.lastName,
            fullName,
            gender: gender || existing.gender,
            dateOfBirth: dateOfBirth ? new Date(dateOfBirth).toISOString() : existing.dateOfBirth,
            classId: classId !== undefined ? classId : existing.classId,
            house: house !== undefined ? (house ? house.trim() : null) : existing.house,
            status: status || existing.status,
            photoUrl: photoUrl !== undefined ? photoUrl : existing.photoUrl,
            updatedAt: new Date().toISOString(),
        };
        await index_1.db.collection('students').doc(id).update(data);
        const updated = Object.assign({ id }, data);
        await (0, auth_1.logAudit)({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
            userName: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Admin',
            action: 'UPDATE_STUDENT',
            recordType: 'Student',
            recordId: id,
            oldValue: JSON.stringify({ name: existing.fullName, status: existing.status }),
            newValue: JSON.stringify({ name: updated.fullName, status: updated.status }),
            ipAddress: req.ip,
        });
        res.json({ student: updated, message: 'Student updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update student.' });
    }
}
async function deleteStudent(req, res) {
    var _a, _b, _c, _d;
    try {
        const id = req.params.id;
        const studentDoc = await index_1.db.collection('students').doc(id).get();
        if (!studentDoc.exists) {
            res.status(404).json({ error: 'Student not found.' });
            return;
        }
        const student = studentDoc.data();
        // If student has historical exam scores, deactivate instead of wiping
        const scoresCheck = await index_1.db.collection('scores').where('studentId', '==', id).limit(1).get();
        if (!scoresCheck.empty) {
            await index_1.db.collection('students').doc(id).update({ status: 'Inactive' });
            await (0, auth_1.logAudit)({
                userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
                userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
                action: 'DEACTIVATE_STUDENT',
                recordType: 'Student',
                recordId: id,
                newValue: 'Deactivated to preserve historical examination records',
                ipAddress: req.ip,
            });
            res.json({ message: 'Student has historical examination scores and was deactivated to preserve exam audit integrity.', deactivated: true });
            return;
        }
        await index_1.db.collection('students').doc(id).delete();
        await (0, auth_1.logAudit)({
            userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.userId,
            userName: ((_d = req.user) === null || _d === void 0 ? void 0 : _d.name) || 'Admin',
            action: 'DELETE_STUDENT',
            recordType: 'Student',
            recordId: id,
            oldValue: student.fullName,
            ipAddress: req.ip,
        });
        res.json({ message: 'Student permanently deleted.', deleted: true });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to delete student.' });
    }
}
/**
 * Validate and preview student Excel file before import
 */
async function previewStudentImport(req, res) {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'Please upload an Excel file (.xlsx or .xls).' });
            return;
        }
        const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const rawRows = XLSX.utils.sheet_to_json(sheet);
        if (rawRows.length === 0) {
            res.status(400).json({ error: 'The uploaded Excel file contains no student records.' });
            return;
        }
        const existingSnap = await index_1.db.collection('students').get();
        const existingStudentIds = new Set(existingSnap.docs.map(d => (d.data().studentId || '').toLowerCase()));
        const existingIndexNos = new Set(existingSnap.docs.map(d => (d.data().indexNumber || '').toLowerCase()));
        const seenInFileIds = new Set();
        const seenInFileIndexNos = new Set();
        const validRecords = [];
        const invalidRecords = [];
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
            const errors = [];
            if (!studentId)
                errors.push('Missing Student ID');
            if (!indexNumber)
                errors.push('Missing Index Number');
            if (!firstName)
                errors.push('Missing First Name');
            if (!lastName)
                errors.push('Missing Last Name');
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
            if (studentId)
                seenInFileIds.add(sIdKey);
            if (indexNumber)
                seenInFileIndexNos.add(idxKey);
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
                invalidRecords.push(Object.assign(Object.assign({}, parsedRecord), { errors }));
            }
            else {
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
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to process Excel file: ' + err.message });
    }
}
/**
 * Commit validated student records to database
 */
async function commitStudentImport(req, res) {
    var _a, _b;
    try {
        const { students } = req.body;
        if (!Array.isArray(students) || students.length === 0) {
            res.status(400).json({ error: 'No valid student records provided to import.' });
            return;
        }
        let importedCount = 0;
        const existingClassesSnap = await index_1.db.collection('classRooms').get();
        const classMap = new Map(existingClassesSnap.docs.map(d => [(d.data().name || '').toLowerCase(), d.id]));
        for (const st of students) {
            try {
                const className = String(st.class || 'Basic 9').trim();
                const classNameKey = className.toLowerCase();
                let classId = classMap.get(classNameKey);
                if (!classId) {
                    const newClassRef = await index_1.db.collection('classRooms').add({ name: className, status: 'Active', createdAt: new Date().toISOString() });
                    classId = newClassRef.id;
                    classMap.set(classNameKey, classId);
                }
                await index_1.db.collection('students').add({
                    studentId: String(st.studentId).trim(),
                    indexNumber: String(st.indexNumber).trim(),
                    firstName: String(st.firstName).trim(),
                    middleName: st.middleName ? String(st.middleName).trim() : null,
                    lastName: String(st.lastName).trim(),
                    fullName: st.fullName || [st.firstName, st.middleName, st.lastName].filter(Boolean).join(' '),
                    gender: st.gender || 'Male',
                    classId: classId,
                    house: st.house || null,
                    status: 'Active',
                    pin: Math.floor(1000 + Math.random() * 9000).toString(),
                    createdAt: new Date().toISOString(),
                });
                importedCount++;
            }
            catch (e) {
                console.error('Error importing student:', e);
            }
        }
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'BULK_IMPORT_STUDENTS',
            recordType: 'Student',
            newValue: `Successfully imported ${importedCount} student records`,
            ipAddress: req.ip,
        });
        res.json({
            message: `Successfully imported ${importedCount} students.`,
            importedCount,
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Import failed.' });
    }
}
/**
 * Export all students to Excel
 */
async function exportStudentsExcel(req, res) {
    try {
        const studentsSnap = await index_1.db.collection('students').get();
        const classRoomCache = new Map();
        const studentsWithClass = await Promise.all(studentsSnap.docs.map(async (d) => {
            const st = Object.assign({ id: d.id }, d.data());
            if (st.classId && !classRoomCache.has(st.classId)) {
                const cDoc = await index_1.db.collection('classRooms').doc(st.classId).get();
                if (cDoc.exists)
                    classRoomCache.set(st.classId, Object.assign({ id: cDoc.id }, cDoc.data()));
            }
            st.classRoom = classRoomCache.get(st.classId) || null;
            return st;
        }));
        const students = studentsWithClass.sort((a, b) => {
            var _a, _b;
            const cn = (((_a = a.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '').localeCompare(((_b = b.classRoom) === null || _b === void 0 ? void 0 : _b.name) || '');
            return cn !== 0 ? cn : a.fullName.localeCompare(b.fullName);
        });
        const rows = students.map((s, idx) => {
            var _a;
            return ({
                '#': idx + 1,
                'Student ID': s.studentId,
                'Index Number': s.indexNumber,
                'Full Name': s.fullName,
                'First Name': s.firstName,
                'Middle Name': s.middleName || '',
                'Last Name': s.lastName,
                'Gender': s.gender,
                'Class': ((_a = s.classRoom) === null || _a === void 0 ? void 0 : _a.name) || '',
                'House': s.house || '',
                'Status': s.status,
                'Portal PIN': s.pin || 'N/A',
            });
        });
        const worksheet = XLSX.utils.json_to_sheet(rows);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename="Students_Roster.xlsx"');
        res.send(buffer);
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to generate Excel export.' });
    }
}
//# sourceMappingURL=studentController.js.map