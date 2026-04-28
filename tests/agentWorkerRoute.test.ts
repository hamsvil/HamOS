import { describe, it, expect } from 'vitest';
import { agentWorkerRouter } from '../src/server/routes/agentWorker';

describe('Agent Worker Router', () => {
  it('exists', () => {
    expect(agentWorkerRouter).toBeDefined();
  });
});
