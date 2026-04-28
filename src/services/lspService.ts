/* eslint-disable no-useless-assignment */
import { Monaco } from '@monaco-editor/react';
import { ProjectData } from '../components/HamAiStudio/types';

export class LSPService {
  private static instance: LSPService;
  private project: ProjectData | null = null;
  private monaco: Monaco | null = null;
  private worker: Worker | null = null;

  private constructor() {
    this.initWorker();
  }

  private initWorker() {
    this.worker = new Worker(new URL('../workers/lsp.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (e) => {
      const { type, typesToFetch, packageName, dts, path } = e.data;
      
      if (type === 'package_parsed' && typesToFetch) {
        typesToFetch.forEach((dep: string) => this.fetchTypes(dep));
      } else if (type === 'type_fetched' && this.monaco && dts && path) {
        this.monaco.languages.typescript.typescriptDefaults.addExtraLib(dts, path);
      }
    };
  }

  public destroy() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.project = null;
  }

  static getInstance(): LSPService {
    if (!LSPService.instance) {
      LSPService.instance = new LSPService();
    }
    return LSPService.instance;
  }

  setProject(project: ProjectData) {
    this.project = project;
    this.syncFiles();
  }

  registerProviders(monaco: Monaco, onAIFixRequested?: (errorMsg: string, range: any) => void) {
    this.monaco = monaco;

    // Configure TypeScript compiler options for "True LSP" experience
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ESNext,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      esModuleInterop: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
      strict: true,
      checkJs: true
    });

    // Enable all "World Class" features
    monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    // Register AI Quick Fix Code Action Provider
    monaco.languages.registerCodeActionProvider(['typescript', 'javascript'], {
      provideCodeActions: (model, range, context, token) => {
        const actions: any[] = [];
        
        // Only provide AI fix if there are errors/warnings
        if (context.markers.length > 0) {
          context.markers.forEach(marker => {
            actions.push({
              title: `✨ Fix with Ham Engine: ${marker.message}`,
              diagnostics: [marker],
              kind: 'quickfix',
              isPreferred: true,
              command: {
                id: 'ham.ai.fix',
                title: 'Fix with Ham Engine',
                arguments: [marker.message, marker]
              }
            });
          });
        }
        
        return {
          actions: actions,
          dispose: () => {}
        };
      }
    });

    // Register the command that the Code Action triggers
    // We use a try-catch because registering the same command twice throws an error in Monaco
    try {
        monaco.editor.registerCommand('ham.ai.fix', (accessor, ...args) => {
            const errorMsg = args[0];
            const marker = args[1];
            if (onAIFixRequested) {
                onAIFixRequested(errorMsg, marker);
            }
        });
    } catch (e) {
        // Command already registered, ignore
    }

    this.syncFiles();
  }

  public isReady(): boolean {
    return this.monaco !== null;
  }

  public getDiagnostics(uri?: any): any[] {
    if (!this.monaco) return [];
    return this.monaco.editor.getModelMarkers({ resource: uri as any });
  }

  private async fetchTypes(packageName: string, version: string = 'latest') {
    if (!this.monaco || !this.worker) return;
    this.worker.postMessage({ type: 'fetch_type', payload: { packageName, version } });
  }

  private syncFiles() {
    if (!this.project || !this.monaco) return;

    const monaco = this.monaco;

    // 1. Sync all project files to Monaco Models
    // This ensures the TS Worker sees all files for cross-file intellisense
    this.project.files.forEach(file => {
      const uri = monaco.Uri.parse(`file:///${file.path}`);
      let model = monaco.editor.getModel(uri);

      if (!model) {
        model = monaco.editor.createModel(file.content, undefined, uri);
      } else {
        if (model.getValue() !== file.content) {
          model.setValue(file.content);
        }
      }
      
      // 2. Parse package.json and fetch types
      if (file.path === 'package.json' && this.worker) {
        this.worker.postMessage({ type: 'parse_package_json', payload: { content: file.content } });
      }
    });

    // 3. Add extra libs for environment (e.g. React types)
    if (!monaco.languages.typescript.typescriptDefaults.getExtraLibs()['file:///node_modules/@types/react/index.d.ts']) {
      this.fetchTypes('react');
    }
  }
}

export const lspService = LSPService.getInstance();
