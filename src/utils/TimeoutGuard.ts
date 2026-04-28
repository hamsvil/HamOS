import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

export interface TimeoutResult {
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export function runWithTimeout(cmd: string, timeoutSec: number = 30): Promise<TimeoutResult> {
  return new Promise((resolve) => {
    const timeoutMs = timeoutSec * 1000;
    const child = exec(cmd, { timeout: timeoutMs }, (error, stdout, stderr) => {
      const timedOut = error && (error as any).killed;
      
      if (timedOut) {
        const logEntry = {
          timestamp: new Date().toISOString(),
          command: cmd,
          timeoutSec
        };
        const logPath = path.resolve(process.cwd(), '.lisa/timeout_events.jsonl');
        fs.appendFileSync(logPath, JSON.stringify(logEntry) + '\n');
      }

      resolve({
        stdout,
        stderr,
        timedOut: !!timedOut
      });
    });
  });
}
