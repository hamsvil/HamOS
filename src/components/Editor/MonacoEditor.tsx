 
import React, { useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import Editor, { Monaco } from '@monaco-editor/react';
import { vfs } from '../../services/vfs';
import { hamEventBus } from '../../ham-synapse/core/event_bus';
import { HamEventType } from '../../ham-synapse/core/types';
import { lspService } from '../../services/lspService';
import { useTheme } from '../../context/ThemeContext';

export interface MonacoEditorRef {
  formatDocument: () => void;
  insertText: (text: string) => void;
}

interface MonacoEditorProps {
  filePath: string;
  value?: string;
  language?: string;
  onChange?: (value: string | undefined) => void;
  theme?: string;
}

const MonacoEditor = forwardRef<MonacoEditorRef, MonacoEditorProps>(({ 
  filePath, 
  value, 
  language, 
  onChange,
  theme: propTheme
}, ref) => {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const { theme: appTheme } = useTheme();

  const isDark = appTheme === 'dark' || (appTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const editorTheme = propTheme || (isDark ? "vs-dark" : "vs-light");

  useImperativeHandle(ref, () => ({
    formatDocument: () => {
      if (editorRef.current) {
        editorRef.current.getAction('editor.action.formatDocument').run();
      }
    },
    insertText: (text: string) => {
      if (editorRef.current) {
        const selection = editorRef.current.getSelection();
        const range = new monacoRef.current!.Range(
          selection.startLineNumber,
          selection.startColumn,
          selection.endLineNumber,
          selection.endColumn
        );
        editorRef.current.executeEdits('omni-ai', [{ range, text }]);
      }
    }
  }));

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    
    // 1. Initialize LSP Service
    lspService.registerProviders(monaco, (errorMsg, marker: any) => {
        // AI Quick Fix Handler
        hamEventBus.dispatch({
            id: `ai_fix_${Date.now()}`,
            type: HamEventType.UI_INTERACTION,
            timestamp: Date.now(),
            source: 'UI',
            payload: {
                type: 'AI_ASSIST_CODE',
                filePath,
                selection: {
                    startLine: marker.startLineNumber,
                    startCol: marker.startColumn,
                    endLine: marker.endLineNumber,
                    endCol: marker.endColumn
                },
                selectedText: editor.getModel().getValueInRange(marker),
                message: `Fix this error: ${errorMsg}`
            }
        });
    });

    // 2. Configure Monaco for better experience
    monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });

    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.CommonJS,
      noEmit: true,
      typeRoots: ["node_modules/@types"],
      jsx: monaco.languages.typescript.JsxEmit.React,
    });

    // Add extra libraries for better intellisense
    monaco.languages.typescript.javascriptDefaults.addExtraLib(`
      declare const process: { env: { [key: string]: string } };
      declare const console: { log(...args: any[]): void; error(...args: any[]): void; };
    `, 'ts:filename/globals.d.ts');

    // Custom Keybindings & Commands
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyP, () => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'p', ctrlKey: true, metaKey: true }));
    });

    // AI Assistance Shortcut (Ctrl+I)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyI, () => {
      const selection = editor.getSelection();
      const selectedText = editor.getModel().getValueInRange(selection);
      
      hamEventBus.dispatch({
        id: `ai_assist_${Date.now()}`,
        type: HamEventType.UI_INTERACTION,
        timestamp: Date.now(),
        source: 'UI',
        payload: {
          type: 'AI_ASSIST_CODE',
          filePath,
          selection: {
            startLine: selection.startLineNumber,
            startCol: selection.startColumn,
            endLine: selection.endLineNumber,
            endCol: selection.endColumn
          },
          selectedText
        }
      });
    });

    // Save Shortcut (Ctrl+S)
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      const content = editor.getValue();
      vfs.writeFile(filePath, content).then(() => {
        hamEventBus.dispatch({
            id: `save_${Date.now()}`,
            type: HamEventType.SYNC_STATE,
            timestamp: Date.now(),
            source: 'UI',
            payload: { message: `File saved: ${filePath}`, level: 'info' }
        });
      });
    });
  };

  // Sync content with VFS on change
  const handleEditorChange = (newValue: string | undefined) => {
    if (newValue !== undefined) {
      // We don't await this, just fire and forget for VFS sync
      vfs.writeFile(filePath, newValue).catch(console.error);
      onChange?.(newValue);
    }
  };

  return (
    <Editor
      height="100%"
      language={language}
      path={filePath} // Important for IntelliSense context
      value={value}
      theme={editorTheme}
      onMount={handleEditorDidMount}
      onChange={handleEditorChange}
      options={{
        minimap: { enabled: true },
        fontSize: 14,
        fontFamily: "'JetBrains Mono', monospace",
        scrollBeyondLastLine: false,
        automaticLayout: true,
        wordWrap: 'on',
        padding: { top: 16, bottom: 16 },
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        formatOnPaste: true,
        formatOnType: true,
      }}
    />
  );
});

export default MonacoEditor;
