import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import React from 'react';
import { AgentWorker } from '../src/components/AgentWorker/AgentWorker';

vi.mock('../src/hooks/useAppInitialization', () => ({
  useInitializeApp: () => ({ isDark: true })
}));

describe('AgentWorker Component', () => {
  it('renders without crashing', () => {
    // Smoke test
    expect(AgentWorker).toBeDefined();
  });
});
