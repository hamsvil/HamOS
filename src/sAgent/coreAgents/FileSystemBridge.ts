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

// Implementasi aktual dari tools (Akan di-binding saat function calling terjadi)
export const FileSystemBridge = {
  async readFile(path: string): Promise<string> {
    console.log(`[FS Bridge] Membaca file: ${path}`);
    const { vfs } = await import('../../services/vfsService');
    return await vfs.readFile(path);
  },

  async writeFile(path: string, content: string): Promise<boolean> {
    console.log(`[FS Bridge] Menulis ke file: ${path}`);
    const { vfs } = await import('../../services/vfsService');
    await vfs.writeFile(path, content);
    return true;
  },

  async listFiles(directory: string): Promise<string[]> {
    console.log(`[FS Bridge] Membaca direktori: ${directory}`);
    const { vfs } = await import('../../services/vfsService');
    return await vfs.listDir(directory);
  },

  async searchCode(pattern: string): Promise<string[]> {
    console.log(`[FS Bridge] Grep: ${pattern}`);
    // Mock grep implementation using VFS
    return [`Found match for ${pattern} in /src/App.tsx`];
  },

  async getProjectStructure(): Promise<any> {
    console.log(`[FS Bridge] Mendapatkan struktur project`);
    const { vfs } = await import('../../services/vfsService');
    return await vfs.listDir('/');
  }
};
