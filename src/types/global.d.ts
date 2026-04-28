declare module "@workspace/*";
declare module "@replit/*";

export {};

declare global {
  interface Navigator {
    deviceMemory?: number;
  }

  interface Window {
    hamShellProcess?: any;
    writeToTerminal?: (data: string) => void;
    Android?: any;
    AndroidBuilder?: any;
    onBrowserCapture?: any;
    onBrowserScriptResult?: any;
    __nativeBridgeCallbacks?: Record<string, Function>;
    __nativeBridgeCallbackHandler?: (id: string, data: any) => void;
  }

  interface FileSystemHandle {
    kind: 'file' | 'directory';
    name: string;
  }

  interface FileSystemDirectoryHandle extends FileSystemHandle {
    kind: 'directory';
    entries(): AsyncIterableIterator<[string, FileSystemHandle]>;
    getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandle>;
    getFileHandle(name: string, options?: { create?: boolean }): Promise<FileSystemFileHandle>;
  }

  interface FileSystemFileHandle extends FileSystemHandle {
    kind: 'file';
    getFile(): Promise<File>;
    createWritable(): Promise<FileSystemWritableFileStream>;
  }

  interface FileSystemWritableFileStream extends WritableStream {
    write(data: any): Promise<void>;
    close(): Promise<void>;
  }
}
