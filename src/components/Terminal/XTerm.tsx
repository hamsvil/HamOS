 
// [MEMORY LEAK] Cleanup verified.
import React, { useEffect, useRef } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { WebLinksAddon } from 'xterm-addon-web-links';
import { useTheme } from '../../context/ThemeContext';
import { shellService } from '../../services/shellService';
import 'xterm/css/xterm.css';

interface XTermProps {
  onData?: (data: string) => void;
  onProcessStarted?: (process: any) => void;
  className?: string;
}

const XTerm: React.FC<XTermProps> = ({ onData, onProcessStarted, className }) => {
  const terminalRef = useRef<HTMLDivElement>(null);
  const xtermRef = useRef<Terminal | null>(null);
  const fitAddonRef = useRef<FitAddon | null>(null);
  const { theme } = useTheme();

  useEffect(() => {
    if (!terminalRef.current) return;

    const isDark = theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);

    const term = new Terminal({
      cursorBlink: true,
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 14,
      theme: {
        background: isDark ? '#0a0a0a' : '#f5f5f5',
        foreground: isDark ? '#d4d4d4' : '#333333',
        cursor: isDark ? '#ffffff' : '#000000',
        selectionBackground: isDark ? '#3e4451' : '#add6ff',
        black: isDark ? '#000000' : '#000000',
        red: '#e06c75',
        green: '#98c379',
        yellow: '#e5c07b',
        blue: '#61afef',
        magenta: '#c678dd',
        cyan: '#56b6c2',
        white: isDark ? '#d4d4d4' : '#333333',
        brightBlack: isDark ? '#5c6370' : '#666666',
        brightRed: '#e06c75',
        brightGreen: '#98c379',
        brightYellow: '#e5c07b',
        brightBlue: '#61afef',
        brightMagenta: '#c678dd',
        brightCyan: '#56b6c2',
        brightWhite: isDark ? '#ffffff' : '#000000',
      },
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);

    term.open(terminalRef.current);
    if (term.element) {
      try {
        fitAddon.fit();
      } catch (e) {
        console.warn('Initial fit error:', e);
      }
    }
    term.focus();

    xtermRef.current = term;
    fitAddonRef.current = fitAddon;

    term.writeln('\x1b[1;32mHam Quantum Terminal v2.0\x1b[0m');
    term.writeln('Connecting to shell...\r\n');

    let shellProcess: any = null;
    let mobileInputHandler: ((event: any) => void) | null = null;
    let textareaElement: HTMLTextAreaElement | null = null;

    const startShell = async () => {

      try {
        shellProcess = await shellService.spawnInteractive({
          cols: term.cols,
          rows: term.rows
        });

        if (onProcessStarted) {
          onProcessStarted(shellProcess);
        }

        // Pipe shell output to terminal
        const reader = shellProcess.output.getReader();
        const readOutput = async () => {
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              term.write(value);
            }
          } catch (e) {
            console.error('Terminal read error:', e);
          }
        };
        readOutput();

        // Pipe terminal input to shell
        const writer = shellProcess.input.getWriter();
        term.onData((data) => {
          writer.write(data);
          onData?.(data);
        });

        // Add input listener for mobile virtual keyboards
        if (term.textarea) {
          textareaElement = term.textarea;
          mobileInputHandler = (event: any) => {
            const data = event.data;
            if (data) {
              writer.write(data);
              onData?.(data);
            }
          };
          textareaElement.addEventListener('input', mobileInputHandler);
        }

        term.writeln('\x1b[1;34m[System] Shell Connected\x1b[0m\r\n');
      } catch (error: any) {
        term.writeln(`\r\n\x1b[1;31m[Error] Failed to start shell: ${error.message}\x1b[0m`);
      }
    };

    startShell();

    const resizeObserver = new ResizeObserver(() => {
      if (!terminalRef.current || terminalRef.current.clientWidth === 0 || terminalRef.current.clientHeight === 0 || !term.element) return;
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
          console.warn('Terminal resize error:', e);
        }
      }
    });

    if (terminalRef.current) {
      resizeObserver.observe(terminalRef.current);
    }

    return () => {
      resizeObserver.disconnect();
      if (shellProcess) {
        shellProcess.kill();
      }
      if (textareaElement && mobileInputHandler) {
        textareaElement.removeEventListener('input', mobileInputHandler);
      }
      term.dispose();
    };
  }, [theme]);

  return <div ref={terminalRef} className={`h-full w-full bg-[#0a0a0a] ${className}`} />;
};

export default XTerm;
