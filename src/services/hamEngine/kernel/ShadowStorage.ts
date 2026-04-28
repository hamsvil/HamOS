import { get, set, del } from 'idb-keyval';

export class ShadowStorage {
  private offloadedPaths: Set<string> = new Set();

  async offload(path: string, content: string): Promise<void> {
    try {
      await set(`shadow_vfs_${path}`, content);
      this.offloadedPaths.add(path);
    } catch (e: any) {
      if (e.name === 'QuotaExceededError' || e.message?.includes('quota')) {
        console.warn(`[SHADOW STORAGE]: Quota exceeded while offloading ${path}. Attempting cleanup...`);
        await this.cleanup();
        await set(`shadow_vfs_${path}`, content);
        this.offloadedPaths.add(path);
      } else {
        throw e;
      }
    }
  }

  async load(path: string): Promise<string | undefined> {
    if (this.offloadedPaths.has(path)) {
      return await get(`shadow_vfs_${path}`);
    }
    return undefined;
  }

  async delete(path: string): Promise<void> {
    await del(`shadow_vfs_${path}`);
    this.offloadedPaths.delete(path);
  }

  async cleanup(): Promise<void> {
    for (const path of this.offloadedPaths) {
      await del(`shadow_vfs_${path}`);
    }
    this.offloadedPaths.clear();
  }

  getOffloadedPaths(): Set<string> {
    return new Set(this.offloadedPaths);
  }

  setOffloadedPaths(paths: Set<string>) {
    this.offloadedPaths = new Set(paths);
  }

  has(path: string): boolean {
    return this.offloadedPaths.has(path);
  }

  clear() {
    this.offloadedPaths.clear();
  }
}
