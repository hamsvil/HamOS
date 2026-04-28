import express from 'express';
import { GeneratorStudioService } from '../../services/generatorStudio/GeneratorStudioService';

const router = express.Router();

router.post('/process', async (req, res) => {
  try {
    const { prompt, type, options } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (!type || !['video', 'audio', 'voice'].includes(type)) {
      return res.status(400).json({ error: 'Invalid generation type' });
    }
    const result = await GeneratorStudioService.generate({ prompt, type, options });
    res.json(result);
  } catch (e: any) {
    req.log?.error(e);
    res.status(500).json({ error: e.message || 'Internal Server Error' });
  }
});

export const generatorStudioRouter = router;
