/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */

export class SyntaxValidator {
    static validate(code: string, language: 'ts' | 'tsx' | 'js' | 'jsx' | 'java'): string | null {
        if (!code || code.trim().length === 0) return "Empty code";

        // Remove comments and strings to avoid false positives
        let cleanCode = code;
        
        // Remove single line comments
        cleanCode = cleanCode.replace(/\/\/.*$/gm, '');
        // Remove multi-line comments
        cleanCode = cleanCode.replace(/\/\*[\s\S]*?\*\//g, '');
        // Remove strings (single, double, backtick)
        cleanCode = cleanCode.replace(/'([^'\\]|\\.)*'/g, '');
        cleanCode = cleanCode.replace(/"([^"\\]|\\.)*"/g, '');
        cleanCode = cleanCode.replace(/`([^`\\]|\\.)*`/g, '');

        // 1. Brace Matching
        const openBraces = (cleanCode.match(/\{/g) || []).length;
        const closeBraces = (cleanCode.match(/\}/g) || []).length;
        if (openBraces !== closeBraces) {
            return `Brace mismatch: ${openBraces} '{' vs ${closeBraces} '}'`;
        }

        // 2. Parenthesis Matching
        const openParens = (cleanCode.match(/\(/g) || []).length;
        const closeParens = (cleanCode.match(/\)/g) || []).length;
        if (openParens !== closeParens) {
            return `Parenthesis mismatch: ${openParens} '(' vs ${closeParens} ')'`;
        }

        // 3. Basic Java Checks
        if (language === 'java') {
            if (!code.match(/^\s*package\s+[\w.]+;/m)) {
                return "Missing or invalid package declaration";
            }
            if (!code.match(/\b(class|interface|enum)\s+\w+/)) {
                return "Missing class/interface/enum declaration";
            }
        }

        return null; // Valid
    }
}
