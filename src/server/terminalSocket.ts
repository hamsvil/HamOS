/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { Server as SocketIOServer } from 'socket.io';
import { spawn, ChildProcess } from 'child_process';
import os from 'os';
import fs from 'fs';
import { resolvePkgCommand } from './terminal/pkgWrapper';

export function setupTerminalSocket(io: SocketIOServer) {
  io.on('connection', (socket) => {
    console.log('[Terminal] Client connected:', socket.id);

    socket.on('error', (err) => {
      console.error('[Terminal] Socket error:', err);
    });

    let shellProcess: ChildProcess | null = null;
    let isPty = false;

    socket.on('start_terminal', (options: { cols?: number; rows?: number; cwd?: string } = {}) => {
      if (shellProcess) {
        shellProcess.kill('SIGKILL');
      }

      // Detect available shell
      const shells = ['/bin/bash', '/bin/zsh', '/bin/sh'];
      const shellToUse = shells.find(s => fs.existsSync(s)) || '/bin/sh';
      let shell = os.platform() === 'win32' ? 'cmd.exe' : shellToUse;
      let args: string[] = [];
      
      // Try to use 'script' for PTY simulation if node-pty is not available
      if (os.platform() !== 'win32') {
        const scriptPaths = ['/usr/bin/script', '/bin/script'];
        const scriptPath = scriptPaths.find(s => fs.existsSync(s));
        
        if (scriptPath) {
          shell = scriptPath;
          // -q: quiet, -c: command, /dev/null: log file
          // Use the detected shell
          args = ['-q', '-c', `${shellToUse} -i`, '/dev/null'];
          isPty = true;
        } else {
          console.warn('[Terminal] script command not found, falling back to pipe simulation');
          args = ['-i'];
          isPty = false;
        }
      } else {
        isPty = false;
      }
      
      try {
        console.log(`[Terminal] Spawning shell: ${shell} with args: ${JSON.stringify(args)} (isPty: ${isPty})`);
        shellProcess = spawn(shell, args, {
          env: { 
            ...process.env, 
            TERM: 'xterm-256color', 
            COLORTERM: 'truecolor',
            COLUMNS: String(options.cols || 80),
            LINES: String(options.rows || 24),
            LANG: 'en_US.UTF-8'
          },
          cwd: options.cwd || process.cwd(),
          stdio: ['pipe', 'pipe', 'pipe']
        });

        let hasOutput = false;

        if (shellProcess.stdout) {
          shellProcess.stdout.on('data', (data) => {
            hasOutput = true;
            socket.emit('terminal_output', data.toString());
          });
          shellProcess.stdout.on('error', (err) => {
            console.error('[Terminal] stdout error:', err);
          });
        }

        if (shellProcess.stderr) {
          shellProcess.stderr.on('data', (data) => {
            hasOutput = true;
            socket.emit('terminal_output', data.toString());
          });
          shellProcess.stderr.on('error', (err) => {
            console.error('[Terminal] stderr error:', err);
          });
        }

        if (shellProcess.stdin) {
          shellProcess.stdin.on('error', (err) => {
            console.error('[Terminal] stdin error:', err);
          });
        }

        shellProcess.on('close', (code) => {
          console.log(`[Terminal] Shell process closed with code ${code}`);
          if (isPty && !hasOutput && code !== 0) {
            console.warn('[Terminal] PTY simulation failed, falling back to pipe simulation');
            socket.emit('terminal_output', `\r\n\x1b[1;33m[PTY simulation failed, falling back to pipe simulation]\x1b[0m\r\n`);
            // Fallback to pipe simulation
            isPty = false;
            const fallbackShell = shells.find(s => fs.existsSync(s)) || '/bin/sh';
            shellProcess = spawn(fallbackShell, ['-i'], {
              env: { 
                ...process.env, 
                TERM: 'xterm-256color', 
                COLORTERM: 'truecolor',
                COLUMNS: String(options.cols || 80),
                LINES: String(options.rows || 24),
                LANG: 'en_US.UTF-8'
              },
              cwd: options.cwd || process.cwd(),
              stdio: ['pipe', 'pipe', 'pipe']
            });
            
            if (shellProcess.stdout) {
              shellProcess.stdout.on('data', (data) => socket.emit('terminal_output', data.toString()));
              shellProcess.stdout.on('error', (err) => console.error('[Terminal] fallback stdout error:', err));
            }
            if (shellProcess.stderr) {
              shellProcess.stderr.on('data', (data) => socket.emit('terminal_output', data.toString()));
              shellProcess.stderr.on('error', (err) => console.error('[Terminal] fallback stderr error:', err));
            }
            if (shellProcess.stdin) {
              shellProcess.stdin.on('error', (err) => console.error('[Terminal] fallback stdin error:', err));
            }
            shellProcess.on('close', (fallbackCode) => {
              socket.emit('terminal_output', `\r\n\x1b[1;31m[Process exited with code ${fallbackCode}]\x1b[0m\r\n`);
              shellProcess = null;
            });
            shellProcess.on('error', (err) => {
              socket.emit('terminal_output', `\r\n\x1b[1;31m[Error: ${err.message}]\x1b[0m\r\n`);
            });
          } else {
            socket.emit('terminal_output', `\r\n\x1b[1;31m[Process exited with code ${code}]\x1b[0m\r\n`);
            shellProcess = null;
          }
        });

        shellProcess.on('error', (err) => {
          console.error('[Terminal] Shell process error:', err);
          socket.emit('terminal_output', `\r\n\x1b[1;31m[Error: ${err.message}]\x1b[0m\r\n`);
        });

        // Initial welcome message
        socket.emit('terminal_output', `\r\n\x1b[1;32mWelcome to Ham Quantum Terminal (Interactive Mode: ${isPty ? 'PTY-Sim' : 'Pipe-Sim'})\x1b[0m\r\n`);
        
      } catch (err: any) {
        console.error('[Terminal] Failed to spawn shell:', err);
        socket.emit('terminal_output', `\r\n\x1b[1;31m[Failed to start shell: ${err.message}]\x1b[0m\r\n`);
      }
    });

    socket.on('terminal_input', (data: string) => {
      if (shellProcess && shellProcess.stdin && shellProcess.stdin.writable) {
        // Intercept 'pkg' commands if they are sent as full lines
        // Note: This is simplified. Real interactive interception is harder with raw stream.
        // But for terminal_input we usually get keys. 
        // We'll rely on the shell executing the pkg wrapper if it's in the path, 
        // or just let it pass through if it's already handled by the shell.
        
        // If not a real PTY, we need to handle some translations
        if (!isPty) {
          // Replace \r with \n for standard shell input
          const stdinData = data.replace(/\r/g, '\n');
          shellProcess.stdin.write(stdinData);
          
          // Local echo for non-PTY
          if (data === '\r') {
            socket.emit('terminal_output', '\r\n');
          } else if (data === '\x7f') { // Backspace
            socket.emit('terminal_output', '\b \b');
          } else if (data === '\u0003') { // Ctrl+C
            socket.emit('terminal_output', '^C\r\n');
          } else {
            // Avoid echoing control characters
            if (data.length === 1 && data.charCodeAt(0) >= 32) {
              socket.emit('terminal_output', data);
            }
          }
        } else {
          // With 'script' PTY, we can send data as-is
          shellProcess.stdin.write(data);
        }
      }
    });

    socket.on('ping', () => {
      socket.emit('pong');
    });

    socket.on('resize_terminal', (size: { cols: number; rows: number }) => {
      if (shellProcess && shellProcess.stdin && shellProcess.stdin.writable) {
        // Try to set environment variables in the running shell
        // This works for bash/sh if they are at a prompt
        shellProcess.stdin.write(`export COLUMNS=${size.cols} LINES=${size.rows}\n`);
      }
    });

    socket.on('execute_command', ({ command }: { command: string }, callback: (res: { output: string, isError: boolean }) => void) => {
      console.log(`[Terminal] [${socket.id}] Executing command: ${command}`);
      let isCallbackCalled = false;
      
      const safeCallback = (res: { output: string, isError: boolean }) => {
        if (!isCallbackCalled) {
          isCallbackCalled = true;
          callback(res);
        }
      };

      // AI Studio Enhanced Sanitization & Auto-Enhancement
      let finalCommand = command;
      
      // Block dangerous commands
      const dangerousPatterns = [
        /rm\s+-rf\s+\//,
        /:\(\)\{/,
        /wget\s+http.*\|.*sh/,
        /chmod\s+-R\s+777/,
        /chown\s+-R\s+root/
      ];
      
      if (dangerousPatterns.some(pattern => pattern.test(finalCommand))) {
        return safeCallback({ output: 'Error: Command blocked by Singularity Safety Protocol', isError: true });
      }

      // Auto-enhance grep
      if (finalCommand.includes('grep ') && !finalCommand.includes('--exclude-dir')) {
        finalCommand = finalCommand.replace('grep ', 'grep -rI --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist --exclude-dir=.next ');
      }

      // Auto-enhance npx
      if (finalCommand.includes('npx ') && !finalCommand.includes('-y')) {
        finalCommand = finalCommand.replace('npx ', 'npx -y ');
      }

      try {
        const shellToUse = fs.existsSync('/bin/bash') ? '/bin/bash' : '/bin/sh';
        const proc = spawn(finalCommand, { 
          shell: shellToUse, 
          cwd: process.cwd(),
          env: { 
            ...process.env, 
            FORCE_COLOR: '1',
            TERM: 'xterm-256color'
          }
        });
        let output = '';
        let isError = false;

        // Set a hard timeout for the process itself
        const processTimeout = setTimeout(() => {
          console.warn(`[Terminal] [${socket.id}] Command timed out: ${command}`);
          proc.kill('SIGKILL');
          safeCallback({ output: output + '\n\n[Error: Command timed out on server (290s)]', isError: true });
        }, 290000); // 290 seconds

        if (proc.stdout) {
          proc.stdout.on('data', (data) => {
            output += data.toString();
            // Limit output size to prevent socket congestion (5MB)
            if (output.length > 5000000) {
              output = output.substring(0, 5000000) + '\n\n[Output truncated due to size limit (5MB)]';
              proc.kill('SIGKILL');
            }
          });
          proc.stdout.on('error', (err) => console.error(`[Terminal] [${socket.id}] proc stdout error:`, err));
        }

        if (proc.stderr) {
          proc.stderr.on('data', (data) => {
            output += data.toString();
            isError = true;
          });
          proc.stderr.on('error', (err) => console.error(`[Terminal] [${socket.id}] proc stderr error:`, err));
        }

        if (proc.stdin) {
          proc.stdin.on('error', (err) => console.error(`[Terminal] [${socket.id}] proc stdin error:`, err));
        }

        proc.on('close', (code) => {
          clearTimeout(processTimeout);
          console.log(`[Terminal] [${socket.id}] Command finished with code ${code}: ${command}`);
          safeCallback({ output, isError: code !== 0 || isError });
        });

        proc.on('error', (err) => {
          clearTimeout(processTimeout);
          console.error(`[Terminal] [${socket.id}] Command error: ${err.message}`);
          safeCallback({ output: `Error: ${err.message}`, isError: true });
        });
      } catch (err: any) {
        console.error(`[Terminal] [${socket.id}] Failed to spawn command: ${err.message}`);
        safeCallback({ output: `Failed to execute: ${err.message}`, isError: true });
      }
    });

    socket.on('disconnect', () => {
      console.log('[Terminal] Client disconnected:', socket.id);
      if (shellProcess) {
        shellProcess.kill();
      }
    });
  });
}
