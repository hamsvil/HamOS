 
/* eslint-disable no-useless-escape */
export class Anonymizer {
    private static patterns: { pattern: RegExp; replacement: string }[] = [
        // Email addresses
        { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[EMAIL]' },
        // Phone numbers
        { pattern: /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g, replacement: '[PHONE]' },
        // Credit card numbers
        { pattern: /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g, replacement: '[CARD]' },
        // API Keys (generic patterns)
        { pattern: /(?:password|passwd|pwd|secret|token|key|api_key|apikey)\s*[:=]\s*['"]?[\w\-\.]{8,}['"]?/gi, replacement: '[CREDENTIAL]' },
        // Bearer tokens
        { pattern: /Bearer\s+[\w\-\.]{20,}/gi, replacement: 'Bearer [TOKEN]' },
        // Google API keys
        { pattern: /AIza[0-9A-Za-z\-_]{35}/g, replacement: '[GOOGLE_KEY]' },
        // Session/JWT tokens
        { pattern: /(?:session|sess|sid)\s*[:=]\s*['"]?[\w\-\.]{16,}['"]?/gi, replacement: '[SESSION]' },
        { pattern: /eyJ[a-zA-Z0-9\-_]+\.eyJ[a-zA-Z0-9\-_]+\.[a-zA-Z0-9\-_]+/g, replacement: '[JWT]' },
        // Long numeric IDs (potential user IDs)
        { pattern: /\b\d{8,}\b/g, replacement: '[ID]' },
    ];

    static scrub(text: string): string {
        if (!text) return text;
        let scrubbed = text;
        for (const { pattern, replacement } of this.patterns) {
            scrubbed = scrubbed.replace(pattern, replacement);
        }
        return scrubbed;
    }

    static scrubObject(obj: any): any {
        return JSON.parse(this.scrub(JSON.stringify(obj)));
    }
}
