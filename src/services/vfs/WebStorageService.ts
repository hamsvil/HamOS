/**
 * WebStorageService - Handles Origin Private File System (OPFS) and Device I/O
 */
export class WebStorageService {
  private static instance: WebStorageService;

  private constructor() {}

  public static getInstance(): WebStorageService {
    if (!WebStorageService.instance) {
      WebStorageService.instance = new WebStorageService();
    }
    return WebStorageService.instance;
  }

  async saveToOPFS(filename: string, content: string): Promise<void> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(filename, { create: true });
      const writable = await (fileHandle as any).createWritable();
      await writable.write(content);
      await writable.close();
    } catch (error) {
      console.error('OPFS Save Error:', error);
      throw error;
    }
  }

  async readFromOPFS(filename: string): Promise<string | null> {
    try {
      const root = await navigator.storage.getDirectory();
      const fileHandle = await root.getFileHandle(filename);
      const file = await fileHandle.getFile();
      return await file.text();
    } catch (error) {
      if ((error as any).name === 'NotFoundError') return null;
      console.error('OPFS Read Error:', error);
      throw error;
    }
  }

  async listOPFS(): Promise<string[]> {
    try {
      const root = await navigator.storage.getDirectory();
      const files: string[] = [];
      for await (const name of (root as any).keys()) {
        files.push(name);
      }
      return files;
    } catch (error) {
      console.error('OPFS List Error:', error);
      return [];
    }
  }

  downloadToDevice(filename: string, content: string, mimeType: string = 'text/plain'): void {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async uploadFromDevice(): Promise<{ name: string; content: string }[]> {
    return new Promise((resolve, reject) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.multiple = true;
      input.onchange = async (e: any) => {
        const files = e.target.files;
        const results: { name: string; content: string }[] = [];
        try {
          for (const file of files) {
            const content = await file.text();
            results.push({ name: file.name, content });
          }
          resolve(results);
        } catch (err) {
          reject(err);
        }
      };
      input.click();
    });
  }
}

export const webStorage = WebStorageService.getInstance();
