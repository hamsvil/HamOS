/* eslint-disable no-useless-assignment */
import { vfs } from './vfsService';
import { nativeBridge } from '../utils/nativeBridge';
import { nativeFileService } from './nativeFileService';
import { EnvironmentChecker } from './environmentChecker';
import type { IWebContainer, IWebContainerProcess } from '../types/webcontainer';

export function createNativeMockWebContainer(serviceInstance: any): IWebContainer {
    const mockFs = {
        readFile: async (path: string, encoding?: string) => {
            const absPath = path.startsWith('/') ? path : '/' + path;
            return await vfs.readFile(absPath);
        },
        writeFile: async (path: string, data: string) => {
            const absPath = path.startsWith('/') ? path : '/' + path;
            await vfs.writeFile(absPath, data);
        },
        mkdir: async (path: string, options?: { recursive?: boolean }) => {
            const absPath = path.startsWith('/') ? path : '/' + path;
            await vfs.mkdir(absPath);
        },
        readdir: async (path: string) => {
            const absPath = path.startsWith('/') ? path : '/' + path;
            return await vfs.readdir(absPath);
        },
        rm: async (path: string, options?: { recursive?: boolean, force?: boolean }) => {
            const absPath = path.startsWith('/') ? path : '/' + path;
            await vfs.deleteFile(absPath);
        }
    };

    return {
        fs: mockFs,
        spawn: async (command: string, options?: { args?: string[], env?: Record<string, string> }): Promise<IWebContainerProcess> => {
            
            // Handle NPM commands
            if (command === 'npm') {
                const args = options?.args || [];
                
                // npm install -> Skip in native mode (or handle if native node exists)
                if (args.includes('install') || args.includes('i')) {
                    const stream = new ReadableStream<string>({
                        start(controller) {
                            controller.enqueue('Native Mode: Dependency installation skipped (assumed pre-installed or handled externally).\\n');
                            controller.enqueue('Done.\\n');
                            controller.close();
                        }
                    });
                    return {
                        output: stream,
                        exit: Promise.resolve(0),
                        kill: () => {}
                    };
                }
                
                // npm run dev / start -> Start Native Server
                if (args.includes('run') && (args.includes('dev') || args.includes('start'))) {
                    try {
                        if (EnvironmentChecker.isNativeAndroid()) {
                            const dirResult = nativeBridge.call<string>('getInternalDataDirectory');
                            let rootPath = null;
                            
                            try {
                                if (typeof dirResult === 'object' && dirResult !== null) {
                                    rootPath = (dirResult as { path?: string }).path;
                                } else if (typeof dirResult === 'string') {
                                    const parsed = JSON.parse(dirResult);
                                    rootPath = parsed.path;
                                }
                            } catch (e) {
                                // Failed to parse internal data directory
                            }

                            if (!rootPath) {
                                throw new Error("Could not determine internal data directory for native server.");
                            }

                            const port = options?.env?.PORT ? parseInt(options.env.PORT, 10) : 3000;
                            
                            nativeBridge.call('startWebServer', rootPath, port);
                            
                            const stream = new ReadableStream<string>({
                                start(controller) {
                                    controller.enqueue(`> Native Server started on port ${port}\\n`);
                                    controller.enqueue(`> Root: ${rootPath}\\n`);
                                    controller.enqueue(`> Ready on http://localhost:${port}\\n`);
                                }
                            });
                            
                            if (serviceInstance.serverReadyCallback) {
                                serviceInstance.serverReadyCallback(port, `http://localhost:${port}`);
                            }
                            
                            return {
                                output: stream,
                                exit: new Promise<number>(() => {}), // Never exits
                                kill: () => {
                                    nativeBridge.call('stopWebServer');
                                }
                            };
                        } else {
                            throw new Error("Native Android interface not available.");
                        }
                    } catch (e: any) {
                        const err = e as Error;
                        const stream = new ReadableStream<string>({
                            start(controller) {
                                controller.enqueue(`Error starting native server: ${err.message}\\n`);
                                controller.close();
                            }
                        });
                        return {
                            output: stream,
                            exit: Promise.resolve(1),
                            kill: () => {}
                        };
                    }
                }
            }
            
            // Fallback to generic shell command via Native Bridge
            const argsStr = options?.args?.join(' ') || '';
            const fullCommand = `${command} ${argsStr}`;
            
            let streamController: ReadableStreamDefaultController<string>;
            const stream = new ReadableStream<string>({
                start(controller) {
                    streamController = controller;
                }
            });

            nativeFileService.executeShellCommand(fullCommand).then(result => {
                if (streamController) {
                    streamController.enqueue(result + '\\n');
                    streamController.close();
                }
            }).catch(err => {
                if (streamController) {
                    streamController.enqueue(`Error: ${err.message}\\n`);
                    streamController.close();
                }
            });

            return {
                input: new WritableStream<string>({
                    write(chunk) {}
                }),
                output: stream,
                exit: Promise.resolve(0),
                kill: () => {}
            };
        },
        mount: async (files: Record<string, any>) => {
            const processTree = async (tree: Record<string, any>, currentPath: string) => {
                for (const [name, node] of Object.entries(tree)) {
                    const path = currentPath ? `${currentPath}/${name}` : name;
                    if (node.file) { 
                        const content = typeof node.file.contents === 'string' 
                            ? node.file.contents 
                            : new TextDecoder().decode(node.file.contents);
                        await vfs.writeFile(path, content);
                    } else if (node.directory) { 
                        await vfs.mkdir(path);
                        await processTree(node.directory, path);
                    }
                }
            };
            await processTree(files, '');
        },
        on: (event: string, callback: (...args: any[]) => void) => {
            if (event === 'server-ready') {
                serviceInstance.serverReadyCallback = callback;
            }
        },
        teardown: async () => {}
    };
}

export const getBridgeScript = () => `
<script>
(function() {
  const originalConsole = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  function send(type, payload) {
    try { window.parent.postMessage({ type, payload }, '*'); } catch (e) {}
  }
  ['log', 'error', 'warn', 'info'].forEach(method => {
    console[method] = function(...args) {
      originalConsole[method].apply(console, args);
      send('PREVIEW_CONSOLE', { method, args: args.map(a => {
        try { return typeof a === 'object' ? JSON.stringify(a) : String(a); } catch (e) { return String(a); }
      })});
    };
  });
  window.addEventListener('error', e => send('PREVIEW_ERROR', { message: e.message, filename: e.filename, lineno: e.lineno }));
  window.addEventListener('unhandledrejection', e => send('PREVIEW_ERROR', { message: e.reason ? e.reason.toString() : 'Unhandled Rejection' }));
  
  // Phase 8: DOM Telemetry Bridge (MutationObserver)
  function serializeDOM(node, depth = 0) {
      if (depth > 5) return null;
      if (node.nodeType === Node.TEXT_NODE) {
          return node.textContent.trim() ? node.textContent : null;
      }
      if (node.nodeType !== Node.ELEMENT_NODE) return null;
      
      const el = node;
      const obj = {
          tag: el.tagName.toLowerCase(),
          attributes: {},
          children: [],
          rect: {},
          styles: {}
      };
      
      for (let i = 0; i < el.attributes.length; i++) {
          const attr = el.attributes[i];
          obj.attributes[attr.name] = attr.value;
      }

      try {
          const rect = el.getBoundingClientRect();
          obj.rect = {
              top: Math.round(rect.top),
              left: Math.round(rect.left),
              width: Math.round(rect.width),
              height: Math.round(rect.height)
          };
          
          const computed = window.getComputedStyle(el);
          obj.styles = {
              display: computed.display,
              position: computed.position,
              color: computed.color,
              backgroundColor: computed.backgroundColor,
              fontSize: computed.fontSize,
              margin: computed.margin,
              padding: computed.padding,
              zIndex: computed.zIndex
          };
      } catch (e) {}
      
      for (let i = 0; i < el.childNodes.length; i++) {
          const child = serializeDOM(el.childNodes[i], depth + 1);
          if (child) obj.children.push(child);
      }
      return obj;
  }

  function sendDOMTelemetry() {
      try {
          const root = document.getElementById('root') || document.body;
          const domTree = serializeDOM(root);
          send('HAM_DOM_TELEMETRY', { dom: domTree });
      } catch (e) {}
  }

  let domTimeout;
  const observer = new MutationObserver(() => {
    clearTimeout(domTimeout);
    domTimeout = setTimeout(sendDOMTelemetry, 1000);
  });
  
  window.addEventListener('DOMContentLoaded', () => {
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, characterData: true });
    sendDOMTelemetry();
  });
})();
</script>`;
