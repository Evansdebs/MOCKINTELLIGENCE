"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditLogs = getAuditLogs;
const index_1 = require("../index");
async function getAuditLogs(req, res) {
    try {
        const { action, recordType, limit = 100 } = req.query;
        let query = index_1.db.collection('auditLogs');
        if (action)
            query = query.where('action', '==', String(action));
        if (recordType)
            query = query.where('recordType', '==', String(recordType));
        query = query.orderBy('createdAt', 'desc').limit(Number(limit) || 100);
        const snapshot = await query.get();
        const logs = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json({ logs });
    }
    catch (err) {
        res.status(500).json({ error: 'Failed to retrieve audit logs.' });
    }
}
//# sourceMappingURL=auditController.js.map