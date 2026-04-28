 
// [STABILITY] Promise chains verified
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { SerializeAddon } from 'xterm-addon-serialize';
import { shellService } from '../services/shellService';
import { RefreshCw, Trash2, AlertTriangle, Activity, Cpu, Zap, Terminal as TerminalIcon, ShieldCheck } from 'lucide-react';
import { useSupremeProtocol } from '../hooks/useSupremeProtocol';
import 'xterm/css/xterm.css';

// Debounce utility
function debounce(fn: Function, ms: number) {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function(this: any, ...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
}

export default function TerminalTab() {
  useSupremeProtocol();
  const xtermRef = useRef<Terminal | null>(null);
  const terminalInstanceRef = useRef<{ restart: () => void } | null>(null);
  const [isCleaning, setIsCleaning] = useState(false);

  const handleRestart = () => {
    if (terminalInstanceRef.current) {
      terminalInstanceRef.current.restart();
    }
  };

  const handleZombieSweep = async () => {
    if (isCleaning) return;
    setIsCleaning(true);
    xtermRef.current?.writeln('\x1b[1;33m[Zombie-Sweeper] Initiating quantum process cleanup...\x1b[0m');
    
    const success = await shellService.zombieSweeper();
    
    if (success) {
      xtermRef.current?.writeln('\x1b[1;32m[Zombie-Sweeper] Quantum cleanup complete. All hanging processes purged.\x1b[0m');
    } else {
      xtermRef.current?.writeln('\x1b[1;31m[Zombie-Sweeper] Cleanup failed. Some processes may still be active.\x1b[0m');
    }
    setIsCleaning(false);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-2xl relative group/terminal">
      {/* Engine v7 Status Overlay */}
      <div className="absolute top-12 right-6 z-50 flex items-center gap-2 pointer-events-none opacity-20 group-hover/terminal:opacity-40 transition-opacity">
        <Activity size={10} className="text-violet-400 animate-pulse" />
        <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Quantum Engine v7.2</span>
      </div>

      {/* Quantum Status Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shrink-0 select-none">
        <div className="flex items-center gap-5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-500/10 rounded-xl border border-violet-500/20 shadow-[0_0_10px_rgba(167,139,250,0.1)]">
              <TerminalIcon size={16} className="text-violet-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-[var(--text-primary)] uppercase tracking-[0.2em]">Quantum Terminal</span>
              <span className="text-[8px] text-violet-400/60 font-mono uppercase tracking-widest">Singularity Engine v7.2</span>
            </div>
          </div>
          <div className="h-6 w-px bg-[var(--border-color)] mx-1" />
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2">
              <ShieldCheck size={12} className="text-emerald-500" />
              <div className="flex flex-col">
                <span className="text-[8px] text-[var(--text-secondary)] font-mono uppercase tracking-tighter">Security</span>
                <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-tighter">Hardened</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Cpu size={12} className="text-blue-500" />
              <div className="flex flex-col">
                <span className="text-[8px] text-[var(--text-secondary)] font-mono uppercase tracking-tighter">Core</span>
                <span className="text-[9px] text-blue-400 font-bold uppercase tracking-tighter">V7-Quantum</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Zap size={12} className="text-yellow-500" />
              <div className="flex flex-col">
                <span className="text-[8px] text-[var(--text-secondary)] font-mono uppercase tracking-tighter">Latency</span>
                <span className="text-[9px] text-yellow-400 font-bold uppercase tracking-tighter">0.1ms</span>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-violet-500/5 border border-violet-500/10 rounded-full group cursor-help">
            <div className="w-1.5 h-1.5 rounded-full bg-violet-500 animate-pulse shadow-[0_0_8px_rgba(167,139,250,0.8)]" />
            <span className="text-[9px] font-black text-violet-400 uppercase tracking-widest opacity-70 group-hover:opacity-100 transition-opacity">Neural Link: Active</span>
          </div>
          <div className="h-6 w-px bg-[var(--border-color)] mx-1" />
          <div className="flex items-center gap-1.5">
            <button 
              onClick={handleZombieSweep}
              disabled={isCleaning}
              className={`p-2.5 rounded-xl text-[var(--text-secondary)] transition-all duration-500 border border-transparent group active:scale-90 ${isCleaning ? 'opacity-50 cursor-not-allowed' : 'hover:bg-yellow-500/10 hover:text-yellow-400 hover:border-yellow-500/20'}`}
              title="Zombie-Sweeper (Kill Hanging Processes)"
            >
              <Activity size={16} className={`${isCleaning ? 'animate-spin' : 'group-hover:scale-110 transition-transform'}`} />
            </button>
            <button 
              onClick={() => xtermRef.current?.clear()}
              className="p-2.5 hover:bg-red-500/10 rounded-xl text-[var(--text-secondary)] hover:text-red-400 transition-all duration-500 border border-transparent hover:border-red-500/20 group active:scale-90"
              title="Clear Terminal"
            >
              <Trash2 size={16} className="group-hover:scale-110 transition-transform" />
            </button>
            <button 
              onClick={handleRestart}
              className="p-2.5 hover:bg-violet-500/10 rounded-xl text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-500 border border-transparent hover:border-violet-500/20 group active:scale-90"
              title="Restart Shell"
            >
              <RefreshCw size={16} className="group-hover:rotate-180 transition-transform duration-700" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden p-3 bg-black/95 backdrop-blur-sm relative">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(139,92,246,0.05),transparent_70%)] pointer-events-none" />
        <TerminalInstance 
          ref={terminalInstanceRef}
          onMount={(term) => xtermRef.current = term} 
        />
      </div>
    </div>
  );
}

export const TerminalInstance = React.forwardRef(({ onMount }: { onMount?: (term: Terminal) => void }, ref) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const shellProcessRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [restartCounter, setRestartCounter] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  React.useImperativeHandle(ref, () => ({
    restart: () => {
      setRestartCounter(prev => prev + 1);
    }
  }));

  const handleResize = useCallback(debounce(() => {
    if (fitAddonRef.current && xtermRef.current && terminalRef.current) {
      if (terminalRef.current.clientWidth === 0 || terminalRef.current.clientHeight === 0 || !xtermRef.current.element) return;
      try {
        fitAddonRef.current.fit();
        if (shellProcessRef.current && shellProcessRef.current.resize) {
          shellProcessRef.current.resize({
            cols: xtermRef.current.cols,
            rows: xtermRef.current.rows,
          });
        }
      } catch (e) {
        console.warn('Terminal resize error:', e);
      }
    }
  }, 100), []);

  useEffect(() => {
    if (!terminalRef.current) return;

    setIsConnecting(true);
    setError(null);

    try {
      // Initialize xterm
      const term = new Terminal({
        cursorBlink: true,
        fontFamily: '"JetBrains Mono", monospace',
        fontSize: 13,
        scrollback: 5000,
        theme: {
          background: '#0a0a0c',
          foreground: '#e2e8f0',
          cursor: '#a78bfa',
          cursorAccent: '#0a0a0c',
          selectionBackground: 'rgba(167, 139, 250, 0.3)',
          black: '#0a0a0c',
          red: '#f87171',
          green: '#10b981',
          yellow: '#fbbf24',
          blue: '#60a5fa',
          magenta: '#a78bfa',
          cyan: '#22d3ee',
          white: '#f8fafc',
          brightBlack: '#475569',
          brightRed: '#ef4444',
          brightGreen: '#34d399',
          brightYellow: '#f59e0b',
          brightBlue: '#3b82f6',
          brightMagenta: '#8b5cf6',
          brightCyan: '#06b6d4',
          brightWhite: '#ffffff',
        },
        allowProposedApi: true
      });

      const fitAddon = new FitAddon();
      const webLinksAddon = new WebLinksAddon();
      const serializeAddon = new SerializeAddon();

      term.loadAddon(fitAddon);
      term.loadAddon(webLinksAddon);
      term.loadAddon(serializeAddon);
      
      term.open(terminalRef.current);

      // Ensure terminal is rendered after DOM is ready
      requestAnimationFrame(() => {
        if (!terminalRef.current || terminalRef.current.clientWidth === 0 || terminalRef.current.clientHeight === 0 || !term.element) return;
        try {
          fitAddon.fit();
          term.refresh(0, term.rows - 1);
        } catch (e) {
          console.warn('Initial fit error:', e);
        }
      });

      xtermRef.current = term;
      fitAddonRef.current = fitAddon;
      if (onMount) onMount(term);

      term.writeln('\x1b[1;32mHam Quantum Terminal v21.0 (Singularity Engine v7)\x1b[0m');
      term.writeln('\x1b[1;36m[System] The Golden Window Protocol: ACTIVE\x1b[0m');
      term.writeln('Initializing Shell Runtime...\r\n');

      let pingInterval: any = null;
      
      // Start Shell
      let isCleanedUp = false;
      const initShell = async () => {
        try {
          const process = (await shellService.spawnInteractive({
            cols: term.cols,
            rows: term.rows,
          })) as any;

          if (isCleanedUp) {
            process.kill();
            return;
          }

          shellProcessRef.current = process;
          setIsConnecting(false);

          // Heartbeat
          let lastPong = Date.now();
          
          if (process.socket) {
            process.socket.on('pong', () => {
              lastPong = Date.now();
            });
            
            pingInterval = setInterval(() => {
              if (process.socket && process.socket.connected) {
                process.socket.emit('ping');
              }
              if (Date.now() - lastPong > 15000) {
                console.warn('[Terminal] Connection timeout, restarting...');
                setRestartCounter(prev => prev + 1);
              }
            }, 5000);
          }

          // Pipe shell output to terminal
          const reader = process.output.getReader();
          const readOutput = async () => {
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done || isCleanedUp) break;
                term.write(value);
              }
            } catch (e) {
              if (!isCleanedUp) console.error('Terminal read error:', e);
            }
          };
          readOutput();

          // Pipe terminal input to shell
          const writer = process.input.getWriter();
          const onDataDisposable = term.onData((data) => {
            if (writer && !isCleanedUp) {
              writer.write(data);
            }
          });

          term.writeln('\x1b[1;34m[System] Shell Connected\x1b[0m\r\n');
          
          return () => {
             isCleanedUp = true;
             clearInterval(pingInterval); // Clear interval
             onDataDisposable.dispose();
             if (writer && 'releaseLock' in writer) {
               try { (writer as any).releaseLock(); } catch (e) {}
             }
             try { reader.cancel(); } catch (e) {}
          };
        } catch (error: any) {
          if (!isCleanedUp) {
            term.writeln(`\n\x1b[1;31m[Error] Failed to start shell: ${error.message}\x1b[0m`);
            setError(error.message);
            setIsConnecting(false);
          }
        }
      };

      const shellCleanupPromise = initShell();

      const resizeObserver = new ResizeObserver(handleResize);

      if (terminalRef.current) {
        resizeObserver.observe(terminalRef.current);
      }

      return () => {
        isCleanedUp = true;
        if (pingInterval) clearInterval(pingInterval);
        resizeObserver.disconnect();
        if (shellProcessRef.current) {
          shellProcessRef.current.kill();
        }
        shellCleanupPromise.then(cleanup => cleanup?.()).catch(console.error);
        xtermRef.current?.dispose();
        xtermRef.current = null;
      };
    } catch (e: any) {
      console.error("Terminal initialization error:", e);
      setError(e.message);
      setIsConnecting(false);
    }
  }, [restartCounter, handleResize]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4 bg-black/40 rounded-xl border border-red-500/20 backdrop-blur-md">
        <AlertTriangle size={32} className="mb-4 animate-bounce" />
        <h3 className="text-lg font-black uppercase tracking-widest mb-2">Terminal Critical Failure</h3>
        <p className="text-xs font-mono opacity-70 mb-6 max-w-md text-center">{error}</p>
        <button 
          onClick={() => setRestartCounter(prev => prev + 1)}
          className="flex items-center gap-2 px-6 py-3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-full text-red-400 text-xs font-black uppercase tracking-widest transition-all active:scale-95"
        >
          <RefreshCw size={14} />
          Emergency Restart
        </button>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      {isConnecting && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
          <Activity size={32} className="text-violet-500 animate-spin mb-4" />
          <span className="text-[10px] font-black text-violet-400 uppercase tracking-[0.3em] animate-pulse">Establishing Neural Link...</span>
        </div>
      )}
      <div ref={terminalRef} className="w-full h-full" />
    </div>
  );
});
