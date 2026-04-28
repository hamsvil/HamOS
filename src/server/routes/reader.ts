/* eslint-disable no-useless-assignment */
import express from 'express';

const router = express.Router();
const chromeAgent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36";

// Reader API: High-Precision Content Extraction (The Singularity Reader)
router.get('/', async (req, res) => {
  const targetUrl = req.query.url as string;
  if (!targetUrl) return res.status(400).json({ error: 'Missing target URL' });

  try {
    const { default: axios } = await import('axios');
    const { JSDOM } = await import('jsdom');
    const { Readability } = await import('@mozilla/readability');

    const response = await axios.get(targetUrl, {
      headers: { 'User-Agent': chromeAgent },
      timeout: 15000,
      responseType: 'text'
    });

    const dom = new JSDOM(response.data, { url: targetUrl });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      return res.status(404).json({ error: 'Could not extract readable content from this page.' });
    }

    res.json(article);
  } catch (err: any) {
    console.error('[Reader API] Failure:', err.message);
    res.status(500).json({ error: 'Reader extraction failed', message: err.message });
  }
});

export default router;
