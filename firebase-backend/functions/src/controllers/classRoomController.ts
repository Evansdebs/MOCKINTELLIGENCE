import { Request, Response } from 'express';
import { db } from '../index';

export const getClassRooms = async (req: Request, res: Response) => {
  try {
    const snapshot = await db.collection('classRooms').orderBy('name', 'asc').get();
    const classRooms = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    res.json(classRooms);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch classrooms', error: error.message });
  }
};

export const createClassRoom = async (req: Request, res: Response) => {
  try {
    const { name, status, teacherId } = req.body;
    const existing = await db.collection('classRooms').where('name', '==', name.trim()).get();
    
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
    
    const docRef = await db.collection('classRooms').add(data);
    res.status(201).json({ id: docRef.id, ...data });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to create classroom', error: error.message });
  }
};

export const updateClassRoom = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { name, status, teacherId } = req.body;
    
    const data = { 
      name: name.trim(), 
      status, 
      teacherId: teacherId || null,
      updatedAt: new Date().toISOString()
    };
    
    await db.collection('classRooms').doc(id).update(data);
    res.json({ id, ...data });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update classroom', error: error.message });
  }
};

export const deleteClassRoom = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    await db.collection('classRooms').doc(id).delete();
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete classroom', error: error.message });
  }
};
