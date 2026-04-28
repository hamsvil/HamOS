import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const CoderToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.CREATE_FILE,
    description: 'Create a new file with the specified content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to the new file' },
        content: { type: Type.STRING, description: 'Content of the file' }
      },
      required: ['path', 'content']
    }
  },
  {
    name: HamToolName.EDIT_FILE,
    description: 'Surgically edit a file by replacing a specific target string.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to file' },
        targetContent: { type: Type.STRING, description: 'String to replace' },
        replacementContent: { type: Type.STRING, description: 'New content to insert' }
      },
      required: ['path', 'targetContent', 'replacementContent']
    }
  },
  {
    name: HamToolName.MULTI_EDIT_FILE,
    description: 'Edit multiple non-contiguous blocks in the same file simultaneously.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING, description: 'Absolute path to file' },
        edits: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              targetContent: { type: Type.STRING },
              replacementContent: { type: Type.STRING }
            }
          }
        }
      },
      required: ['path', 'edits']
    }
  },
  {
    name: HamToolName.DELETE_FILE,
    description: 'Delete an existing file.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to file' } },
      required: ['path']
    }
  },
  {
    name: HamToolName.MOVE,
    description: 'Move or rename a file or directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        sourcePath: { type: Type.STRING },
        destinationPath: { type: Type.STRING }
      },
      required: ['sourcePath', 'destinationPath']
    }
  },
  {
    name: HamToolName.DELETE_DIR,
    description: 'Delete an entire directory recursively.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  },
  {
    name: HamToolName.RUN_MENTAL_SANDBOX,
    description: 'Execute a snippet of Node.js code in an isolated memory sandbox.',
    parameters: {
      type: Type.OBJECT,
      properties: { code: { type: Type.STRING } },
      required: ['code']
    }
  },
  {
    name: HamToolName.RUN_HS_CODE,
    description: 'Execute cHams V5.5 code for extreme token efficiency.',
    parameters: {
      type: Type.OBJECT,
      properties: { code: { type: Type.STRING } },
      required: ['code']
    }
  },
  {
    name: HamToolName.CHECK_SYNTAX,
    description: 'Instantly check the syntax of a file in memory (ShadowVFS).',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING } },
      required: ['path']
    }
  }
];
