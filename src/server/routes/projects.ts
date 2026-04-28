/* eslint-disable no-useless-assignment */
import express from 'express';
import { readDB, writeDB } from '../db';

const router = express.Router();

router.post('/projects', async (req, res) => {
  const { id, timestamp, name, data, chatHistory } = req.body;
  try {
    const projects = await readDB();
    const existingIndex = projects.findIndex(p => p.id === id);
    const newProject = { id, timestamp, name, data, chatHistory };
    
    if (existingIndex >= 0) {
      projects[existingIndex] = newProject;
    } else {
      projects.push(newProject);
    }
    
    await writeDB(projects);
    res.status(201).json({ message: 'Project saved successfully', id });
  } catch (error: any) {
    console.error('Error saving project:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects', async (req, res) => {
  try {
    const projects = await readDB();
    // Sort by timestamp descending
    projects.sort((a, b) => b.timestamp - a.timestamp);
    res.status(200).json(projects);
  } catch (error: any) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects/:id', async (req, res) => {
  const id = decodeURIComponent(req.params.id);
  try {
    const projects = await readDB();
    const filtered = projects.filter(p => p.id !== id);
    
    if (filtered.length < projects.length) {
      await writeDB(filtered);
      res.status(200).json({ message: 'Project deleted successfully' });
    } else {
      res.status(404).json({ error: 'Project not found' });
    }
  } catch (error: any) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/projects', async (req, res) => {
  try {
    await writeDB([]);
    res.status(200).json({ message: 'All projects deleted successfully' });
  } catch (error: any) {
    console.error('Error clearing all projects:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
