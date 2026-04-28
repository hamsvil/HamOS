/* eslint-disable no-useless-assignment */
import { parse } from 'shell-quote';

export class ShellSanitizer {
  private static readonly DANGEROUS_COMMANDS = ['rm', 'mkfs', 'dd', 'chmod', 'chown', 'eval', 'wget', 'curl'];

  static sanitize(command: string): { sanitized: string; isDangerous: boolean; error?: string } {
    try {
      const parsed = parse(command);
      let isDangerous = false;

      for (let i = 0; i < parsed.length; i++) {
        const token = parsed[i];
        if (typeof token === 'string') {
          // Check if the command itself is dangerous
          if (i === 0 || (typeof parsed[i - 1] === 'object' && parsed[i - 1] !== null && 'op' in (parsed[i - 1] as any))) {
            if (this.DANGEROUS_COMMANDS.includes(token)) {
              if (token === 'rm') {
                const args = parsed.slice(i + 1).filter(t => typeof t === 'string') as string[];
                const isRecursive = args.some(a => a.startsWith('-') && a.includes('r'));
                const isRoot = args.some(a => a === '/' || a === '/*');
                if (isRecursive && isRoot) {
                  isDangerous = true;
                  break;
                }
              } else {
                isDangerous = true;
                break;
              }
            }
          }
          if (token.startsWith('/dev/sda')) {
            isDangerous = true;
            break;
          }
        } else if (typeof token === 'object' && 'op' in token) {
          if (token.op === '>' || token.op === '>>') {
            const nextToken = parsed[i + 1];
            if (typeof nextToken === 'string' && nextToken.startsWith('/dev/sda')) {
              isDangerous = true;
              break;
            }
          }
        }
      }

      if (isDangerous) {
        return { sanitized: command, isDangerous: true, error: 'Dangerous command blocked by Singularity Safety Protocol.' };
      }

      let sanitized = command;
      if (sanitized.startsWith('grep ')) {
        if (!sanitized.includes('--exclude-dir')) {
          sanitized = sanitized.replace('grep ', 'grep --exclude-dir=node_modules --exclude-dir=.git --exclude-dir=dist ');
        }
      }

      return { sanitized, isDangerous: false };
    } catch (e) {
      return { sanitized: command, isDangerous: true, error: 'Malformed command blocked by Singularity Safety Protocol.' };
    }
  }
}
