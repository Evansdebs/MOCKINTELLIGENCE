"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUsers = getUsers;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.updateUserSubjects = updateUserSubjects;
exports.resetUserPassword = resetUserPassword;
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const index_1 = require("../index");
const auth_1 = require("../middleware/auth");
async function getUsers(req, res) {
    var _a, _b;
    try {
        const snapshot = await index_1.db.collection('users').orderBy('name', 'asc').get();
        let users = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        // Map subjects for teachers
        for (let u of users) {
            delete u.passwordHash; // Don't leak passwords
            if (u.role === 'TEACHER') {
                const tsSnapshot = await index_1.db.collection('teacherSubjects').where('userId', '==', u.id).get();
                const subjectIds = tsSnapshot.docs.map(doc => doc.data().subjectId);
                u.subjects = [];
                for (const sid of subjectIds) {
                    const subDoc = await index_1.db.collection('subjects').doc(sid).get();
                    if (subDoc.exists) {
                        u.subjects.push({ subject: { id: subDoc.id, name: (_a = subDoc.data()) === null || _a === void 0 ? void 0 : _a.name, code: (_b = subDoc.data()) === null || _b === void 0 ? void 0 : _b.code } });
                    }
                }
            }
            else {
                u.subjects = [];
            }
        }
        res.json({ users });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve users.' });
    }
}
async function createUser(req, res) {
    var _a, _b;
    try {
        const { username, email, name, password, role } = req.body;
        if (!username || !email || !name || !password || !role) {
            res.status(400).json({ error: 'All fields are required.' });
            return;
        }
        const usersRef = index_1.db.collection('users');
        const existUser = await usersRef.where('username', '==', username.trim()).get();
        const existEmail = await usersRef.where('email', '==', email.trim().toLowerCase()).get();
        if (!existUser.empty || !existEmail.empty) {
            res.status(400).json({ error: 'A user with this username or email already exists.' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(password, 10);
        const data = {
            username: username.trim(),
            email: email.trim().toLowerCase(),
            name: name.trim(),
            passwordHash,
            role,
            status: 'Active',
            createdAt: new Date().toISOString()
        };
        const docRef = await usersRef.add(data);
        const user = Object.assign({ id: docRef.id }, data);
        delete user.passwordHash;
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'CREATE_USER',
            recordType: 'User',
            recordId: user.id,
            newValue: `Created ${user.role} account for ${user.name}`,
            ipAddress: req.ip,
        });
        res.status(201).json({ user, message: 'User created successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to create user.' });
    }
}
async function updateUser(req, res) {
    var _a, _b;
    try {
        const id = req.params.id;
        const { name, email, role, status, password } = req.body;
        const userRef = index_1.db.collection('users').doc(id);
        const existingDoc = await userRef.get();
        if (!existingDoc.exists) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        const existing = existingDoc.data();
        const data = {
            name: name ? name.trim() : existing.name,
            email: email ? email.trim().toLowerCase() : existing.email,
            role: role || existing.role,
            status: status || existing.status,
            updatedAt: new Date().toISOString()
        };
        if (password && password.trim()) {
            data.passwordHash = await bcryptjs_1.default.hash(password.trim(), 10);
        }
        await userRef.update(data);
        const updated = Object.assign({ id }, data);
        delete updated.passwordHash;
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'UPDATE_USER',
            recordType: 'User',
            recordId: id,
            newValue: `Updated user ${updated.name}`,
            ipAddress: req.ip,
        });
        res.json({ user: updated, message: 'User updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update user.' });
    }
}
async function updateUserSubjects(req, res) {
    var _a, _b, _c, _d;
    try {
        const id = req.params.id;
        const { subjectIds } = req.body;
        const existingDoc = await index_1.db.collection('users').doc(id).get();
        if (!existingDoc.exists || ((_a = existingDoc.data()) === null || _a === void 0 ? void 0 : _a.role) !== 'TEACHER') {
            res.status(404).json({ error: 'Teacher not found.' });
            return;
        }
        // Delete existing
        const tsSnapshot = await index_1.db.collection('teacherSubjects').where('userId', '==', id).get();
        const batch = index_1.db.batch();
        tsSnapshot.docs.forEach(doc => batch.delete(doc.ref));
        // Create new
        if (Array.isArray(subjectIds)) {
            for (const subId of subjectIds) {
                const newRef = index_1.db.collection('teacherSubjects').doc(`${id}_${subId}`);
                batch.set(newRef, { userId: id, subjectId: subId });
            }
        }
        await batch.commit();
        await (0, auth_1.logAudit)({
            userId: (_b = req.user) === null || _b === void 0 ? void 0 : _b.userId,
            userName: ((_c = req.user) === null || _c === void 0 ? void 0 : _c.name) || 'Admin',
            action: 'UPDATE_TEACHER_SUBJECTS',
            recordType: 'User',
            recordId: id,
            newValue: `Updated subjects for teacher ${(_d = existingDoc.data()) === null || _d === void 0 ? void 0 : _d.name}`,
            ipAddress: req.ip,
        });
        res.json({ message: 'Teacher subjects updated successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to update teacher subjects.' });
    }
}
async function resetUserPassword(req, res) {
    var _a, _b, _c;
    try {
        const id = req.params.id;
        const { newPassword } = req.body;
        if (!newPassword || newPassword.length < 6) {
            res.status(400).json({ error: 'Password must be at least 6 characters long.' });
            return;
        }
        const existingDoc = await index_1.db.collection('users').doc(id).get();
        if (!existingDoc.exists) {
            res.status(404).json({ error: 'User not found.' });
            return;
        }
        const passwordHash = await bcryptjs_1.default.hash(newPassword, 10);
        await index_1.db.collection('users').doc(id).update({ passwordHash });
        await (0, auth_1.logAudit)({
            userId: (_a = req.user) === null || _a === void 0 ? void 0 : _a.userId,
            userName: ((_b = req.user) === null || _b === void 0 ? void 0 : _b.name) || 'Admin',
            action: 'RESET_USER_PASSWORD',
            recordType: 'User',
            recordId: id,
            newValue: `Reset password for user ${(_c = existingDoc.data()) === null || _c === void 0 ? void 0 : _c.name}`,
            ipAddress: req.ip,
        });
        res.json({ message: 'Password reset successfully.' });
    }
    catch (err) {
        res.status(500).json({ error: err.message || 'Failed to reset password.' });
    }
}
//# sourceMappingURL=userController.js.map