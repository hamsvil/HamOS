 
import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import 'xterm/css/xterm.css';
import { shellService } from '../../services/shellService';
import { EnvironmentChecker } from '../../services/environmentChecker';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw, AlertTriangle, Terminal as TerminalIcon } from 'lucide-react';

interface XTermProxyProps {
  onProcessStarted?: (process: any) => void;
  className?: string;
}

export interface XTermProxyHandle {
  redraw: () => void;
  restart: () => void;
}

export const XTermProxy = forwardRef<XTermProxyHandle, XTermProxyProps>(({ onProcessStarted, className }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(true);
  const [restartKey, setRestartKey] = useState(0);

  useImperativeHandle(ref, () => ({
    redraw: () => {
      if (fitAddonRef.current && xtermRef.current?.element) {
        try {
          fitAddonRef.current.fit();
        } catch (e) {
          console.warn('[XTermProxy] Fit failed:', e);
        }
      }
    },
    restart: () => {
      setRestartKey(prev => prev + 1);
    }
  }));

  const handleRestart = useCallback(() => {
    setRestartKey(prev => prev + 1);
  }, []);

  useEffect(() => {
    if (!terminalRef.current) return;

    setIsConnecting(true);
    setError(null);

    const term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#0a0a0a',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: 'rgba(255, 255, 255, 0.3)',
      },
      fontSize: 12,
      fontFamily: 'JetBrains Mono, Menlo, Monaco, Courier New, monospace',
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
          console.warn('[XTermProxy] initialFit error:', e);
        }
      } else {
        setTimeout(initialFit, 100);
      }
    };
    initialFit();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;32m[HAM OS] Terminal Proxy Initialized\x1b[0m');
    term.writeln('Connecting to WebContainer shell...');

    let shellProcess: any = null;

    const startShell = async (retryCount = 0) => {
      try {
        const isNative = EnvironmentChecker.isNativeAndroid();
        
        shellProcess = await shellService.spawnInteractive({
          cols: term.cols,
          rows: term.rows,
          shell: isNative ? '/system/bin/sh' : undefined
        });

        if (isDisposed) {
          shellProcess.kill();
          return;
        }

        setIsConnecting(false);

        if (onProcessStarted) {
          onProcessStarted(shellProcess);
        }

        // Handle output
        const reader = shellProcess.output.getReader();
        const readOutput = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done || isDisposed) break;
              term.write(value);
            }
          } catch (e) {
            console.error('[XTermProxy] Read error:', e);
          }
        };
        readOutput();

        // Handle input
        const writer = shellProcess.input.getWriter();
        term.onData((data) => {
          if (!isDisposed) writer.write(data);
        });

        term.writeln(`\x1b[1;34m[${isNative ? 'Native' : 'WebContainer'}] Shell Connected\x1b[0m\r\n`);
      } catch (error: any) {
        if (!isDisposed) {
          const msg = error.message || String(error);
          if (retryCount < 3) {
            term.writeln(`\r\n\x1b[1;33m[Warning] Shell connection failed. Retrying (${retryCount + 1}/3)...\x1b[0m`);
            setTimeout(() => startShell(retryCount + 1), 2000);
          } else {
            term.writeln(`\r\n\x1b[1;31m[Error] Failed to start shell after 3 attempts: ${msg}\x1b[0m`);
            setError(msg);
            setIsConnecting(false);
          }
        }
      }
    };

    startShell();
    
    const resizeObserver = new ResizeObserver(() => {
      if (isDisposed || !term.element) return;
      if (fitAddonRef.current) {
        try {
          fitAddonRef.current.fit();
          if (shellProcess && shellProcess.resize) {
            shellProcess.resize({
              cols: term.cols,
              rows: term.rows,
            });
          }
        } catch (e) {
          console.warn('[XTermProxy] resizeObserver error:', e);
        }
      }
    });

    resizeObserver.observe(terminalRef.current);

    return () => {
      isDisposed = true;
      resizeObserver.disconnect();
      if (shellProcess) {
        shellProcess.kill();
      }
      term.dispose();
    };
  }, [restartKey]);

  return (
    <div className={`relative w-full h-full min-h-[200px] bg-[#0a0a0a] rounded-lg overflow-hidden border border-gray-800 ${className}`}>
      <div ref={terminalRef} className="w-full h-full" />
      
      <AnimatePresence>
        {(isConnecting || error) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-20"
          >
            <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl text-center mx-4">
              {isConnecting && !error ? (
                <div className="flex flex-col items-center gap-4">
                  <RefreshCw className="w-8 h-8 text-blue-500 animate-spin" />
                  <p className="text-sm text-gray-400 font-mono">BOOTING WEBCONTAINER...</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-4">
                  <AlertTriangle className="w-8 h-8 text-amber-500" />
                  <h3 className="text-lg font-semibold text-white font-mono">SHELL ERROR</h3>
                  <p className="text-xs text-gray-400 font-mono break-all">{error}</p>
                  <button 
                    onClick={handleRestart}
                    className="mt-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-mono transition-colors flex items-center gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    RETRY BOOT
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="absolute bottom-0 left-0 right-0 h-5 bg-black/80 border-t border-white/5 flex items-center justify-between px-2 text-[9px] font-mono text-gray-500 select-none pointer-events-none">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <TerminalIcon className="w-2.5 h-2.5" />
            <span>PROXY_SHELL</span>
          </div>
          <div className="flex items-center gap-1">
            <div className={`w-1 h-1 rounded-full ${isConnecting ? 'bg-amber-500 animate-pulse' : error ? 'bg-red-500' : 'bg-emerald-500'}`} />
            <span>{isConnecting ? 'BOOT' : error ? 'FAIL' : 'READY'}</span>
          </div>
        </div>
        <span>{xtermRef.current?.cols}x{xtermRef.current?.rows}</span>
      </div>
    </div>
  );
});
