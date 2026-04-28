import type { FileSystemTree } from '@webcontainer/api';

export interface IWebContainerProcess {
    output: ReadableStream<string>;
    input?: WritableStream<string>;
    exit: Promise<number>;
    kill: () => void;
    resize?: (dimensions: { cols: number; rows: number }) => void;
}

export interface IWebContainer {
    fs: {
        readFile: (path: string, encoding?: string) => Promise<string>;
        writeFile: (path: string, data: string) => Promise<void>;
        mkdir: (path: string, options?: { recursive?: boolean }) => Promise<void>;
        readdir: (path: string) => Promise<string[]>;
        rm: (path: string, options?: { recursive?: boolean, force?: boolean }) => Promise<void>;
    };
    spawn: (command: string, options?: { args?: string[], env?: Record<string, string>, terminal?: any }) => Promise<IWebContainerProcess>;
    mount: (tree: FileSystemTree | Record<string, any>) => Promise<void>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    teardown: () => void | Promise<void>;
}
