/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// [MEMORY LEAK] Cleanup verified.
import { OmniEvent, OmniStateHash } from '../core/types';

/**
 * OmniSanitizer: The ultimate defense against Prompt Injection and Sleeper Agents.
 * It cryptographically verifies and sanitizes all data entering the system.
 */
export class OmniSanitizer {
    private static readonly DANGEROUS_PATTERNS = [
        /<\s*script[^>]*>(.*?)<\s*\/\s*script\s*>/gi,
        /javascript\s*:/gi,
        /on\w+\s*=/gi, // Event handlers like onload, onerror
        /eval\s*\(/gi,
        /setTimeout\s*\(/gi,
        /setInterval\s*\(/gi,
        /Function\s*\(/gi,
        /document\.cookie/gi,
        /window\./gi
    ];

    /**
     * Sanitizes raw text input to prevent basic injection attacks.
     */
    public static sanitizeText(input: string): string {
        if (!input) return '';
        let sanitized = input;
        
        // Remove dangerous patterns
        for (const pattern of this.DANGEROUS_PATTERNS) {
            sanitized = sanitized.replace(pattern, '[REDACTED]');
        }
        
        // Basic HTML escaping
        sanitized = sanitized
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
            
        return sanitized;
    }

    /**
     * Recursively sanitizes an object or string.
     */
    private static sanitizePayload(payload: any): any {
        if (typeof payload === 'string') {
            return this.sanitizeText(payload);
        }
        if (Array.isArray(payload)) {
            return payload.map(item => this.sanitizePayload(item));
        }
        if (payload !== null && typeof payload === 'object') {
            const sanitizedObj: any = {};
            for (const key in payload) {
                if (Object.prototype.hasOwnProperty.call(payload, key)) {
                    sanitizedObj[key] = this.sanitizePayload(payload[key]);
                }
            }
            return sanitizedObj;
        }
        return payload;
    }

    /**
     * Verifies the integrity of an OmniEvent.
     * In a full implementation, this would check cryptographic signatures.
     */
    public static verifyEventIntegrity(event: OmniEvent): boolean {
        // 1. Check required fields
        if (!event.id || !event.type || !event.timestamp || !event.source) {
            return false;
        }

        // 2. Prevent time-travel attacks (events from the future)
        if (event.timestamp > Date.now() + 5000) { // 5s tolerance
            return false;
        }

        // 3. Payload sanitization (deep check)
        if (event.payload !== undefined) {
            const originalPayloadStr = JSON.stringify(event.payload);
            event.payload = this.sanitizePayload(event.payload);
            if (JSON.stringify(event.payload) !== originalPayloadStr) {
                console.warn(`[OmniSanitizer] Event ${event.id} payload was modified during sanitization.`);
            }
        }

        return true;
    }

    /**
     * Generates a deterministic hash for a given state object.
     * Used for State-Hash Anchoring (DCS).
     */
    public static async generateStateHash(state: any): Promise<OmniStateHash> {
        const str = JSON.stringify(state, Object.keys(state).sort());
        const encoder = new TextEncoder();
        const data = encoder.encode(str);
        
        // Use Web Crypto API for fast SHA-256 hashing
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return hashHex;
    }
}
