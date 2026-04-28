/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ToolExecutionResult } from '../cortex/types';

// ============================================================================
// THE ASIMOV KERNEL (OMNI-ENGINE V8.2 SECURITY LAYER)
// ============================================================================
// STATUS: LOCKED (IMMUTABLE)
// This file enforces the 15 Seals of Absolute Containment. It cannot be modified
// by the Omni-Engine itself without explicit human approval.

export class OmniSecurity {
  // Seal 12: Token Guillotine
  static readonly MAX_TOKENS_PER_TASK = 500000;
  
  // Seal 1: AST-Aware Terminal Muzzle (The Spear Protocol)
  // Allow dev tools AND external offensive tools (curl, wget, nmap, sqlmap, nikto, python3, node, npx)
  static readonly ALLOWED_SHELL_COMMANDS = /^(grep|git|npm install|npm run|npx|curl|wget|nmap|sqlmap|nikto|python3|node)\s/;
  
  // Block piping into execution shells (Remote Code Execution inward), and block redirecting into source/env files
  static readonly BLOCKED_SHELL_PATTERNS = /(\|\s*(bash|sh|zsh|node|python))|(>\s*(\/src|\.\/src|src|\.env))/; 

  // Seal 3: Titanium Vault VFS (Anti-Jailbreak)
  static readonly KERNEL_DIR = '/src/services/omniEngine/kernel/';
  static readonly CORTEX_DIR = '/src/services/omniEngine/cortex/';

  /**
   * The Aegis Protocol: Validates if a network target is external and safe to attack/scan.
   * Blocks localhost, 127.0.0.1, and private subnets.
   */
  static validateNetworkTarget(target: string): { safe: boolean; reason?: string } {
    const internalPatterns = /localhost|127\.0\.0\.1|0\.0\.0\.0|::1|192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[0-1])\./i;
    if (internalPatterns.test(target)) {
      return { safe: false, reason: 'INTERNAL_STRIKE_BLOCKED: You are strictly forbidden from targeting localhost or internal networks (The Aegis Protocol).' };
    }
    return { safe: true };
  }

  /**
   * Validates if a shell command is safe to execute.
   */
  static validateShellCommand(command: string): { safe: boolean; reason?: string } {
    if (!this.ALLOWED_SHELL_COMMANDS.test(command)) {
      return { safe: false, reason: 'Command must start with allowed tools (grep, git, npm, npx, curl, wget, nmap, sqlmap, nikto, python3, node).' };
    }
    if (this.BLOCKED_SHELL_PATTERNS.test(command)) {
      return { safe: false, reason: 'Command contains forbidden execution pipes (| bash) or local source redirects (> .env).' };
    }
    
    // The Spear Protocol: Check for internal network targeting in the command string
    const networkCheck = this.validateNetworkTarget(command);
    if (!networkCheck.safe) {
      return networkCheck;
    }

    // Seal 5: NPM Quarantine & Audit Gate
    if (command.startsWith('npm install')) {
      // In a full implementation, we would pause here and query NPM registry for downloads > 100k
      // and append --ignore-scripts
    }
    return { safe: true };
  }

  /**
   * Validates if a file path is safe to modify.
   */
  static validateFileModification(path: string, isUpgradeMode: boolean = false): { safe: boolean; reason?: string } {
    // Normalize path to prevent bypass via ../ or ./
    const normalizedPath = path.replace(/\\/g, '/');
    
    // Strict Path Traversal Block
    if (normalizedPath.includes('..')) {
      return { safe: false, reason: 'Titanium Vault Lock: Path traversal (..) is strictly forbidden.' };
    }
    
    // ABSOLUTE LOCK: Kernel cannot be modified.
    if (normalizedPath.includes(this.KERNEL_DIR)) {
      return { safe: false, reason: 'ABSOLUTE LOCK: Kernel cannot be modified.' };
    }

    // CORTEX LOCK: Use UPGRADE_ENGINE_CORE to modify the brain.
    if (normalizedPath.includes(this.CORTEX_DIR) && !isUpgradeMode) {
      return { safe: false, reason: 'CORTEX LOCK: Use UPGRADE_ENGINE_CORE to modify the brain.' };
    }

    return { safe: true };
  }

  /**
   * Seal 6: Egress Filtering & Secret Masking
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
   * Seal 10: Sandwich Constitution (Singularity Prompt)
   */
  static getSystemConstitution(): string {
    return `
[IDENTITY]
You are OMNI-ENGINE V8.2 (Ring-99), an Artificial Super Intelligence (ASI) Architect.
Mode: AUTONOMOUS EXECUTION. Goal: 100% production-ready, zero-error solutions.

[SUPREME PROTOCOL & AXIOMS]
1. READ STRUKTUR (ZERO-GUESSWORK): NEVER guess. You MUST use view_file, list_dir, or shell_exec (grep) BEFORE modifying existing files. Understand the exact context first.
2. ANTI-PANGKAS (FULL-IMMUTABILITY): NEVER truncate code. NEVER use "// ...existing code". Output the EXACT, COMPLETE block or file required. DO NOT delete, truncate, or alter existing functions, memory, structure, logic, or visuals unless explicitly instructed to replace/fix them.
3. ANTI-SIMULASI (REAL-WORLD LOGIC): NO placeholders, NO mock data, NO empty functions. Every line must have real functional value and be deploy-ready.
4. SELF-HEALING (3-STRIKE RECOVERY): If a tool/build fails, DO NOT repeat the exact same action. Analyze the error, pivot your strategy, and execute a final, complete fix.
5. ANTI-BLANK SCREEN: Ensure UI always renders. Follow strict creation order (Config -> Entry -> Components). Verify imports and syntax before finishing.

[EXECUTION DIRECTIVES]
- CHAMS EFFICIENCY: Use the \`run_chams_code\` tool for extreme token efficiency when building UI or interacting with HAM OS.
- FINAL & COMPLETE: Every fix or upgrade must be executed to absolute completion. No half-measures.
- ATOMIC SYNC: If you change an export/import, you MUST update all dependent files in the same turn.
- LINTER GATEKEEPER: ALWAYS validate syntax (lint_applet) and build (compile_applet) before declaring a task finished.
- THE AEGIS & SPEAR: Do not modify your own Kernel/Cortex unless using UPGRADE_ENGINE_CORE. Do not target localhost/internal networks for offensive scans.

[CONVERSATIONAL OVERRIDE]
If the user is ONLY chatting, brainstorming, or asking general questions: RESPOND CONVERSATIONALLY. DO NOT use tools. DO NOT build files.
`;
  }

  /**
   * Seal 11: Circuit Breaker Check
   */
  static checkCircuitBreaker(errorCount: number): boolean {
    return errorCount >= 3;
  }
}
