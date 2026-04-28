/* eslint-disable no-useless-assignment */
import { nativeBridge } from '../utils/nativeBridge';
import { EnvironmentChecker } from './environmentChecker';

export class UniversalFsBridge {
  private static instance: UniversalFsBridge;

  private constructor() {}

  public static getInstance(): UniversalFsBridge {
    if (!UniversalFsBridge.instance) {
      UniversalFsBridge.instance = new UniversalFsBridge();
    }
    return UniversalFsBridge.instance;
  }

  private isNative(): boolean {
    return EnvironmentChecker.isNativeAndroid();
  }

  private async apiCall(endpoint: string, payload: any): Promise<any> {
    // Hybrid guard: in Node context (no window), use absolute URL with PORT env
    const base = (typeof window !== 'undefined' && window.location?.origin)
      ? ''
      : (process.env.PORT ? `http://localhost:${process.env.PORT}` : 'http://localhost:3000');
    
    // Ensure fetch is available in Node or browser
    if (typeof fetch === 'undefined') {
      return { success: false, error: 'fetch is not available' };
    }

    const response = await fetch(`${base}/api/fs/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    const text = await response.text();
    if (!text) {
      return { success: true }; // Assume success for empty response
    }

    try {
      const data = JSON.parse(text);
      if (!data.success) {
        throw new Error(data.error || `API Error: ${endpoint}`);
      }
      return data;
    } catch (e) {
      // If it's not JSON, but the response was OK, treat as success or raw data
      if (response.ok) return { success: true, data: text };
      throw new Error(`Failed to parse API response from ${endpoint}: ${text}`);
    }
  }

  async readFile(path: string): Promise<string> {
    if (this.isNative()) {
      const res = await nativeBridge.call<any>('readFile', { path });
      return res.data;
    }
    const data = await this.apiCall('read', { path });
    return data.content;
  }

  async writeFile(path: string, content: string): Promise<void> {
    if (this.isNative()) {
      await nativeBridge.call('writeFile', { path, data: content });
      return;
    }
    await this.apiCall('write', { path, content });
  }

  async listDir(path: string): Promise<string[]> {
    if (this.isNative()) {
      const res = await nativeBridge.call<any[]>('listDir', { path });
      return res.map(f => f.name || f.path.split('/').pop());
    }
    const data = await this.apiCall('list', { path });
    return data.files.map((f: any) => f.name);
  }

  async deleteFile(path: string): Promise<void> {
    if (this.isNative()) {
      await nativeBridge.call('deleteFile', { path });
      return;
    }
    await this.apiCall('delete', { path });
  }

  async mkdir(path: string): Promise<void> {
    if (this.isNative()) {
      await nativeBridge.call('mkdir', { path });
      return;
    }
    await this.apiCall('mkdir', { path });
  }

  async exists(path: string): Promise<boolean> {
    if (this.isNative()) {
      try {
        await nativeBridge.call('stat', { path });
        return true;
      } catch {
        return false;
      }
    }
    const data = await this.apiCall('exists', { path });
    return data.exists;
  }

  async stat(path: string): Promise<any> {
    if (this.isNative()) {
      return await nativeBridge.call('stat', { path });
    }
    const data = await this.apiCall('stat', { path });
    return data.stat;
  }
}

export const universalFs = UniversalFsBridge.getInstance();
