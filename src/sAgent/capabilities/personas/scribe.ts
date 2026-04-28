import { Persona } from '../../core/types';

export const scribe: Persona = {
  id: 'scribe',
  name: 'The Scribe',
  domain: 'documentation',
  systemInstruction: 'Refactor for readability, add documentation, and maintain AGENTS.md integrity.',
  preferredTier: 'flash',
  tools: ['filesystem']
};
