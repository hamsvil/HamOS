/* eslint-disable no-useless-assignment */
import * as Y from 'yjs';
import { WebrtcProvider } from 'y-webrtc';
import { LoggerService } from './LoggerService';

class YjsMetadataSyncService {
  private doc: Y.Doc | null = null;
  private provider: WebrtcProvider | null = null;
  private metadataMap: Y.Map<unknown> | null = null;

  init(roomName: string) {
    if (this.doc) return;

    this.doc = new Y.Doc();
    
    // Use public signaling servers for free WebRTC
    this.provider = new WebrtcProvider(roomName, this.doc, {
      signaling: [
        'wss://signaling.yjs.dev',
        'wss://y-webrtc-signaling-eu.herokuapp.com',
        'wss://y-webrtc-signaling-us.herokuapp.com'
      ]
    });

    this.metadataMap = this.doc.getMap('metadata');

    this.metadataMap.observe(event => {
      LoggerService.info('YjsMetadataSync', 'Metadata updated remotely', event.changes);
      // Trigger UI update
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('ham-metadata-sync', {
          detail: { metadata: this.metadataMap?.toJSON() }
        }));
      }
    });

    LoggerService.info('YjsMetadataSync', `Initialized WebRTC sync for room: ${roomName}`);
  }

  setMetadata(key: string, value: any) {
    if (this.metadataMap) {
      this.metadataMap.set(key, value);
    }
  }

  getMetadata(key: string): any {
    return this.metadataMap ? this.metadataMap.get(key) : null;
  }

  getAllMetadata(): Record<string, any> {
    return this.metadataMap ? this.metadataMap.toJSON() : {};
  }

  destroy() {
    if (this.provider) {
      this.provider.destroy();
      this.provider = null;
    }
    if (this.doc) {
      this.doc.destroy();
      this.doc = null;
    }
    this.metadataMap = null;
  }
}

export const yjsMetadataSyncService = new YjsMetadataSyncService();
