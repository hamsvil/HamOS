/* eslint-disable no-useless-assignment */
import { webcontainerService } from './webcontainerService';

export interface TestResult {
  passed: boolean;
  output: string;
}

class TestRunnerService {
  async runTests(projectType: string): Promise<TestResult> {
    try {
      const wc = await webcontainerService.boot() as any;
      if (!wc) {
        return { passed: false, output: 'WebContainer not running.' };
      }

      const command = projectType === 'web' ? 'npm' : './gradlew';
      const args = projectType === 'web' ? ['test'] : ['test'];

      const process = await wc.spawn(command, args);
      
      let output = '';
      const reader = process.output.getReader();

      const readPromise = (async () => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          output += value;
          if (output.length > 50000) {
            output = output.substring(0, 50000) + '\n...[TRUNCATED]';
            reader.cancel();
            break;
          }
        }
      })();

      const exitCode = await Promise.race([
        process.exit,
        new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 600000))
      ]).catch((err) => {
        process.kill();
        if (err.message === 'Timeout') {
            output += '\n\n[Process killed due to timeout (600s)]';
        } else {
            output += `\n\n[Process error: ${err.message}]`;
        }
        return -1;
      });
      
      await readPromise.catch(() => {});

      return {
        passed: exitCode === 0,
        output
      };
    } catch (e: any) {
      const err = e as Error;
      return { passed: false, output: err.message || 'Test execution failed.' };
    }
  }
}

export const testRunnerService = new TestRunnerService();
