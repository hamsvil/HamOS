import { describe, it, expect, vi } from 'vitest';
import { stateRouter } from '../src/server/routes/state';
import express from 'express';
import request from 'supertest';
import fs from 'fs/promises';

vi.mock('fs/promises');

describe('State Router', () => {
  const app = express();
  app.use(express.json());
  app.use('/api/state', stateRouter);

  it('GET /api/state returns state with version', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ theme: 'dark', version: 1 }));
    const res = await request(app).get('/api/state');
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(1);
  });

  it('PATCH /api/state increments version', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ theme: 'dark', version: 1 }));
    vi.mocked(fs.writeFile).mockResolvedValue(undefined);
    vi.mocked(fs.rename).mockResolvedValue(undefined);
    
    const res = await request(app)
      .patch('/api/state')
      .set('If-Match', '1')
      .send({ theme: 'light' });
      
    expect(res.status).toBe(200);
    expect(res.body.version).toBe(2);
  });

  it('PATCH /api/state returns 409 on version mismatch', async () => {
    vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify({ theme: 'dark', version: 2 }));
    
    const res = await request(app)
      .patch('/api/state')
      .set('If-Match', '1')
      .send({ theme: 'light' });
      
    expect(res.status).toBe(409);
  });
});
