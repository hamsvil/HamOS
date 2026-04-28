import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const MetaToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.MANAGE_LONG_TERM_MEMORY,
    description: 'Save a lesson learned to the Vector DB.',
    parameters: {
      type: Type.OBJECT,
      properties: { memory: { type: Type.STRING } },
      required: ['memory']
    }
  },
  {
    name: HamToolName.UPGRADE_ENGINE_CORE,
    description: 'Modify the HamEngine source code to self-improve.',
    parameters: {
      type: Type.OBJECT,
      properties: { instruction: { type: Type.STRING } },
      required: ['instruction']
    }
  },
  {
    name: HamToolName.SPAWN_EPHEMERAL_THREAD,
    description: 'Spawn a sub-agent thread to solve a specific sub-problem.',
    parameters: {
      type: Type.OBJECT,
      properties: { task: { type: Type.STRING } },
      required: ['task']
    }
  },
  {
    name: HamToolName.ANALYZE_USER_TELEMETRY,
    description: 'Analyze user behavior data to improve UX.',
    parameters: { type: Type.OBJECT, properties: {} }
  },
  {
    name: HamToolName.GENERATE_MEDIA_ASSETS,
    description: 'Generate images or videos using GenAI models.',
    parameters: {
      type: Type.OBJECT,
      properties: { prompt: { type: Type.STRING } },
      required: ['prompt']
    }
  }
];
