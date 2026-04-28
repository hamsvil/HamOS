/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectFile } from '../../../components/HamAiStudio/types';

export interface AntiPattern {
  line: number;
  message: string;
  suggestion: string;
  severity: 'warning' | 'error';
}

export class NeuralContextService {
  private static patterns = [
    {
      regex: /useEffect\s*\(\s*\(\s*\)\s*=>\s*\{[^}]*\}\s*,\s*\[\s*\]\s*\)/g,
      message: 'Empty dependency array in useEffect might lead to stale closures.',
      suggestion: 'Ensure all used variables are in the dependency array or use a ref.',
      severity: 'warning' as const
    },
    {
      regex: /any/g,
      message: 'Usage of "any" type detected. This bypasses TypeScript type safety.',
      suggestion: 'Use a more specific type or "unknown" if the type is truly dynamic.',
      severity: 'warning' as const
    },
    {
      regex: /console\.log/g,
      message: 'Console logs detected in production-ready code.',
      suggestion: 'Remove console logs or use a dedicated logger service.',
      severity: 'warning' as const
    },
    {
      regex: /dangerouslySetInnerHTML/g,
      message: 'Usage of dangerouslySetInnerHTML detected. Potential XSS vulnerability.',
      suggestion: 'Sanitize input before rendering or use a safer alternative.',
      severity: 'error' as const
    },
    {
      regex: /new Function\s*\(/g,
      message: 'Usage of "new Function()" detected. This is a critical security anti-pattern.',
      suggestion: 'Use safer alternatives or move logic to a sandboxed environment.',
      severity: 'error' as const
    },
    {
      regex: /eval\s*\(/g,
      message: 'Usage of "eval()" detected. This is a critical security anti-pattern.',
      suggestion: 'Never use eval(). Use JSON.parse() or other safer alternatives.',
      severity: 'error' as const
    }
  ];

  static analyzeFile(file: ProjectFile): AntiPattern[] {
    if (!file.content) return [];
    
    const lines = file.content.split('\n');
    const antiPatterns: AntiPattern[] = [];

    lines.forEach((lineContent, index) => {
      this.patterns.forEach(pattern => {
        if (pattern.regex.test(lineContent)) {
          antiPatterns.push({
            line: index + 1,
            message: pattern.message,
            suggestion: pattern.suggestion,
            severity: pattern.severity
          });
        }
      });
    });

    return antiPatterns;
  }

  static async validateSyntax(content: string): Promise<string | null> {
    return new Promise((resolve) => {
      // Use the existing worker path but we will update the worker content
      const worker = new Worker(new URL('../../../workers/syntax.worker.ts', import.meta.url), { type: 'module' });
      const id = Math.random().toString(36).substring(7);
      
      const timeout = setTimeout(() => {
        worker.terminate();
        resolve('Syntax validation timed out.');
      }, 8000); // Increased timeout for esbuild-wasm initialization

      worker.onmessage = (e) => {
        if (e.data.id === id) {
          clearTimeout(timeout);
          worker.terminate();
          resolve(e.data.error);
        }
      };

      worker.onerror = (err) => {
        clearTimeout(timeout);
        worker.terminate();
        resolve(`Worker error: ${err.message}`);
      };

      worker.postMessage({ content, id });
    });
  }
}
