/* eslint-disable no-useless-assignment */
import { DOMSnapshot } from './types';
import { io, Socket } from 'socket.io-client';

export class SingularityBridge {
  private listeners: Set<(snapshot: DOMSnapshot) => void> = new Set();
  private socket: Socket | null = null;
  private broadcastChannel: BroadcastChannel | null = null;
  private webWorker: Worker | null = null;

  constructor() {
    this.initSocket();
    this.initBroadcastChannel();
    this.initWebWorker();
  }

  private initWebWorker() {
    if (typeof window !== 'undefined') {
      this.webWorker = new Worker(new URL('../../../workers/web.worker.ts', import.meta.url), { type: 'module' });
    }
  }

  private initBroadcastChannel() {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('ham_dom_snapshot_channel');
      this.broadcastChannel.onmessage = (event) => {
        if (event.data?.type === 'DOM_SNAPSHOT_RESULT') {
          const snapshot: DOMSnapshot = event.data.payload;
          this.notifyListeners(snapshot);
        }
      };
    } else {
      this.setupMessageListener(); // Fallback
    }
  }

  private initSocket() {
    if (typeof window !== 'undefined') {
      // Connect to the terminal socket endpoint
      this.socket = io(window.location.origin, {
        path: '/terminal-socket/',
        transports: ['websocket', 'polling'],
        autoConnect: true,
      });

      this.socket.on('connect', () => {
        // console.log('[SingularityBridge] Socket connected');
      });

      this.socket.on('connect_error', (err) => {
        console.error('[SingularityBridge] Socket connection error:', err);
      });
    }
  }

  public async runShellCommand(command: string): Promise<string> {
    return new Promise((resolve) => {
      if (!this.socket) {
        resolve('Error: Socket not initialized');
        return;
      }

      if (!this.socket.connected) {
        this.socket.connect();
      }

      // console.log(`[SingularityBridge] Requesting shell execution: ${command}`);
      
      this.socket.emit('execute_command', { command }, (res: { output: string, isError: boolean }) => {
        // console.log(`[SingularityBridge] Shell output received (error: ${res.isError})`);
        resolve(res.output || (res.isError ? 'Command failed with no output' : 'Command executed successfully with no output'));
      });

      // Timeout after 30 seconds
      setTimeout(() => {
        resolve('Error: Command execution timed out');
      }, 30000);
    });
  }

  private setupMessageListener() {
    if (typeof window !== 'undefined') {
      window.addEventListener('message', (event) => {
        if (event.data?.type === 'DOM_SNAPSHOT_RESULT') {
          const snapshot: DOMSnapshot = event.data.payload;
          this.notifyListeners(snapshot);
        }
      });
    }
  }

  public async getActiveTabSnapshot(): Promise<DOMSnapshot | null> {
    return new Promise((resolve) => {
      let timeout: ReturnType<typeof setTimeout>;

      const listener = (snapshot: DOMSnapshot) => {
        clearTimeout(timeout);
        this.listeners.delete(listener);
        resolve(snapshot);
      };

      timeout = setTimeout(() => {
        this.listeners.delete(listener);
        resolve(null);
      }, 2000); // Increased timeout slightly for BroadcastChannel

      this.listeners.add(listener);

      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({ type: 'GET_DOM_SNAPSHOT' });
      } else if (typeof window !== 'undefined') {
        window.postMessage({ type: 'GET_DOM_SNAPSHOT' }, '*');
      }
    });
  }

  private notifyListeners(snapshot: DOMSnapshot) {
    for (const listener of this.listeners) {
      listener(snapshot);
    }
  }

  public async extractContext(snapshot: DOMSnapshot): Promise<string> {
    if (this.webWorker) {
      return new Promise((resolve) => {
        const id = Date.now();
        const listener = (e: MessageEvent) => {
          if (e.data.id === id && (e.data.type === 'EXTRACT_SUCCESS' || e.data.type === 'ERROR')) {
            this.webWorker?.removeEventListener('message', listener);
            resolve(e.data.payload || '');
          }
        };
        this.webWorker!.addEventListener('message', listener);
        this.webWorker!.postMessage({ type: 'EXTRACT_CONTEXT', payload: { html: snapshot.content }, id });
      });
    }

    // Fallback to main thread extraction
    const parser = new DOMParser();
    const doc = parser.parseFromString(snapshot.content, 'text/html');
    
    // Remove scripts, styles, nav, footer
    const elementsToRemove = doc.querySelectorAll('script, style, nav, footer, iframe, noscript');
    elementsToRemove.forEach(el => el.remove());

    const textContent = doc.body.textContent || '';
    // Clean up whitespace
    return textContent.replace(/\s+/g, ' ').trim();
  }
}
