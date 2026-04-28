/* eslint-disable no-useless-assignment */
import { nativeBridgeService } from './nativeBridgeService';

export type PermissionType = 'storage' | 'camera' | 'microphone' | 'location';

export const PermissionService = {
  async requestPermission(permission: PermissionType): Promise<boolean> {
    try {
      const response = await nativeBridgeService.call('requestPermission', { permission }) as any;
      return response.granted === true;
    } catch (error) {
      // Failed to request permission
      return false;
    }
  },

  async checkPermission(permission: PermissionType): Promise<boolean> {
    try {
      const response = await nativeBridgeService.call('checkPermission', { permission }) as any;
      return response.granted === true;
    } catch (error) {
      // Failed to check permission
      return false;
    }
  }
};
