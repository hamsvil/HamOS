/* eslint-disable no-useless-assignment */
import { Request, Response } from 'express';
import axios from 'axios';

export const handleProxy = async (req: Request, res: Response) => {
  const targetUrl = req.headers['x-target-url'] as string;
  if (!targetUrl) {
    return res.status(400).json({ error: 'x-target-url header is required' });
  }

  try {
    const response = await axios({
      method: req.method,
      url: targetUrl,
      data: req.body,
      headers: {
        ...req.headers,
        host: new URL(targetUrl).host,
        'x-target-url': undefined
      },
      responseType: 'arraybuffer'
    });

    const hopByHopHeaders = [
      'connection',
      'keep-alive',
      'proxy-authenticate',
      'proxy-authorization',
      'te',
      'trailers',
      'transfer-encoding',
      'upgrade',
      'content-length',
      'host',
      'content-encoding'
    ];

    Object.entries(response.headers).forEach(([key, value]) => {
      if (!res.headersSent && !hopByHopHeaders.includes(key.toLowerCase())) {
        res.setHeader(key, value as string);
      }
    });

    if (!res.headersSent) {
      res.status(response.status).send(response.data);
    }
  } catch (error: any) {
    console.error('[Proxy] Error:', error.message);
    if (!res.headersSent) {
      res.status(error.response?.status || 500).send(error.response?.data || 'Proxy error');
    }
  }
};
