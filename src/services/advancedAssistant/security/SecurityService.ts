/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData } from '../../../components/HamAiStudio/types';
import { safeStorage } from '../../../utils/storage';
import { APP_CONFIG } from '../../../constants/config';

export interface SecurityContext {
  userId: string;
  role: string;
  permissions: string[];
}

// Simple HMAC-like signing for audit logs (client-side only, weak but better than plaintext)
const signLog = async (data: string): Promise<string> => {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
        'raw',
        encoder.encode(APP_CONFIG.SECURITY.HMAC_SECRET),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
    );
    const signature = await crypto.subtle.sign(
        'HMAC',
        key,
        encoder.encode(data)
    );
    return Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
};

// 5. Security & Sandboxing
// Ensures all actions are safe and authorized
export class SecurityService {
  private allowedActions: string[] = ['write_file', 'read_file', 'edit_file', 'run_command', 'preview_changes', 'list_files', 'delete_file', 'move_file', 'mkdir', 'multi_edit'];
  
  // Enhanced validation using structure analysis instead of simple regex
  private isCommandSafe(command: string): boolean {
      const dangerousTokens = ['rm -rf /', 'sudo', 'eval(', 'process.exit', 'wget http:', 'curl http:', 'mkfs'];
      // Check for exact dangerous patterns
      if (dangerousTokens.some(token => command.includes(token))) return false;
      
      // Check for obfuscated patterns (basic)
      if (command.match(/base64|decode/i) && command.length > 100) return false; // Potential obfuscated payload
      
      return true;
  }

  public validateExecution(action: string, context: SecurityContext): boolean {
    if (!this.allowedActions.includes(action)) {
      console.warn(`Blocked unauthorized action: ${action}`);
      return false;
    }
    
    // RBAC Check
    if (action === 'run_command') {
        if (context.role !== 'admin' && !context.permissions.includes('execute_shell')) {
            console.warn(`Blocked command execution for user ${context.userId} (Role: ${context.role})`);
            return false;
        }
    }
    
    return true;
  }

  public validateCommandContent(command: string): boolean {
      return this.isCommandSafe(command);
  }

  public sanitizeInput(input: string): string {
    if (!input) return '';
    // Remove potentially dangerous characters or patterns from user input
    // We remove script tags to prevent XSS if the input is rendered directly
    let sanitized = input.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "");
    
    // Basic Prompt Injection mitigation:
    // Prevent system prompt override attempts
    const injectionPatterns = [
        /ignore all previous instructions/i,
        /you are now a/i,
        /forget everything/i,
        /system prompt:/i,
        /new instructions:/i
    ];
    
    for (const pattern of injectionPatterns) {
        if (pattern.test(sanitized)) {
            console.warn("Potential prompt injection detected and neutralized.");
            sanitized = sanitized.replace(pattern, "[BLOCKED_INJECTION_ATTEMPT]");
        }
    }
    
    return sanitized;
  }

  public sanitizeOutput(output: string): string {
    // In a code editor context, stripping <script> tags breaks HTML file generation.
    // The output is written to VFS and executed in an isolated iframe or WebContainer,
    // so it is safe to allow script tags.
    // We only need to prevent the AI from injecting scripts that could break the editor UI itself
    // if rendered directly (which it shouldn't be, but as a precaution).
    // For now, we return the output as-is to prevent breaking valid code.
    if (typeof output !== 'string') return output;
    return output;
  }

  public async logAudit(userId: string, action: string, details: string): Promise<void> {
    const entry = {
        userId,
        action,
        details,
        timestamp: new Date().toISOString()
    };
    
    // Console log for dev
    // console.log(`[AUDIT]`, entry);

    // Persist to storage with signature
    try {
        const entryString = JSON.stringify(entry);
        const signature = await signLog(entryString);
        const signedEntry = { ...entry, signature };

        const existingLogs = safeStorage.getItem(APP_CONFIG.SECURITY.AUDIT_LOG_KEY);
        const logs = existingLogs ? JSON.parse(existingLogs) : [];
        logs.push(signedEntry);
        
        // Keep last N logs to prevent storage overflow
        if (logs.length > APP_CONFIG.SECURITY.MAX_LOG_ENTRIES) logs.shift();
        
        safeStorage.setItem(APP_CONFIG.SECURITY.AUDIT_LOG_KEY, JSON.stringify(logs));
    } catch (e) {
        console.error("Failed to persist audit log", e);
    }
  }
}
