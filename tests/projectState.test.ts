import { describe, it, expect } from 'vitest';
import { useProjectStateStore } from '../src/store/projectState';

describe('Project State Store', () => {
  it('updates theme', () => {
    useProjectStateStore.getState().setTheme('light');
    expect(useProjectStateStore.getState().theme).toBe('light');
  });

  it('hydrates state', () => {
    useProjectStateStore.getState().hydrate({ layout: 'mobile' });
    expect(useProjectStateStore.getState().layout).toBe('mobile');
  });
});
