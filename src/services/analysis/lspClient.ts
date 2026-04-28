/* eslint-disable no-useless-assignment */
import { Monaco } from '@monaco-editor/react';
import { vfs } from '../vfsService';

/**
 * LSP CLIENT - The Intelligence Hub
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */
export class LSPClient {
    private static instance: LSPClient;
    private worker: Worker | null = null;
    private monaco: Monaco | null = null;
    private isInitialized = false;

    private constructor() {
        this.initWorker();
        // Listen for VFS changes to sync types
        vfs.subscribe((event, path) => {
            if (path === '/package.json' && (event === 'create' || event === 'update' || event === 'rename')) {
                this.syncProjectTypes();
            }
        });
    }

    public destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.isInitialized = false;
    }

    public static getInstance(): LSPClient {
        if (!LSPClient.instance) {
            LSPClient.instance = new LSPClient();
        }
        return LSPClient.instance;
    }

    private initWorker() {
        try {
            this.worker = new Worker(new URL('../../workers/lsp.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = (e) => {
                const { type, typesToFetch, packageName, dts, path, error, depth } = e.data;
                
                switch (type) {
                    case 'package_parsed':
                        if (typesToFetch && Array.isArray(typesToFetch)) {
                            typesToFetch.forEach((pkg: string) => {
                                this.worker?.postMessage({ type: 'fetch_type', payload: { packageName: pkg, depth: depth || 0 } });
                            });
                        }
                        break;
                    case 'type_fetched':
                        if (this.monaco && dts) {
                            this.addExtraLib(dts, path, packageName);
                        }
                        break;
                    case 'error':
                        console.warn(`[LSP Client] Worker error: ${error}`);
                        break;
                }
            };
        } catch (e) {
            console.error('[LSP Client] Failed to initialize LSP Worker', e);
        }
    }

    private addExtraLib(dts: string, path: string, packageName: string) {
        if (!this.monaco) return;
        try {
            // Add to both TS and JS defaults
            this.monaco.languages.typescript.typescriptDefaults.addExtraLib(dts, path);
            this.monaco.languages.typescript.javascriptDefaults.addExtraLib(dts, path);
            console.log(`[LSP Client] Loaded types for ${packageName} at ${path}`);
        } catch (err) {
            // Library might already exist or other error
            // console.debug(`[LSP Client] Note: ${packageName} types already loaded or skipped.`);
        }
    }

    public setMonaco(monaco: Monaco) {
        this.monaco = monaco;
        
        // Configure TypeScript defaults for a "Supreme" experience
        monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
            target: monaco.languages.typescript.ScriptTarget.ESNext,
            allowNonTsExtensions: true,
            moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
            module: monaco.languages.typescript.ModuleKind.ESNext,
            noEmit: true,
            esModuleInterop: true,
            jsx: monaco.languages.typescript.JsxEmit.React,
            reactNamespace: 'React',
            allowJs: true,
            typeRoots: ['node_modules/@types'],
            lib: ['esnext', 'dom', 'dom.iterable', 'scripthost'],
            strict: true,
            baseUrl: '/',
            paths: {
                "*": ["*", "node_modules/*"]
            }
        });

        monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
            noSemanticValidation: false,
            noSyntaxValidation: false,
            diagnosticCodesToIgnore: [1103, 2307] // Ignore "file too large" and "module not found" (since we fetch types async)
        });

        if (!this.isInitialized) {
            this.syncProjectTypes();
            this.isInitialized = true;
        }
    }

    public async syncProjectTypes() {
        try {
            const pkgContent = await vfs.readFile('/package.json');
            this.worker?.postMessage({ type: 'parse_package_json', payload: { content: pkgContent } });
        } catch (e) {
            // No package.json or error reading it
        }
    }
}

export const lspClient = LSPClient.getInstance();
