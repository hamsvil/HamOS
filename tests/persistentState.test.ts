import { describe, it, expect, vi, beforeEach } from 'vitest';
import { persistentState } from '../src/services/persistentState';

global.fetch = vi.fn();
global.BroadcastChannel = vi.fn().mockImplementation(() => ({
  postMessage: vi.fn(),
  onmessage: null
}));

describe('Persistent State Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hydrates from API', async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ theme: 'dark', version: 5 })
    } as any);

    await persistentState.hydrate();
    expect(fetch).toHaveBeenCalledWith('/api/state');
  });
});
