/* eslint-disable no-useless-assignment */
import express from 'express';
import axios from 'axios';
import { getRandomUserAgent } from '../config/userAgents';

const router = express.Router();

/**
 * OMNI-BYPASS TUNNEL (BFF Proxy)
 * Menembus CORS dan WAF dengan Header Spoofing (Aggressive Bypass)
 */
router.post('/', async (req, res) => {
  const { url, method = 'GET', data, headers = {} } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required for tunneling' });
  }

  try {
    const response = await axios({
      url,
      method,
      data,
      headers: {
        ...headers,
        // 1. User-Agent Bervariasi (Menghindari bot detection)
        'User-Agent': getRandomUserAgent(),
        // 2. Referer Palsu (Menipu server seolah kita datang dari Google)
        'Referer': 'https://www.google.com/',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"',
        'Sec-Fetch-Dest': 'document',
        'Sec-Fetch-Mode': 'navigate',
        'Sec-Fetch-Site': 'cross-site',
        'Upgrade-Insecure-Requests': '1'
      },
      // Mengabaikan error SSL/TLS jika diperlukan
      validateStatus: () => true, 
    });

    res.status(response.status).json({
      data: response.data,
      headers: response.headers,
      status: response.status
    });

  } catch (error: any) {
    console.warn("[OMNI-TUNNEL] Bypass Gagal:", error.message);
    res.status(502).json({
      error: 'Tunnel connection failed',
      message: error.message,
      data: null
    });
  }
});

export default router;
