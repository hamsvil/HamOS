import express from 'express';
import { MediaAgentService } from '../../services/mediaAgent/MediaAgentService';

const router = express.Router();

// Get queue
router.get('/queue', async (req, res) => {
  try {
    const queue = await MediaAgentService.getQueue();
    res.json(queue);
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
});

// Add to queue
router.post('/queue', async (req, res) => {
  try {
    const { content, platform, schedule } = req.body;
    if (!content || typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required and must be a string' });
    }
    const newItem = await MediaAgentService.addToQueue({ 
      content, 
      platform: platform || 'all', 
      schedule: schedule || 'now' 
    });
    res.json(newItem);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

// Trends
router.get('/trends', async (req, res) => {
  try {
    const trends = await MediaAgentService.getTrends();
    res.json(trends);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

export const mediaAgentRouter = router;
