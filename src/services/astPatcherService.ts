/* eslint-disable no-useless-assignment */
import { vfs } from './vfsService';
import { LoggerService } from './LoggerService';

export const astPatcherService = {
  async scanAndInjectPermissions(code: string, filePath: string): Promise<void> {
    const permissionsToRequest: string[] = [];

    // Simple regex-based AST patching (for demonstration, a real AST parser like oxc is better)
    if (code.includes('navigator.geolocation')) {
      permissionsToRequest.push('geolocation');
    }
    if (code.includes('navigator.mediaDevices.getUserMedia')) {
      if (code.includes('video: true')) permissionsToRequest.push('camera');
      if (code.includes('audio: true')) permissionsToRequest.push('microphone');
    }

    if (permissionsToRequest.length > 0) {
      try {
        let metadata = { requestFramePermissions: [] as string[] };
        try {
          const metadataContent = await vfs.readFile('/metadata.json');
          metadata = JSON.parse(metadataContent);
        } catch (e) {
          // File might not exist
        }

        let updated = false;
        for (const perm of permissionsToRequest) {
          if (!metadata.requestFramePermissions.includes(perm)) {
            metadata.requestFramePermissions.push(perm);
            updated = true;
          }
        }

        if (updated) {
          await vfs.writeFile('/metadata.json', JSON.stringify(metadata, null, 2));
          LoggerService.info('ASTPatcher', `Injected permissions: ${permissionsToRequest.join(', ')}`);
          
          // Trigger UI prompt
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('ham-permission-prompt', {
              detail: { permissions: permissionsToRequest }
            }));
          }
        }
      } catch (e) {
        LoggerService.error('ASTPatcher', 'Failed to inject permissions', e);
      }
    }
  }
};
