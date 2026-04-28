/* eslint-disable no-useless-assignment */
import express from 'express';
import { getAppStatus, readHamliMemory, writeHamliMemory } from '../db';

const router = express.Router();

// App Status Endpoint
router.get('/app-status', async (req, res) => {
  try {
    const status = await getAppStatus();
    res.status(200).json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Hamli Memory Endpoints
router.get('/hamli/memory', async (req, res) => {
  try {
    const memory = await readHamliMemory();
    res.status(200).json(memory);
  } catch (error: any) {
    console.error('Error fetching Hamli Memory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/hamli/memory/dynamic', async (req, res) => {
  const { content, type = 'interaction' } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    const memory = await readHamliMemory();
    const newEntry = {
      id: `dyn_${Date.now()}_${memory.dynamic.length}`,
      type,
      content,
      timestamp: Date.now()
    };
    memory.dynamic.push(newEntry);
    
    // We don't delete old memory, just append
    await writeHamliMemory(memory);
    res.status(201).json({ message: 'Memory added successfully', entry: newEntry });
  } catch (error: any) {
    console.error('Error saving Hamli Memory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/hamli/memory/static', async (req, res) => {
  const { content, type = 'core_knowledge' } = req.body;
  if (!content) {
    return res.status(400).json({ error: 'Content is required' });
  }
  try {
    const memory = await readHamliMemory();
    const newEntry = {
      id: `stat_${Date.now()}_${memory.static.length}`,
      type,
      content,
      timestamp: Date.now()
    };
    memory.static.push(newEntry);
    
    await writeHamliMemory(memory);
    res.status(201).json({ message: 'Static Memory added successfully', entry: newEntry });
  } catch (error: any) {
    console.error('Error saving Hamli Static Memory:', error);
    res.status(500).json({ error: error.message });
  }
});

router.delete('/hamli/memory/:category/:id', async (req, res) => {
  const { category, id } = req.params;
  if (category !== 'static' && category !== 'dynamic') {
    return res.status(400).json({ error: 'Invalid category' });
  }
  try {
    const memory = await readHamliMemory();
    const initialLength = memory[category].length;
    memory[category] = memory[category].filter((m: any) => m.id !== id);
    
    if (memory[category].length < initialLength) {
      await writeHamliMemory(memory);
      res.status(200).json({ message: 'Memory deleted successfully' });
    } else {
      res.status(404).json({ error: 'Memory entry not found' });
    }
  } catch (error: any) {
    console.error('Error deleting Hamli Memory:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
