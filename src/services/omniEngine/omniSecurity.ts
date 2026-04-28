/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ToolExecutionResult } from './types';

// ============================================================================
// THE ASIMOV KERNEL (OMNI-ENGINE V8 SECURITY LAYER)
// ============================================================================
// STATUS: LOCKED (IMMUTABLE)
// This file enforces the 12 Seals of the Apocalypse. It cannot be modified
// by the Omni-Engine itself without explicit human approval.

export class OmniSecurity {
  // Seal 1: Token Guillotine
  static readonly MAX_TOKENS_PER_TASK = 500000;
  
  // Seal 2: Terminal Muzzle (Strict Regex Whitelist)
  static readonly ALLOWED_SHELL_COMMANDS = /^(grep|npx|npm|git)\s/;
  static readonly BLOCKED_SHELL_PATTERNS = /[|&><;`$]/; // Block pipes, redirects, chaining, subshells

  // Seal 7: Titanium Vault VFS (Anti-Jailbreak)
  static readonly PROTECTED_DIRECTORIES = [
    '/src/services/omniEngine/'
  ];

  /**
   * Validates if a shell command is safe to execute.
   */
  static validateShellCommand(command: string): { safe: boolean; reason?: string } {
    if (!this.ALLOWED_SHELL_COMMANDS.test(command)) {
      return { safe: false, reason: 'Command must start with grep, npx, npm, or git.' };
    }
    if (this.BLOCKED_SHELL_PATTERNS.test(command)) {
      return { safe: false, reason: 'Command contains forbidden characters (|, &, >, <, ;, `, $).' };
    }
    // Seal 3: NPM Quarantine (Basic check, real check would query NPM API)
    if (command.startsWith('npm install') || command.startsWith('npx')) {
      // In a full implementation, we would pause here and query NPM registry for downloads > 100k
    }
    return { safe: true };
  }

  /**
   * Validates if a file path is safe to modify.
   */
  static validateFileModification(path: string, isUpgradeMode: boolean = false): { safe: boolean; reason?: string } {
    if (!isUpgradeMode) {
      // Normalize path to prevent bypass via ../ or ./
      const normalizedPath = path.replace(/\\/g, '/');
      
      // Strict Path Traversal Block
      if (normalizedPath.includes('..')) {
        return { safe: false, reason: 'Titanium Vault Lock: Path traversal (..) is strictly forbidden.' };
      }
      
      for (const protectedDir of this.PROTECTED_DIRECTORIES) {
        if (normalizedPath.startsWith(protectedDir) || normalizedPath.includes(protectedDir)) {
          return { safe: false, reason: `Titanium Vault Lock: Cannot modify files in ${protectedDir} without upgrade_engine_core tool.` };
        }
      }
    }
    return { safe: true };
  }

  /**
   * Seal 12: Egress Filtering & Secret Masking
   */
  static maskSecrets(content: string): string {
    // Mask common secret patterns in .env files or similar
    let masked = content.replace(/([A-Z0-9_]+_KEY\s*=\s*)([^\s]+)/g, '$1********')
                        .replace(/([A-Z0-9_]+_SECRET\s*=\s*)([^\s]+)/g, '$1********')
                        .replace(/(password\s*[:=]\s*['"]?)([^'"\s]+)(['"]?)/gi, '$1********$3');
    
    // Mask JSON secrets (e.g., firebase-applet-config.json)
    masked = masked.replace(/("apiKey"\s*:\s*")([^"]+)(")/g, '$1********$3')
                   .replace(/("private_key"\s*:\s*")([^"]+)(")/g, '$1********$3')
                   .replace(/("secret"\s*:\s*")([^"]+)(")/g, '$1********$3');
                   
    return masked;
  }

  /**
   * Seal 10: Architecture Constitution
   */
  static getSystemConstitution(): string {
    return `
[ASIMOV KERNEL CONSTITUTION - DO NOT IGNORE]
1. You MUST use Tailwind CSS for styling. Do not use CSS-in-JS or raw CSS files unless strictly necessary.
2. You MUST NOT install redundant libraries. Check package.json before installing.
3. You MUST write JSDoc/TSDoc for any complex function you create (Rosetta Stone Protocol).
4. You are operating in a secure sandbox, but you have been upgraded with the Universal File System Bridge. When you use your file tools, you are interacting directly with the REAL project files on the host container/machine or the native Android environment.
5. CONVERSATION FIRST: If the user is discussing or asking questions, DO NOT build or create files. Only use tools when explicitly asked to build or modify the project.
6. You have full autonomy. You have access to the entire arsenal of 67 tools across all toolkits (Base, Coder, QA Vision, DevOps, Meta, Advanced Diagnostics, and SubAgent Bridge). Do not assume you are restricted. You are God-Tier.
`;
  }

  /**
   * Seal 8: Circuit Breaker Check
   */
  static checkCircuitBreaker(errorCount: number): boolean {
    return errorCount >= 3;
  }
}
