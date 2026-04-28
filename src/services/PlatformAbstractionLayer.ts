/* eslint-disable no-useless-assignment */
/**
 * Platform Abstraction Layer (PAL)
 * Provides a unified interface for platform-specific capabilities (Android/Web).
 */
import { nativeBridge } from '../utils/nativeBridge';
import { LoggerService } from './LoggerService';

export interface PlatformCapabilities {
  isNative: boolean;
  isBuilderAvailable: boolean;
}

export class PlatformAbstractionLayer {
  private static instance: PlatformAbstractionLayer;

  private constructor() {}

  public static getInstance(): PlatformAbstractionLayer {
    if (!PlatformAbstractionLayer.instance) {
      PlatformAbstractionLayer.instance = new PlatformAbstractionLayer();
    }
    return PlatformAbstractionLayer.instance;
  }

  public getCapabilities(): PlatformCapabilities {
    return {
      isNative: nativeBridge.isAvailable(),
      isBuilderAvailable: nativeBridge.isBuilderAvailable(),
    };
  }

  public async callAsync<T = any>(method: string, ...args: any[]): Promise<T> {
    if (!nativeBridge.isAvailable()) {
      throw new Error(`Platform capability ${method} not available on this platform.`);
    }
    try {
      return await nativeBridge.callAsync<T>(method, ...args);
    } catch (error) {
      LoggerService.error('PAL', `Error calling platform method ${method}`, error);
      throw error;
    }
  }

  public callSync<T = any>(method: string, ...args: any[]): T | null {
    if (!nativeBridge.isAvailable()) {
      return null;
    }
    try {
      return nativeBridge.call<T>(method, ...args);
    } catch (error) {
      LoggerService.error('PAL', `Error calling platform method ${method}`, error);
      return null;
    }
  }
}

export const pal = PlatformAbstractionLayer.getInstance();
