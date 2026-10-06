"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteClassRoom = exports.updateClassRoom = exports.createClassRoom = exports.getClassRooms = void 0;
const index_1 = require("../index");
const getClassRooms = async (req, res) => {
    try {
        const snapshot = await index_1.db.collection('classRooms').orderBy('name', 'asc').get();
        const classRooms = snapshot.docs.map(doc => (Object.assign({ id: doc.id }, doc.data())));
        res.json(classRooms);
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to fetch classrooms', error: error.message });
    }
};
exports.getClassRooms = getClassRooms;
const createClassRoom = async (req, res) => {
    try {
        const { name, status, teacherId } = req.body;
        const existing = await index_1.db.collection('classRooms').where('name', '==', name.trim()).get();
        if (!existing.empty) {
            res.status(400).json({ message: 'Classroom with this name already exists' });
            return;
        }
        const data = {
            name: name.trim(),
            status: status || 'Active',
            teacherId: teacherId || null,
            createdAt: new Date().toISOString()
        };
        const docRef = await index_1.db.collection('classRooms').add(data);
        res.status(201).json(Object.assign({ id: docRef.id }, data));
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to create classroom', error: error.message });
    }
};
exports.createClassRoom = createClassRoom;
const updateClassRoom = async (req, res) => {
    try {
        const id = req.params.id;
        const { name, status, teacherId } = req.body;
        const data = {
            name: name.trim(),
            status,
            teacherId: teacherId || null,
            updatedAt: new Date().toISOString()
        };
        await index_1.db.collection('classRooms').doc(id).update(data);
        res.json(Object.assign({ id }, data));
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to update classroom', error: error.message });
    }
};
exports.updateClassRoom = updateClassRoom;
const deleteClassRoom = async (req, res) => {
    try {
        const id = req.params.id;
        await index_1.db.collection('classRooms').doc(id).delete();
        res.json({ message: 'Classroom deleted successfully' });
    }
    catch (error) {
        res.status(500).json({ message: 'Failed to delete classroom', error: error.message });
    }
};
exports.deleteClassRoom = deleteClassRoom;
//# sourceMappingURL=classRoomController.js.map