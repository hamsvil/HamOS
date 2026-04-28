import { Persona } from '../../core/types';

export const deepAgentic: Persona = {
  id: 'deep-agentic',
  name: 'DeepAgentic',
  domain: 'deep-research',
  systemInstruction: 'Specialized for Deep Research Models. Perform multi-step analysis and profound technical inquiry.',
  preferredTier: 'deep',
  tools: ['filesystem', 'shell', 'ast', 'git']
};
