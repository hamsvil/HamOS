/* eslint-disable no-useless-assignment */
/* eslint-disable no-async-promise-executor */
import { nativeBridge as safeNativeBridge } from '../utils/nativeBridge';

export interface LocationData {
  latitude: number;
  longitude: number;
}

export interface AccelerometerData {
  x: number;
  y: number;
  z: number;
}

export class NativeBridgeService {
  private static instance: NativeBridgeService;

  private constructor() {}

  public static getInstance(): NativeBridgeService {
    if (!NativeBridgeService.instance) {
      NativeBridgeService.instance = new NativeBridgeService();
    }
    return NativeBridgeService.instance;
  }

  public isNative(): boolean {
    return safeNativeBridge.isAvailable();
  }

  public getStatus(): 'active' | 'unavailable' | 'simulated' {
    if (this.isNative()) return 'active';
    // Strict Anti-Simulation: We do NOT simulate native features.
    return 'unavailable';
  }

  public async call(method: string, args: any, timeoutMs: number = 10000): Promise<unknown> {
    if (this.isNative()) {
      const startTime = performance.now();
      
      const callPromise = new Promise(async (resolve, reject) => {
        try {
          // Use the safe utility which handles JSON stringification/parsing and error checking
          const result = await safeNativeBridge.call(method, args);
          const duration = performance.now() - startTime;
          resolve(result);
        } catch (e) {
          reject(e);
        }
      });

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error(`Native method ${method} timed out after ${timeoutMs}ms`)), timeoutMs);
      });

      return Promise.race([callPromise, timeoutPromise]);
    }
    return null;
  }

  public async requestBiometricAuth(promptMessage: string): Promise<{ success: boolean; error?: string }> {
    if (this.isNative()) {
      try {
        const result = await this.call('requestBiometricAuth', promptMessage);
        if (result === 'true' || result === true) return { success: true };
        
        // Handle specific error codes if returned by native
        if (typeof result === 'string' && result.startsWith('ERROR:')) {
            return { success: false, error: result.substring(6) };
        }
        return { success: false, error: 'Authentication failed or canceled' };
      } catch (e: any) {
        const err = e as Error;
        return { success: false, error: err.message || 'Unknown error' };
      }
    }
    return { success: false, error: 'Not available' };
  }

  public startBackgroundService(serviceName: string, taskData: string): void {
    if (this.isNative()) {
      safeNativeBridge.call('startBackgroundService', serviceName, taskData);
    } else {
      // Background Services not available in this environment
    }
  }

  public stopBackgroundService(serviceName: string): void {
    if (this.isNative()) {
      safeNativeBridge.call('stopBackgroundService', serviceName);
    }
  }

  public async getGpsLocation(): Promise<LocationData | null> {
    if (this.isNative()) {
      return safeNativeBridge.call<LocationData>('getGpsLocation');
    }
    return null;
  }

  public async getAccelerometerData(): Promise<AccelerometerData | null> {
    if (this.isNative()) {
      return safeNativeBridge.call<AccelerometerData>('getAccelerometerData');
    }
    return null;
  }

  public async scanBluetoothDevices(): Promise<string[]> {
    if (this.isNative()) {
      const result = safeNativeBridge.call<string[]>('scanBluetoothDevices');
      return result || [];
    }
    return [];
  }
}

export const nativeBridgeService = NativeBridgeService.getInstance();
