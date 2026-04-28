/* eslint-disable no-useless-assignment */
export class VFSCache {
  private fileCache: Map<string, string> = new Map();
  private dirCache: Map<string, string[]> = new Map();
  private readonly MAX_CACHE_SIZE = 1000;

  public get(path: string): string | undefined {
    return this.fileCache.get(path);
  }

  public set(path: string, content: string) {
    if (this.fileCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.fileCache.keys().next().value;
      if (firstKey) this.fileCache.delete(firstKey);
    }
    this.fileCache.set(path, content);
  }

  public getDir(path: string): string[] | undefined {
    return this.dirCache.get(path);
  }

  public setDir(path: string, contents: string[]) {
    if (this.dirCache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.dirCache.keys().next().value;
      if (firstKey) this.dirCache.delete(firstKey);
    }
    this.dirCache.set(path, contents);
  }

  public delete(path: string) {
    this.fileCache.delete(path);
    const parentDir = path.substring(0, path.lastIndexOf('/')) || '/';
    this.dirCache.delete(parentDir);
    this.dirCache.delete(path);
  }

  public clear() {
    this.fileCache.clear();
    this.dirCache.clear();
  }

  public size(): number {
    return this.fileCache.size;
  }
}
