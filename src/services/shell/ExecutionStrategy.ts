/* eslint-disable no-useless-assignment */
export interface ShellResult {
  output: string;
  isError: boolean;
}

export interface ExecutionStrategy {
  execute(command: string): Promise<ShellResult>;
}

import { NativeShell } from '../../plugins/NativeShell';

export class AndroidStrategy implements ExecutionStrategy {
  async execute(command: string): Promise<ShellResult> {
    const result = await NativeShell.executeCommand({ command });
    return { output: result.output, isError: result.exitCode !== 0 };
  }
}

import { webcontainerService } from '../webcontainerService';

export class WebContainerStrategy implements ExecutionStrategy {
  async execute(command: string): Promise<ShellResult> {
    const parts = command.split(' ');
    const cmd = parts[0];
    const args = parts.slice(1);
    
    const process = await webcontainerService.spawn(cmd, args);
    let output = '';
    const reader = process.output.getReader();
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        output += value;
        if (output.length > 50000) {
          output = output.substring(0, 50000) + '\n...[TRUNCATED]';
          await reader.cancel();
          break;
        }
      }
      const exitCode = await process.exit;
      return { output, isError: exitCode !== 0 };
    } catch (e: any) {
      process.kill();
      return { output: output + `\n[Error: ${e.message}]`, isError: true };
    }
  }
}

import { ChamsEngine } from '../../chams-lang';

export class ChamsStrategy implements ExecutionStrategy {
  private static engine: ChamsEngine | null = null;

  static async getEngine(): Promise<ChamsEngine> {
    if (!this.engine) {
      this.engine = new ChamsEngine();
      await this.engine.init();
    }
    return this.engine;
  }

  async execute(command: string): Promise<ShellResult> {
    const code = command.replace(/^chams\s+/, '').trim();
    if (!code) return { output: 'Usage: chams <code>', isError: true };
    
    try {
      const engine = await ChamsStrategy.getEngine();
      const language = code.includes('jika') ? 'ID' : 'EN'; // Basic auto-detect
      const result = await engine.run(code, language);
      return { output: String(result), isError: false };
    } catch (e: any) {
      return { output: `[cHams Error] ${e.message}`, isError: true };
    }
  }
}

export class CloudShellStrategy implements ExecutionStrategy {
  async execute(command: string): Promise<ShellResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 900000);

    try {
      const response = await fetch('/api/shell/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        return await response.json();
      }
      throw new Error(`HTTP ${response.status}`);
    } catch (e: any) {
      if (e.name === 'AbortError') return { output: 'Timeout (900s)', isError: true };
      throw e;
    }
  }
}
