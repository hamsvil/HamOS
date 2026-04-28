/* eslint-disable no-useless-assignment */
import { Request, Response } from 'express';
import axios from 'axios';
import { JSDOM } from 'jsdom';
import { Readability } from '@mozilla/readability';

export const handleReader = async (req: Request, res: Response) => {
  const { url } = req.query;
  if (!url || typeof url !== 'string') {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      },
      timeout: 10000
    });

    const dom = new JSDOM(response.data, { url });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) {
      if (!res.headersSent) {
        return res.status(500).json({ error: 'Failed to parse article' });
      }
      return;
    }

    if (!res.headersSent) {
      res.json({
        title: article.title,
        content: article.content,
        textContent: article.textContent,
        excerpt: article.excerpt,
        byline: article.byline,
        dir: article.dir,
        siteName: article.siteName,
        lang: article.lang
      });
    }
  } catch (error: any) {
    console.error('[Reader] Error:', error.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Failed to fetch or parse content' });
    }
  }
};
