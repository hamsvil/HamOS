 
 
import { MerkleScribe } from './MerkleScribe';

export interface SAEREAction {
    type: 'EDIT_FILE' | 'DELETE_FILE' | 'CREATE_FILE' | 'SHELL_EXEC' | 'NETWORK_REQUEST' | 'SYNTHESIZE_TOOL';
    target?: string;
    content?: string;
    confidence: number;
}

export interface ValidationResult {
    allowed: boolean;
    reason?: string;
    requiresHumanApproval?: boolean;
}

const PROTECTED_FILE_PATTERNS = [
    /\.env(\.|$)/, /secrets?\.(ts|js|json|yaml)/, /credentials?\./,
    /\bauth\.(ts|js|tsx)$/, /\blogin\.(ts|js|tsx)$/, /\bpassword/i,
    /production\.config/, /\.pem$/, /\.key$/, /private/i,
];

const FORBIDDEN_SHELL_PATTERNS = [
    /rm\s+-rf/, /DROP\s+(TABLE|DATABASE)/i, /DELETE\s+FROM/i,
    /TRUNCATE/i, /chmod\s+777/, /sudo\s/, /curl\s.*\|\s*(bash|sh)/,
    /wget\s.*\|\s*(bash|sh)/, /mkfs/, /dd\s+if=/,
];

export class ConstitutionalCore {
    private static readonly MIN_CONFIDENCE = 40;

    static validate(action: SAEREAction): ValidationResult {
        // RED LINE 1: Protected files
        if ((action.type === 'EDIT_FILE' || action.type === 'DELETE_FILE') && action.target) {
            for (const pattern of PROTECTED_FILE_PATTERNS) {
                if (pattern.test(action.target)) {
                    MerkleScribe.logAndVerify('CONSTITUTIONAL_BLOCK', { reason: 'PROTECTED_FILE', action });
                    return { allowed: false, reason: `RED LINE VIOLATION: File "${action.target}" is constitutionally protected. Cannot modify without 3-layer human approval.` };
                }
            }
        }

        // RED LINE 2: Dangerous shell commands
        if (action.type === 'SHELL_EXEC' && action.content) {
            for (const pattern of FORBIDDEN_SHELL_PATTERNS) {
                if (pattern.test(action.content)) {
                    MerkleScribe.logAndVerify('CONSTITUTIONAL_BLOCK', { reason: 'FORBIDDEN_COMMAND', action });
                    return { allowed: false, reason: `RED LINE VIOLATION: Command contains forbidden pattern. Blocked: "${action.content.substring(0, 50)}"` };
                }
            }
        }

        // RED LINE 3: Confidence threshold
        if (action.confidence < this.MIN_CONFIDENCE) {
            return { allowed: false, reason: `RED LINE VIOLATION: Fix confidence ${action.confidence}% is below minimum threshold of ${this.MIN_CONFIDENCE}%. Fix rejected.` };
        }

        // YELLOW LINE: Requires human approval but not absolute block
        if (action.type === 'DELETE_FILE') {
            return { allowed: true, requiresHumanApproval: true, reason: 'File deletion requires explicit human approval.' };
        }

        return { allowed: true };
    }
}

// MANDATORY WRAPPER - semua SAERE actions HARUS melalui ini
export async function executeAction(action: SAEREAction, humanApproved = false): Promise<boolean> {
    const validation = ConstitutionalCore.validate(action);

    if (!validation.allowed) {
        console.warn(`[CONSTITUTIONAL_CORE] BLOCKED: ${validation.reason}`);
        return false;
    }

    if (validation.requiresHumanApproval && !humanApproved) {
        console.warn(`[CONSTITUTIONAL_CORE] REQUIRES APPROVAL: ${validation.reason}`);
        return false;
    }

    return true;
}
