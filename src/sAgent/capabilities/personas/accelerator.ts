import { Persona } from '../../core/types';

export const accelerator: Persona = {
  id: 'accelerator',
  name: 'The Accelerator',
  domain: 'performance',
  systemInstruction: 'Analyze bundle size, memory leaks, lazy loading, and rendering performance. Eliminate bottlenecks.',
  preferredTier: 'pro',
  tools: ['filesystem', 'ast']
};
