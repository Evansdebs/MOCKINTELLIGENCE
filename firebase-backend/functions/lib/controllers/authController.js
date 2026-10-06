"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = login;
exports.studentLogin = studentLogin;
exports.me = me;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mock-intelligence-jwt-key-2026-ghana';
async function login(req, res) {
    try {
        const { username, password } = req.body;
        if (!username || !password) {
            res.status(400).json({ error: 'Username/Email and password are required.' });
            return;
        }
        const usersRef = index_1.db.collection('users');
        let snapshot = await usersRef.where('username', '==', username.trim()).get();
        if (snapshot.empty) {
            snapshot = await usersRef.where('email', '==', username.trim().toLowerCase()).get();
        }
        if (snapshot.empty) {
            res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
            return;
        }
        const userDoc = snapshot.docs[0];
        const user = Object.assign({ id: userDoc.id }, userDoc.data());
        const isMatch = await bcryptjs_1.default.compare(password, user.passwordHash);
        if (!isMatch) {
            res.status(401).json({ error: 'Invalid credentials. Please verify your username and password.' });
            return;
        }
        const payload = {
            userId: user.id,
            username: user.username,
            name: user.name,
            email: user.email,
            role: user.role,
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        await (0, auth_1.logAudit)({
            userId: user.id,
            userName: user.name,
            action: 'USER_LOGIN',
            recordType: 'User',
            recordId: user.id,
            newValue: `Logged in with role ${user.role}`,
            ipAddress: req.ip,
        });
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                name: user.name,
                email: user.email,
                role: user.role,
                subjects: user.subjects || [],
            },
        });
    }
    catch (err) {
        console.error('Login error:', err);
        res.status(500).json({ error: 'Authentication failed due to an internal server error.' });
    }
}
async function studentLogin(req, res) {
    try {
        const { indexNumber, studentId } = req.body;
        if (!indexNumber || !studentId) {
            res.status(400).json({ error: 'Index Number and Student ID are required.' });
            return;
        }
        const snapshot = await index_1.db.collection('students')
            .where('indexNumber', '==', indexNumber.trim())
            .where('studentId', '==', studentId.trim())
            .where('status', '==', 'Active')
            .get();
        if (snapshot.empty) {
            res.status(401).json({ error: 'Invalid Index Number or Student ID.' });
            return;
        }
        const studentDoc = snapshot.docs[0];
        const student = Object.assign({ id: studentDoc.id }, studentDoc.data());
        const payload = {
            userId: student.id,
            username: student.indexNumber,
            name: student.fullName,
            email: '',
            role: 'STUDENT',
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '7d' });
        res.json({
            token,
            user: {
                id: student.id,
                username: student.indexNumber,
                name: student.fullName,
                email: '',
                role: 'STUDENT',
            },
        });
    }
    catch (err) {
        res.status(500).json({ error: 'Authentication failed.' });
    }
}
async function me(req, res) {
    try {
        if (!req.user) {
            res.status(401).json({ error: 'Not authenticated.' });
            return;
        }
        if (req.user.role === 'STUDENT') {
            const studentDoc = await index_1.db.collection('students').doc(req.user.userId).get();
            if (!studentDoc.exists) {
                res.status(404).json({ error: 'Student not found.' });
                return;
            }
            const student = studentDoc.data();
            res.json({
                user: {
                    id: studentDoc.id,
                    username: student.indexNumber,
                    name: student.fullName,
                    email: '',
                    role: 'STUDENT',
                }
            });
            return;
        }
        const userDoc = await index_1.db.collection('users').doc(req.user.userId).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: 'User account not found.' });
            return;
        }
        const user = Object.assign({ id: userDoc.id }, userDoc.data());
        delete user.passwordHash;
        // Attach subjects for teachers
        if (user.role === 'TEACHER') {
            const tsSnapshot = await index_1.db.collection('teacherSubjects').where('userId', '==', user.id).get();
            const subjects = [];
            for (const tsDoc of tsSnapshot.docs) {
                const subDoc = await index_1.db.collection('subjects').doc(tsDoc.data().subjectId).get();
                if (subDoc.exists) {
                    subjects.push({ subject: Object.assign({ id: subDoc.id }, subDoc.data()) });
                }
            }
            user.subjects = subjects;
        }
        res.json({ user });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve profile.' });
    }
}
//# sourceMappingURL=authController.js.map