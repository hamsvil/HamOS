 
// [STABILITY] Promise chains verified
import React, { useRef, useEffect, useState } from 'react';
import Editor, { DiffEditor, Monaco } from '@monaco-editor/react';
import { FileData } from '../types';
import { Loader2, AlignLeft, Check, X } from 'lucide-react';
import { useProjectStore } from '../../../store/projectStore';
import { setupMonaco } from './MonacoConfig';
import { lspClient } from '../../../services/analysis/lspClient';
import { useFIMGhostText } from './useFIMGhostText';
// import { useAICodeAction } from './useAICodeAction';

interface MonacoEditorProps {
  file: FileData | null;
  onChange: (value: string | undefined) => void;
  theme?: string;
  showMinimap?: boolean;
  fontSize?: number;
  onCursorPositionChange?: (line: number, column: number) => void;
}

export default function MonacoEditor({ 
    file, 
    onChange, 
    theme = 'vs-dark', 
    showMinimap = true, 
    fontSize = 13,
    onCursorPositionChange 
}: MonacoEditorProps) {
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);
  const [isFormatting, setIsFormatting] = useState(false);
  const shadowBuffers = useProjectStore(state => state.shadowBuffers);
  const setShadowBuffer = useProjectStore(state => state.setShadowBuffer);
  const lockedLines = useProjectStore(state => state.lockedLines);
  const decorationsRef = useRef<string[]>([]);
  const [isMonacoReady, setIsMonacoReady] = useState(false);

  useEffect(() => {
    setupMonaco().then(() => setIsMonacoReady(true)).catch(console.error);
  }, []);

  const [localValue, setLocalValue] = useState(file?.content || '');
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (file && file.content !== localValue) {
      setLocalValue(file.content);
    }
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [file?.content]);

  const handleDebouncedChange = (value: string | undefined) => {
    setLocalValue(value || '');
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      onChange(value);
    }, 300);
  };

  const shadowContent = file ? shadowBuffers[file.path] : undefined;
  const isDiffMode = !!shadowContent;

  // Initialize FIM Ghost Text
  useFIMGhostText(monacoRef.current, editorRef.current, isMonacoReady && !isDiffMode);
  
  // Initialize AI Code Action (Self-Healing Lightbulb)
  // useAICodeAction(monacoRef.current, editorRef.current, file?.path || '', isMonacoReady && !isDiffMode);

  const handleEditorDidMount = (editor: any, monaco: Monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Initialize LSP Client
    lspClient.setMonaco(monaco);

    // Set initial theme
    monaco.editor.setTheme(theme);

    // Track cursor position and prevent typing in locked lines
    editor.onDidChangeCursorPosition((e: any) => {
        if (onCursorPositionChange) {
            onCursorPositionChange(e.position.lineNumber, e.position.column);
        }
    });

    editor.onKeyDown((e: any) => {
        if (!file) return;
        const currentLockedLines = useProjectStore.getState().lockedLines[file.path] || [];
        if (currentLockedLines.length === 0) return;

        const position = editor.getPosition();
        if (position && currentLockedLines.includes(position.lineNumber)) {
            // Prevent typing, deleting, or pasting in locked lines
            const isNavigationKey = [
                monaco.KeyCode.UpArrow, monaco.KeyCode.DownArrow, 
                monaco.KeyCode.LeftArrow, monaco.KeyCode.RightArrow,
                monaco.KeyCode.PageUp, monaco.KeyCode.PageDown,
                monaco.KeyCode.Home, monaco.KeyCode.End,
                monaco.KeyCode.Escape
            ].includes(e.keyCode);

            if (!isNavigationKey) {
                e.preventDefault();
                e.stopPropagation();
            }
        }
    });
  };

  // Update decorations when locked lines change
  useEffect(() => {
    if (!editorRef.current || !monacoRef.current || !file) return;
    
    const currentLockedLines = lockedLines[file.path] || [];
    
    const newDecorations = currentLockedLines.map(line => ({
        range: new monacoRef.current!.Range(line, 1, line, 1),
        options: {
            isWholeLine: true,
            className: 'semantic-line-lock',
            glyphMarginClassName: 'semantic-line-lock-glyph',
            hoverMessage: { value: '**Quantum Lock Active**\nAI is currently editing this line.' }
        }
    }));

    decorationsRef.current = editorRef.current.deltaDecorations(
        decorationsRef.current,
        newDecorations
    );
  }, [lockedLines, file?.path]);

  useEffect(() => {
    if (editorRef.current) {
        editorRef.current.updateOptions({ 
            minimap: { enabled: showMinimap },
            fontSize: fontSize
        });
    }
  }, [showMinimap, fontSize]);

  // Cleanup editor on unmount
  useEffect(() => {
    return () => {
      if (editorRef.current) {
        const model = editorRef.current.getModel();
        if (model) {
          model.dispose();
        }
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  const handleFormat = () => {
      if (editorRef.current) {
          setIsFormatting(true);
          editorRef.current.getAction('editor.action.formatDocument').run()
              .catch(err => {
                  console.error('Formatting failed:', err);
                  setIsFormatting(false);
              })
              .finally(() => setTimeout(() => setIsFormatting(false), 500));
      }
  };

  if (!isMonacoReady) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#0a0a0a]">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-[#00ffcc] animate-spin" />
          <span className="text-sm text-gray-400 font-mono">Initializing Quantum Editor...</span>
        </div>
      </div>
    );
  }

  if (!file) {
    return (
      <div className="flex items-center justify-center h-full text-[var(--text-secondary)] bg-[var(--bg-primary)]">
        <div className="text-center">
          <div className="w-16 h-16 bg-[var(--bg-tertiary)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Loader2 className="animate-spin text-blue-500" size={32} />
          </div>
          <p className="text-sm font-medium">Select a file to start editing</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full w-full overflow-hidden bg-[var(--bg-primary)] relative group">
      {isDiffMode ? (
        <div className="h-full flex flex-col">
            <div className="bg-blue-900/30 border-b border-blue-500/30 p-2 flex justify-between items-center text-sm">
                <span className="text-blue-200 font-medium flex items-center gap-2">
                    <Loader2 size={14} className="animate-spin" />
                    AI is proposing changes to {file.path}
                </span>
                <div className="flex gap-2">
                    <button 
                        onClick={() => {
                            onChange(shadowContent);
                            setShadowBuffer(file.path, null);
                        }}
                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                        <Check size={14} /> Accept
                    </button>
                    <button 
                        onClick={() => setShadowBuffer(file.path, null)}
                        className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded flex items-center gap-1 text-xs font-medium transition-colors"
                    >
                        <X size={14} /> Reject
                    </button>
                </div>
            </div>
            <div className="flex-1">
                <DiffEditor
                    height="100%"
                    original={file.content}
                    modified={shadowContent}
                    language={file.language || 'typescript'}
                    theme={theme}
                    onMount={(editor, monaco) => {
                        handleEditorDidMount(editor.getModifiedEditor(), monaco);
                    }}
                    options={{
                        minimap: { enabled: showMinimap },
                        fontSize: fontSize,
                        fontFamily: "'JetBrains Mono', monospace",
                        lineHeight: 24,
                        renderSideBySide: false,
                        automaticLayout: true,
                    }}
                />
            </div>
        </div>
      ) : (
        <Editor
          height="100%"
          path={file.path}
          defaultLanguage={file.language || 'typescript'}
          defaultValue={file.content}
          value={localValue}
          onChange={handleDebouncedChange}
          theme={theme}
          onMount={handleEditorDidMount}
          options={{
            minimap: { enabled: true },
            fontSize: 14,
            fontFamily: "'JetBrains Mono', monospace",
            lineHeight: 24,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            tabSize: 2,
            wordWrap: 'on',
            padding: { top: 16, bottom: 16 },
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            smoothScrolling: true,
            contextmenu: true,
            formatOnPaste: true,
            formatOnType: true,
            glyphMargin: true,
          }}
        />
      )}
      
      {/* Floating Format Button */}
      {!isDiffMode && (
        <button
          onClick={handleFormat}
          className="absolute bottom-4 right-6 p-2 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-500 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 z-10"
          title="Format Code (Alt+Shift+F)"
        >
          {isFormatting ? <Loader2 size={16} className="animate-spin" /> : <AlignLeft size={16} />}
        </button>
      )}
    </div>
  );
}
