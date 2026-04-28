/* eslint-disable no-useless-assignment */
import React, { useRef, useState, useEffect, useImperativeHandle, forwardRef } from 'react';
import { useTerminalLogic } from './useTerminalLogic';
import { TerminalView } from './TerminalView';
import { NativeShell } from '../../../plugins/NativeShell';
import { FileExplorer } from './FileExplorer';
import { Panel, Group as PanelGroup, Separator as PanelResizeHandle } from 'react-resizable-panels';
import { Layout } from 'lucide-react';

export interface TerminalEmulatorProps {
  onInput?: (data: string) => void;
  projectId?: string; // Optional projectId for scoped history
}

export interface TerminalEmulatorHandle {
  redraw: () => void;
  restart: () => void;
}

export const TerminalEmulatorContent = forwardRef<TerminalEmulatorHandle, TerminalEmulatorProps>(({ onInput, projectId = 'default' }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [modifiers, setModifiers] = useState({ ctrl: false, alt: false });
  const [showExplorer, setShowExplorer] = useState(true);

  const {
    xtermRef,
    fitAddonRef,
    error,
    isConnecting,
    handleRestart,
    shellWriterRef,
    webShellHandlerRef,
    sessionIdRef
  } = useTerminalLogic(projectId, terminalRef);

  // Expose methods to parent
  useImperativeHandle(ref, () => ({
    redraw: () => {
      if (fitAddonRef.current && xtermRef.current?.element) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.warn('[Terminal] Fit failed during manual redraw:', e);
        }
      }
    },
    restart: () => {
      handleRestart();
    }
  }));

  useEffect(() => {
    const currentRef = terminalRef.current;
    if (!currentRef) return;

    const handleFocusIn = () => setIsKeyboardVisible(true);
    const handleFocusOut = () => setTimeout(() => setIsKeyboardVisible(false), 200);
    const handleTerminalClick = (e: MouseEvent) => {
      e.preventDefault();
      xtermRef.current?.focus();
      const textarea = terminalRef.current?.querySelector('textarea.xterm-helper-textarea') as HTMLTextAreaElement;
      if (textarea) {
        textarea.focus();
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }
    };

    currentRef.addEventListener('focusin', handleFocusIn);
    currentRef.addEventListener('focusout', handleFocusOut);
    currentRef.addEventListener('click', handleTerminalClick as any);

    return () => {
      currentRef.removeEventListener('focusin', handleFocusIn);
      currentRef.removeEventListener('focusout', handleFocusOut);
      currentRef.removeEventListener('click', handleTerminalClick as any);
    };
  }, [xtermRef]);

  const handleVirtualKey = (key: string) => {
    let data = '';
    
    if (key === 'CTRL') {
      setModifiers(prev => ({ ...prev, ctrl: !prev.ctrl }));
      return;
    }
    if (key === 'ALT') {
      setModifiers(prev => ({ ...prev, alt: !prev.alt }));
      return;
    }

    switch (key) {
      case 'ESC': data = '\x1b'; break;
      case 'TAB': data = '\t'; break;
      case 'UP': data = '\x1b[A'; break;
      case 'DOWN': data = '\x1b[B'; break;
      case 'LEFT': data = '\x1b[D'; break;
      case 'RIGHT': data = '\x1b[C'; break;
      case 'ENTER': data = '\r'; break;
      case 'BACKSPACE': data = '\x7f'; break;
      case 'HOME': data = '\x1b[H'; break;
      case 'END': data = '\x1b[F'; break;
      case 'PGUP': data = '\x1b[5~'; break;
      case 'PGDN': data = '\x1b[6~'; break;
      case 'DEL': data = '\x1b[3~'; break;
      case 'CTRL+C': data = '\x03'; break;
      case 'CTRL+D': data = '\x04'; break;
      default: {
        if (modifiers.ctrl) {
          const code = key.toUpperCase().charCodeAt(0);
          if (code >= 65 && code <= 90) {
            data = String.fromCharCode(code - 64);
          } else if (key === 'C') {
             data = '\x03';
          } else {
            data = key;
          }
          setModifiers(prev => ({ ...prev, ctrl: false }));
        } else if (modifiers.alt) {
          data = '\x1b' + key;
          setModifiers(prev => ({ ...prev, alt: false }));
        } else {
          data = key;
        }
      }
    }
    
    if (data) {
        if (sessionIdRef.current) {
            NativeShell.writeToSession({ sessionId: sessionIdRef.current, data });
        } else if (shellWriterRef.current) {
            shellWriterRef.current.write(data);
        } else if (webShellHandlerRef.current) {
            webShellHandlerRef.current(data);
        }
        xtermRef.current?.focus();
    }
  };

  return (
    <div className="h-full w-full bg-[#1e1e1e] overflow-hidden">
      <PanelGroup id="terminal-layout">
        {showExplorer && (
          <>
            <Panel defaultSize={25} minSize={15}>
              <FileExplorer />
            </Panel>
            <PanelResizeHandle className="w-1 bg-white/5 hover:bg-blue-500/50 transition-colors" />
          </>
        )}
        <Panel>
          <TerminalView 
            terminalRef={terminalRef}
            isConnecting={isConnecting}
            error={error}
            handleRestart={handleRestart}
            isKeyboardVisible={isKeyboardVisible}
            handleVirtualKey={handleVirtualKey}
            rows={xtermRef.current?.rows || 0}
            cols={xtermRef.current?.cols || 0}
          />
        </Panel>
      </PanelGroup>
      
      {/* Toggle Button */}
      <button 
        onClick={() => setShowExplorer(!showExplorer)}
        className="absolute left-4 bottom-10 z-30 p-2 bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 border border-blue-500/30 rounded-full transition-all active:scale-90"
      >
        <Layout size={16} />
      </button>
    </div>
  );
});
