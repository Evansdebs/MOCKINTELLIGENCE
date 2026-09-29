import { Request, Response } from 'express';
import { prisma } from '../prisma';

export const getClassRooms = async (req: Request, res: Response) => {
  try {
    const classRooms = await prisma.classRoom.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(classRooms);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to fetch classrooms', error: error.message });
  }
};

export const createClassRoom = async (req: Request, res: Response) => {
  try {
    const { name, status, teacherId } = req.body;
    const classRoom = await prisma.classRoom.create({
      data: { name, status: status || 'Active', teacherId }
    });
    res.status(201).json(classRoom);
  } catch (error: any) {
    if (error.code === 'P2002') {
      return res.status(400).json({ message: 'Classroom with this name already exists' });
    }
    res.status(500).json({ message: 'Failed to create classroom', error: error.message });
  }
};

export const updateClassRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name, status, teacherId } = req.body;
    
    const classRoom = await prisma.classRoom.update({
      where: { id },
      data: { name, status, teacherId }
    });
    res.json(classRoom);
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to update classroom', error: error.message });
  }
};

export const deleteClassRoom = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.classRoom.delete({ where: { id } });
    res.json({ message: 'Classroom deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: 'Failed to delete classroom', error: error.message });
  }
};
