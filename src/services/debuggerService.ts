/* eslint-disable no-useless-assignment */
// [STABILITY] Promise chains verified
import { webcontainerService, IWebContainerProcess } from './webcontainerService';
import { vfs } from './vfsService';

export interface Breakpoint {
  path: string;
  line: number;
}

export interface DebugSession {
  id: string;
  status: 'running' | 'paused' | 'stopped';
  currentLine?: number;
  currentFile?: string;
  variables?: Record<string, unknown>;
}

export class DebuggerService {
  private static instance: DebuggerService;
  private currentProcess: IWebContainerProcess | null = null;
  private session: DebugSession | null = null;
  private listeners: ((session: DebugSession) => void)[] = [];
  private breakpoints: Breakpoint[] = [];

  private constructor() {}

  public static getInstance(): DebuggerService {
    if (!DebuggerService.instance) {
      DebuggerService.instance = new DebuggerService();
    }
    return DebuggerService.instance;
  }

  public subscribe(listener: (session: DebugSession) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private notify() {
    if (this.session) {
      this.listeners.forEach(l => l({ ...this.session! }));
    }
  }

  public setBreakpoints(breakpoints: Breakpoint[]) {
    this.breakpoints = breakpoints;
  }

  public async startDebug(entryFile: string) {
    if (this.currentProcess) {
      this.stop();
    }

    this.session = {
      id: Date.now().toString(),
      status: 'running',
    };
    this.notify();

    try {
      // 1. Read entry file
      const code = await vfs.readFile(entryFile);
      
      // 2. Instrument code (Simple line-based instrumentation)
      // We inject `await __db.c(line);` at the start of each line
      const lines = code.split('\n');
      const instrumentedLines = lines.map((line, i) => {
        // Simple heuristic: don't instrument empty lines or comments
        if (!line.trim() || line.trim().startsWith('//')) return line;
        // Inject check. We use a very short function name to minimize impact.
        // We assume async context or we wrap in async IIFE.
        return `await __db.c(${i + 1}); ${line}`;
      });
      
      const instrumentedCode = `
const __db = require('./__debug_lib.js');
(async () => {
  try {
    ${instrumentedLines.join('\n')}
  } catch (e) {
    console.error(e);
  }
})();
`;

      // 3. Write debug files
      await vfs.writeFile('__debug_runner.js', instrumentedCode);
      await vfs.writeFile('__debug_lib.js', this.getDebugLibCode());

      // 4. Spawn process
      this.currentProcess = await webcontainerService.spawn('node', ['__debug_runner.js']).catch(err => {
        console.error('Debugger: Failed to spawn process', err);
        return null;
      });

      if (!this.currentProcess) {
        throw new Error('Failed to spawn debugger process');
      }

      // 5. Handle output
      this.currentProcess.output.pipeTo(new WritableStream({
        write: (data) => {
          this.handleOutput(data);
        }
      })).catch(err => console.error('Debugger: Output stream error', err));

      this.currentProcess.exit.then(() => {
        this.session = { ...this.session!, status: 'stopped' };
        this.notify();
        this.currentProcess = null;
      }).catch(console.error);

    } catch (e) {
      // Failed to start debugger
      this.session = { ...this.session!, status: 'stopped' };
      this.notify();
    }
  }

  public stop() {
    if (this.currentProcess) {
      this.currentProcess.kill();
      this.currentProcess = null;
    }
    this.session = { ...this.session!, status: 'stopped' };
    this.notify();
  }

  public continue() {
    this.sendCommand('continue');
  }

  public stepOver() {
    this.sendCommand('step');
  }

  private sendCommand(cmd: string) {
    if (this.currentProcess) {
      const writer = this.currentProcess.input.getWriter();
      writer.write(cmd + '\n');
      writer.releaseLock();
      
      if (this.session?.status === 'paused') {
          this.session.status = 'running';
          this.notify();
      }
    }
  }

  private handleOutput(data: string) {
    // Check for debug signals
    if (data.includes('__DB_PAUSED:')) {
      const match = data.match(/__DB_PAUSED:(\d+)/);
      if (match) {
        const line = parseInt(match[1]);
        this.session = {
          ...this.session!,
          status: 'paused',
          currentLine: line,
          currentFile: 'entry', // simplified
        };
        this.notify();
      }
    } else {
      // Normal output
      // console.log('[App]', data);
    }
  }

  private getDebugLibCode() {
    return `
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let breakpoints = ${JSON.stringify(this.breakpoints.map(b => b.line))};
let stepping = false;

function wait() {
  return new Promise(resolve => {
    rl.question('', (ans) => {
      const cmd = ans.trim();
      if (cmd === 'step') {
        stepping = true;
      } else if (cmd === 'continue') {
        stepping = false;
      }
      resolve();
    });
  });
}

exports.c = async function(line) {
  if (breakpoints.includes(line) || stepping) {
    process.stdout.write('__DB_PAUSED:' + line + '\\n');
    await wait();
  }
};
`;
  }
}

export const debuggerService = DebuggerService.getInstance();
