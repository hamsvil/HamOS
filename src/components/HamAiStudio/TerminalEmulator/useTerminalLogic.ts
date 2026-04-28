 
import { useRef, useEffect, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { shellService } from '../../../services/shellService';
import { safeStorage } from '../../../utils/storage';
import { NativeShell } from '../../../plugins/NativeShell';
import { processVFSCommand } from './VFSShell';

interface InteractiveShellProcess {
  output: ReadableStream<string> | any;
  input: WritableStream<string> | any;
  resize?: (size: { cols: number; rows: number }) => void;
  kill: () => void;
  socket?: any;
}

export const useTerminalLogic = (projectId: string, terminalRef: React.RefObject<HTMLDivElement | null>) => {
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const sessionIdRef = useRef<string | null>(null);
  const webShellHandlerRef = useRef<((data: string) => void) | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const shellProcessRef = useRef<InteractiveShellProcess | null>(null);
  const shellWriterRef = useRef<any>(null);
  const cwdRef = useRef<string>('/');
  const [restartCount, setRestartCount] = useState(0);

  const handleRestart = useCallback(() => {
    setError(null);
    setIsConnecting(true);
    setRestartCount(prev => prev + 1);
  }, []);

  const getThemeColor = (variable: string, fallback: string) => {
    if (typeof window === 'undefined') return fallback;
    const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
    return value || fallback;
  };

  useEffect(() => {
    if (!terminalRef.current) return;

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: getThemeColor('--bg-secondary', '#1e1e1e'),
        foreground: getThemeColor('--text-primary', '#d4d4d4'),
        cursor: getThemeColor('--text-primary', '#ffffff'),
        selectionBackground: 'rgba(59, 130, 246, 0.3)',
      },
      fontSize: 12,
      fontFamily: "'JetBrains Mono', monospace",
      allowProposedApi: true,
      scrollback: 1000 
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);
    term.loadAddon(new WebLinksAddon());

    term.open(terminalRef.current);
    
    let isDisposed = false;
    
    const initialFit = () => {
      if (isDisposed || !term.element) return;
      if (terminalRef.current && terminalRef.current.clientWidth > 0) {
        try {
          fitAddon.fit();
        } catch (e) {
          // console.warn('[Terminal] initialFit error:', e);
        }
      } else {
        setTimeout(initialFit, 100);
      }
    };
    initialFit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    const historyKey = `ham_terminal_history_${projectId}`;
    let heartbeatInterval: ReturnType<typeof setInterval>;

    const initSession = async () => {
      try {
        setIsConnecting(true);
        setError(null);

        const savedHistory = safeStorage.getItem(historyKey);
        if (savedHistory) {
            term.write(savedHistory);
            term.writeln('\x1b[90m--- Session Restored ---\x1b[0m');
        }

        try {
            term.writeln('\x1b[36mStarting Shell...\x1b[0m');
            const process = await shellService.spawnInteractive({
                cols: term.cols,
                rows: term.rows
            });

            if (isDisposed) {
              process.kill();
              return;
            }

            shellProcessRef.current = process as InteractiveShellProcess;
            setIsConnecting(false);
            
            const reader = process.output.getReader();
            const readOutput = async () => {
              try {
                while (true) {
                  const { done, value } = await reader.read();
                  if (done || isDisposed) break;
                  term.write(value);
                  const currentHistory = safeStorage.getItem(historyKey) || '';
                  const newHistory = (currentHistory + value).slice(-10000); 
                  safeStorage.setItem(historyKey, newHistory);
                }
              } catch (e) {
                // console.error('Terminal read error:', e);
                setError(`Terminal Read Error: ${e instanceof Error ? e.message : String(e)}`);
              }
            };
            readOutput();

            const writer = process.input.getWriter();
            shellWriterRef.current = writer;
            term.onData((data) => {
                writer.write(data);
            });

            term.onResize((size) => {
                if (process.resize) {
                    process.resize({
                        cols: size.cols,
                        rows: size.rows
                    });
                }
            });

            if (!isDisposed) {
              heartbeatInterval = setInterval(() => {
                const socket = (process as any).socket;
                if (socket && !socket.connected) {
                  // console.warn('[Terminal] Heartbeat failed: socket disconnected');
                  setError('Connection lost. Attempting to reconnect...');
                }
              }, 30000); // Increased from 5s to 30s to reduce CPU drain
            }

            return; // Added return to prevent fallback to VFS shell

        } catch (e) {
            // console.warn("Shell failed, falling back to VFS shell. Error details:", e);
            setIsConnecting(false);
        }

        term.writeln('\x1b[33mNative/WebContainer shell unavailable. Switching to VFS Shell.\x1b[0m');
        term.writeln('Type "help" for available commands.\r\n$ ');
        
        let currentLine = '';
        
        const handleWebInput = async (data: string) => {
            const code = data.charCodeAt(0);
            
            if (code === 13) { // Enter
                term.write('\r\n');
                await processVFSCommandLocal(currentLine);
                currentLine = '';
                term.write(`\r\n${cwdRef.current} $ `);
            } else if (code === 127) { // Backspace
                if (currentLine.length > 0) {
                    currentLine = currentLine.slice(0, -1);
                    term.write('\b \b');
                }
            } else if (code < 32) {
                // Ignore
            } else {
                currentLine += data;
                term.write(data);
            }
        };

        webShellHandlerRef.current = handleWebInput;
        term.onData(handleWebInput);

      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        term.writeln(`\r\n\x1b[31mFatal Error: ${msg}\x1b[0m`);
        setError(`Fatal Error: ${msg}`);
        setIsConnecting(false);
      }
    };

    const processVFSCommandLocal = async (cmd: string) => {
        const setCwd = (path: string) => { cwdRef.current = path; };
        const isAsync = await processVFSCommand(cmd, cwdRef.current, term, setCwd);
        if (!isAsync) {
            term.write(`\r\n${cwdRef.current} $ `);
        }
    };

    initSession();

    const resizeObserver = new ResizeObserver(() => {
        if (isDisposed || !term.element) return;
        try {
            fitAddon.fit();
            if (shellProcessRef.current) {
                 shellProcessRef.current.resize({
                    cols: term.cols,
                    rows: term.rows
                });
            }
        } catch (e) {
            // console.warn('[Terminal] resizeObserver error:', e);
        }
    });
    resizeObserver.observe(terminalRef.current);
    
    return () => {
      isDisposed = true;
      if (heartbeatInterval) clearInterval(heartbeatInterval);
      resizeObserver.disconnect();
      
      if (sessionIdRef.current) {
        NativeShell.killSession({ sessionId: sessionIdRef.current });
      }
      if (shellProcessRef.current) {
          shellProcessRef.current.kill();
      }
      term.dispose();
    };
  }, [projectId, restartCount]);

  return {
    xtermRef,
    fitAddonRef,
    error,
    isConnecting,
    handleRestart,
    shellWriterRef,
    webShellHandlerRef,
    sessionIdRef
  };
};
