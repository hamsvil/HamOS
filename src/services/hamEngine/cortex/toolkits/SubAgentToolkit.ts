import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const SubAgentToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.SUBAGENT_READ_FILE,
    description: 'Read a file via the SubAgent bridge.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.SUBAGENT_WRITE_FILE,
    description: 'Write a file via the SubAgent bridge.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING }, content: { type: Type.STRING } },
      required: ['path', 'content']
    }
  },
  {
    name: HamToolName.SUBAGENT_LIST_FILES,
    description: 'List files via the SubAgent bridge.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.SUBAGENT_SEARCH_CODE,
    description: 'Search code via the SubAgent bridge.',
    parameters: {
      type: Type.OBJECT,
      properties: { query: { type: Type.STRING } },
      required: ['query']
    }
  },
  {
    name: HamToolName.SUBAGENT_GET_PROJECT_STRUCTURE,
    description: 'Get project structure via the SubAgent bridge.',
    parameters: { type: Type.OBJECT, properties: {} }
  }
];
