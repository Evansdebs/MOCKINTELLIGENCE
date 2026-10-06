"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticate = authenticate;
exports.authorize = authorize;
exports.logAudit = logAudit;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const index_1 = require("../index");
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-mock-intelligence-jwt-key-2026-ghana';
function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({ error: 'Access denied. No authentication token provided.' });
        return;
    }
    const token = authHeader.split(' ')[1];
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    }
    catch (error) {
        res.status(401).json({ error: 'Invalid or expired session token.' });
    }
}
function authorize(allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            res.status(401).json({ error: 'Authentication required.' });
            return;
        }
        if (!allowedRoles.includes(req.user.role)) {
            res.status(403).json({
                error: `Unauthorized. Required role: ${allowedRoles.join(' or ')}. Your role: ${req.user.role}`,
            });
            return;
        }
        next();
    };
}
async function logAudit(params) {
    try {
        await index_1.db.collection('auditLogs').add({
            userId: params.userId || null,
            userName: params.userName,
            action: params.action,
            recordType: params.recordType,
            recordId: params.recordId || null,
            oldValue: params.oldValue || null,
            newValue: params.newValue || null,
            ipAddress: params.ipAddress || '127.0.0.1',
            createdAt: new Date().toISOString(),
        });
    }
    catch (err) {
        console.error('Failed to write audit log:', err);
    }
}
//# sourceMappingURL=auth.js.map