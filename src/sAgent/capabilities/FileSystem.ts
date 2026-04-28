import { FunctionDeclaration, Type, Tool } from '@google/genai';

/**
 * FileSystem Capability for Sovereign
 */
export const fileSystemDeclarations: FunctionDeclaration[] = [
  {
    name: 'readFile',
    description: 'Read file content from project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING }
      },
      required: ['path']
    }
  },
  {
    name: 'writeFile',
    description: 'Write or overwrite file content.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING },
        content: { type: Type.STRING }
      },
      required: ['path', 'content']
    }
  },
  {
    name: 'listDir',
    description: 'List contents of a directory.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        path: { type: Type.STRING }
      },
      required: ['path']
    }
  },
  {
    name: 'grep',
    description: 'Search for text pattern in project.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        pattern: { type: Type.STRING }
      },
      required: ['pattern']
    }
  }
];

export const fileSystemTools: Tool[] = [
  { functionDeclarations: fileSystemDeclarations }
];

export const fileSystemImplementations = {
  readFile: async ({ path: p }: { path: string }) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fullPath = path.resolve(process.cwd(), p.startsWith('/') ? p.slice(1) : p);
    return fs.readFileSync(fullPath, 'utf8');
  },
  writeFile: async ({ path: p, content }: { path: string, content: string }) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fullPath = path.resolve(process.cwd(), p.startsWith('/') ? p.slice(1) : p);
    const dir = path.dirname(fullPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(fullPath, content);
    return { success: true, path: p };
  },
  listDir: async ({ path: d }: { path: string }) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const fullPath = path.resolve(process.cwd(), d.startsWith('/') ? d.slice(1) : d);
    if (!fs.existsSync(fullPath)) return [];
    return fs.readdirSync(fullPath);
  },
  grep: async ({ pattern }: { pattern: string }) => {
    try {
      const { exec } = await import('node:child_process');
      const util = await import('node:util');
      const execPromise = util.promisify(exec);
      
      const { stdout } = await execPromise(`grep -rn "${pattern.replace(/"/g, '\\"')}" ${process.cwd()}`);
      return { status: 'found', pattern, stdout: stdout.split('\n').slice(0, 50).join('\n') }; // truncate to avoid massive payloads
    } catch (error: any) {
      if (error.code === 1) {
        return { status: 'not found', pattern, stdout: '' };
      }
      return { status: 'error', error: error.message };
    }
  }
};
