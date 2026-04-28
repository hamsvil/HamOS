import { Type, FunctionDeclaration } from '@google/genai';
import { HamToolName } from '../types';

export const BaseToolkit: FunctionDeclaration[] = [
  {
    name: HamToolName.LIST_DIR,
    description: 'List the contents of a directory to understand the project structure.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to directory' } },
      required: ['path']
    }
  },
  {
    name: HamToolName.VIEW_FILE,
    description: 'View the contents of a specific file. Always call this before editing.',
    parameters: {
      type: Type.OBJECT,
      properties: { path: { type: Type.STRING, description: 'Absolute path to file' } },
      required: ['path']
    }
  },
  {
    name: HamToolName.SHELL_EXEC,
    description: 'Execute a shell command. Use grep to search codebase, or npx to install packages. Set serverSide to true for native server-side execution.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        command: { type: Type.STRING, description: 'Shell command (e.g., grep -rI "pattern" .)' },
        serverSide: { type: Type.BOOLEAN, description: 'Force execution on the native server-side (Cloud Shell) instead of WebContainer.' }
      },
      required: ['command']
    }
  },
  {
    name: HamToolName.READ_URL_CONTENT,
    description: 'Fetch content from a URL via HTTP request. Converts HTML to markdown.',
    parameters: {
      type: Type.OBJECT,
      properties: { url: { type: Type.STRING, description: 'URL to read' } },
      required: ['url']
    }
  },
  {
    name: HamToolName.VIEW_CONTENT_CHUNK,
    description: 'View a specific chunk of document content using its DocumentId and chunk position.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        document_id: { type: Type.STRING },
        position: { type: Type.INTEGER }
      },
      required: ['document_id', 'position']
    }
  },
  {
    name: HamToolName.QUERY_LIVE_DATABASE,
    description: 'Query the live Firestore database to inspect data state.',
    parameters: {
      type: Type.OBJECT,
      properties: { 
        collection: { type: Type.STRING },
        query: { type: Type.OBJECT, description: 'Optional query parameters' }
      },
      required: ['collection']
    }
  },
  {
    name: HamToolName.LOAD_CONTEXTUAL_TOOLKIT,
    description: 'Switch the active toolkit to access different tools. Available toolkits: "coder", "qa_vision", "devops", "meta", "advanced_diagnostics".',
    parameters: {
      type: Type.OBJECT,
      properties: { toolkitName: { type: Type.STRING, description: 'Name of the toolkit to load' } },
      required: ['toolkitName']
    }
  },
  {
    name: HamToolName.FINISH_TASK,
    description: 'Call this when the task is 100% complete and verified by linter/compiler.',
    parameters: {
      type: Type.OBJECT,
      properties: { summary: { type: Type.STRING, description: 'Summary of what was accomplished' } },
      required: ['summary']
    }
  }
];
