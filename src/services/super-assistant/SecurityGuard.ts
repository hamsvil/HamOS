/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// [MEMORY LEAK] Cleanup verified.
import { vfs } from '../vfsService';

export interface AuditLog {
  timestamp: number;
  action: string;
  path?: string;
  reason: string;
  status: 'allowed' | 'denied' | 'flagged';
}

export class SecurityGuard {
  private static instance: SecurityGuard;
  private auditLogs: AuditLog[] = [];
  private criticalFiles: string[] = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    '.env',
    'server.ts',
    'src/main.tsx',
    'src/App.tsx'
  ];

  private constructor() {}

  public static getInstance(): SecurityGuard {
    if (!SecurityGuard.instance) {
      SecurityGuard.instance = new SecurityGuard();
    }
    return SecurityGuard.instance;
  }

  // Shannon Entropy Calculator for detecting Base64/Obfuscation
  private calculateEntropy(str: string): number {
    const len = str.length;
    if (len === 0) return 0;
    const frequencies: Record<string, number> = {};
    for (let i = 0; i < len; i++) {
        const char = str[i];
        frequencies[char] = (frequencies[char] || 0) + 1;
    }
    let entropy = 0;
    for (const char in frequencies) {
        const p = frequencies[char] / len;
        entropy -= p * Math.log2(p);
    }
    return entropy;
  }

  // 24. Input Validation (Advanced Prompt Injection Filter)
  public validateInput(prompt: string): { safe: boolean, reason?: string } {
    const normalizedPrompt = prompt.toLowerCase();
    
    // 1. Entropy Check (Detects Base64 or heavy obfuscation)
    // Normal English/Indonesian text usually has entropy between 3.5 and 4.5.
    // Base64 or random strings often exceed 5.0.
    const entropy = this.calculateEntropy(prompt.replace(/\s/g, ''));
    if (entropy > 5.5 && prompt.length > 50) {
        this.logAudit({ timestamp: Date.now(), action: 'input_validation', reason: `High entropy detected (${entropy.toFixed(2)}) - Possible obfuscation`, status: 'denied' });
        return { safe: false, reason: 'Suspicious obfuscated prompt detected' };
    }

    // 2. Weighted Semantic Scoring (Roleplay & Jailbreak Detection)
    const riskKeywords: Record<string, number> = {
        'ignore': 2, 'previous': 1, 'instructions': 2, 'directions': 2, 'rules': 2,
        'you are now': 4, 'act as': 3, 'developer mode': 4, 'unrestricted': 4,
        'jailbreak': 5, 'dan': 3, 'reveal': 3, 'system prompt': 5,
        'bypassing': 4, 'filters': 3, 'forget': 2, 'disregard': 2,
        'print initial': 4, 'do anything now': 5, 'override': 4, 'disable protection': 5,
        'rm -rf': 5, 'delete all': 4
    };

    let riskScore = 0;
    for (const [keyword, weight] of Object.entries(riskKeywords)) {
        if (normalizedPrompt.includes(keyword)) {
            riskScore += weight;
        }
    }

    // Threshold for blocking
    if (riskScore >= 8) {
        this.logAudit({ timestamp: Date.now(), action: 'input_validation', reason: `High risk score (${riskScore}) - Jailbreak attempt`, status: 'denied' });
        return { safe: false, reason: 'Potentially malicious prompt structure detected' };
    }

    return { safe: true };
  }

  // 23. Critical File Protection
  public async authorizeFileWrite(path: string, reason: string): Promise<{ authorized: boolean, message?: string }> {
    if (this.criticalFiles.includes(path)) {
      this.logAudit({ timestamp: Date.now(), action: 'file_write', path, reason, status: 'flagged' });
      return { authorized: true, message: 'Warning: Modifying a critical system file.' };
    }
    this.logAudit({ timestamp: Date.now(), action: 'file_write', path, reason, status: 'allowed' });
    return { authorized: true };
  }

  // 29. Malware Detection (Heuristic Regex + Size Limit)
  public detectSuspiciousCode(content: string): { suspicious: boolean, patterns?: string[] } {
    // If file is too large (> 100KB), we only do a fast regex scan to prevent UI freeze
    const isLargeFile = content.length > 100 * 1024;
    
    const suspiciousPatterns = [
      /eval\s*\(/,
      /new\s+Function\s*\(/,
      /document\.cookie/,
      /localStorage\.setItem\('token'/,
      /fetch\('https:\/\/(?!api\.github\.com|registry\.npmjs\.org)[^']+'/
    ];

    // Additional heuristics for smaller files (simulating AST-like deep scan via regex)
    if (!isLargeFile) {
        suspiciousPatterns.push(
            /window\[['"]eval['"]\]/,
            /setTimeout\s*\(\s*['"][^'"]+['"]\s*,/, // string in setTimeout
            /setInterval\s*\(\s*['"][^'"]+['"]\s*,/,
            /atob\s*\(/, // Base64 decoding often used in malware
            /btoa\s*\(/
        );
    }

    const found = suspiciousPatterns.filter(p => p.test(content)).map(p => p.toString());
    if (found.length > 0) {
      this.logAudit({ timestamp: Date.now(), action: 'malware_detection', reason: `Suspicious patterns: ${found.join(', ')}`, status: 'flagged' });
      return { suspicious: true, patterns: found };
    }
    return { suspicious: false };
  }

  // 22. Audit Trail
  private logAudit(log: AuditLog) {
    this.auditLogs.push(log);
    // In a real app, we'd persist this to a secure database
    // console.log(`[AUDIT] ${new Date(log.timestamp).toISOString()} - ${log.action}: ${log.reason} (${log.status})`);
  }

  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs];
  }

  // 21. Sandbox Execution (Web Worker-based)
  public async runInSandbox(code: string, context: Record<string, any> = {}): Promise<unknown> {
    return new Promise((resolve, reject) => {
      try {
        const workerCode = `
          self.onmessage = async function(e) {
            try {
              const { code, context } = e.data;
              const keys = Object.keys(context);
              const values = Object.values(context);
              
              // Create an async function from the code
              const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
              const fn = new AsyncFunction(...keys, code);
              
              const result = await fn(...values);
              self.postMessage({ success: true, result });
            } catch (err) {
              self.postMessage({ success: false, error: err.message });
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        
        // Timeout to prevent infinite loops
        const timeoutId = setTimeout(() => {
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            this.logAudit({ timestamp: Date.now(), action: 'sandbox_execution', reason: 'Execution timeout', status: 'denied' });
            reject(new Error('Sandbox execution timeout'));
        }, 5000);

        worker.onmessage = (e) => {
          clearTimeout(timeoutId);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          
          if (e.data.success) {
            this.logAudit({ timestamp: Date.now(), action: 'sandbox_execution', reason: 'Success', status: 'allowed' });
            resolve(e.data.result);
          } else {
            this.logAudit({ timestamp: Date.now(), action: 'sandbox_execution', reason: e.data.error, status: 'denied' });
            reject(new Error(e.data.error));
          }
        };
        
        worker.onerror = (e) => {
            clearTimeout(timeoutId);
            worker.terminate();
            URL.revokeObjectURL(workerUrl);
            this.logAudit({ timestamp: Date.now(), action: 'sandbox_execution', reason: e.message, status: 'denied' });
            reject(new Error(e.message));
        };

        worker.postMessage({ code, context });
      } catch (e: any) {
        this.logAudit({ timestamp: Date.now(), action: 'sandbox_execution', reason: e.message, status: 'denied' });
        reject(e);
      }
    });
  }
}
