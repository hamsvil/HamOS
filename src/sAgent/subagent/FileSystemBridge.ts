/* eslint-disable no-useless-assignment */
import { FunctionDeclaration, Type, Tool } from '@google/genai';

// Deklarasi Tools agar Agent mengerti cara memanggilnya
const readFileDeclaration: FunctionDeclaration = {
  name: 'readFile',
  description: 'Membaca isi dari sebuah file di dalam project.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Path absolut atau relatif ke file (contoh: /src/App.tsx)',
      },
    },
    required: ['path'],
  },
};

const writeFileDeclaration: FunctionDeclaration = {
  name: 'writeFile',
  description: 'Menulis atau menimpa isi sebuah file di dalam project.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      path: {
        type: Type.STRING,
        description: 'Path ke file yang akan ditulis',
      },
      content: {
        type: Type.STRING,
        description: 'Isi kode atau teks yang akan dimasukkan ke dalam file',
      },
    },
    required: ['path', 'content'],
  },
};

const listFilesDeclaration: FunctionDeclaration = {
  name: 'listFiles',
  description: 'Melihat daftar file dan folder di dalam sebuah direktori.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      directory: {
        type: Type.STRING,
        description: 'Path direktori (contoh: /src/components)',
      },
    },
    required: ['directory'],
  },
};

const searchCodeDeclaration: FunctionDeclaration = {
  name: 'searchCode',
  description: 'Mencari pattern teks atau kode di dalam seluruh project (Grep).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      pattern: {
        type: Type.STRING,
        description: 'Regex atau string yang dicari',
      },
    },
    required: ['pattern'],
  },
};

const getProjectStructureDeclaration: FunctionDeclaration = {
  name: 'getProjectStructure',
  description: 'Mendapatkan struktur folder seluruh project secara rekursif.',
  parameters: {
    type: Type.OBJECT,
    properties: {},
  },
};

// Kumpulan tools yang akan diberikan ke Agent
export const fileSystemTools: Tool[] = [
  {
    functionDeclarations: [
      readFileDeclaration, 
      writeFileDeclaration, 
      listFilesDeclaration,
      searchCodeDeclaration,
      getProjectStructureDeclaration
    ],
  },
];

// [SUPREME PROTOCOL] Universal File System Bridge
// Detects environment and uses either Browser VFS or Node.js FS
export let vfs: any;

async function getFSBackend() {
  if (typeof window !== 'undefined') {
    const vfsModule = await import('../../services/vfsService');
    vfs = vfsModule.vfs;
    return {
      readFile: (p: string) => vfs.readFile(p),
      writeFile: (p: string, c: string) => vfs.writeFile(p, c),
      listDir: (d: string) => vfs.listDir(d),
      search: (pat: string) => vfs.search(pat)
    };
  } else {
    // Node.js Implementation
    const fs = await import('node:fs');
    const path = await import('node:path');
    const root = process.cwd();
    const resolvePath = (p: string) => path.join(root, p.startsWith('/') ? p.slice(1) : p);

    return {
      readFile: (p: string) => fs.readFileSync(resolvePath(p), 'utf8'),
      writeFile: (p: string, c: string) => {
        const full = resolvePath(p);
        const dir = path.dirname(full);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(full, c);
        return true;
      },
      listDir: (d: string) => fs.readdirSync(resolvePath(d)),
      search: async (pat: string) => {
          // Simplistic grep in node
          const files = [];
          const listRecursive = (dir: string) => {
              const entries = fs.readdirSync(resolvePath(dir), { withFileTypes: true });
              for (const entry of entries) {
                  const res = path.join(dir, entry.name);
                  if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
                      listRecursive(res);
                  } else if (entry.isFile()) {
                      files.push(res);
                  }
              }
          };
          listRecursive('/');
          
          const results = [];
          for (const f of files) {
              const content = fs.readFileSync(resolvePath(f), 'utf8');
              if (content.match(new RegExp(pat, 'i'))) {
                  results.push({ path: f, matches: [{ line: 1, text: 'Found match' }] });
              }
          }
          return results;
      }
    };
  }
}

// Implementasi aktual dari tools (Akan di-binding saat function calling terjadi)
export const FileSystemBridge = {
  async readFile(args: { path: string }): Promise<string> {
    console.log(`[FS Bridge] Membaca file: ${args.path}`);
    const fs = await getFSBackend();
    return await fs.readFile(args.path);
  },

  async writeFile(args: { path: string, content: string }): Promise<boolean> {
    console.log(`[FS Bridge] Menulis ke file: ${args.path}`);
    const fs = await getFSBackend();
    await fs.writeFile(args.path, args.content);
    return true;
  },

  async listFiles(args: { directory: string }): Promise<string[]> {
    console.log(`[FS Bridge] Membaca direktori: ${args.directory}`);
    const fs = await getFSBackend();
    return await fs.listDir(args.directory);
  },

  async searchCode(args: { pattern: string }): Promise<string[]> {
    console.log(`[FS Bridge] Grep: ${args.pattern}`);
    const fs = await getFSBackend();
    const results = await fs.search(args.pattern);
    
    // Flatten results for the agent to consume as a list of match locations
    return results.flatMap(file => 
      file.matches.map(m => `${file.path}:${m.line}: ${m.text}`)
    );
  },

  async getProjectStructure(): Promise<any> {
    console.log(`[FS Bridge] Mendapatkan struktur project`);
    const fs = await getFSBackend();
    // For large projects, list recursive at root might be too much, return top level + indicators
    const rootDir = await fs.listDir('/');
    let srcDir = [];
    try { srcDir = await fs.listDir('/src'); } catch(e) {}
    return {
      root: rootDir,
      src: srcDir
    };
  }
};
