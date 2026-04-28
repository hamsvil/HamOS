/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
export function healAndParseJSON(raw: string): any {
    // Strip markdown wrappers
    let cleaned = raw.replace(/^```(?:json)?\n?/im, '').replace(/\n?```$/im, '').trim();
    
    // Find the first { or [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let isObject = false;
    if (firstBrace !== -1 && firstBracket !== -1) {
        isObject = firstBrace < firstBracket;
    } else if (firstBrace !== -1) {
        isObject = true;
    } else if (firstBracket !== -1) {
        isObject = false;
    } else {
        throw new Error("No JSON object or array found in response.");
    }

    const startIdx = isObject ? firstBrace : firstBracket;
    const endIdx = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    // Advanced JSON healing
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Step 1: Remove trailing commas
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        // Step 2: Fix unquoted keys
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        
        // Step 3: Replace single quotes with double quotes (carefully, avoiding those inside words)
        cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');
        
        // Step 4: Remove comments (// and /* */) safely, avoiding those inside strings
        cleaned = cleaned.replace(/(".*?"|'.*?')|(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match, stringLiteral, comment) => {
            if (comment) return ''; // Remove comment
            return stringLiteral; // Keep string
        });
        
        // Step 5: Fix missing quotes around string values
        cleaned = cleaned.replace(/:\s*([^"'{[0-9truefalse\s,\]}][^,\]}]*)/g, (match, val) => {
            const trimmed = val.trim();
            if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null' || !isNaN(Number(trimmed))) {
                return match;
            }
            return `: "${trimmed}"`;
        });

        try {
            return JSON.parse(cleaned);
        } catch (e2: any) {
            const msg = e2 instanceof Error ? e2.message : String(e2);
            throw new Error(`JSON Auto-Heal failed: ${msg}\nRaw snippet: ${cleaned.substring(0, 100)}...`, { cause: e2 });
        }
    }
}
