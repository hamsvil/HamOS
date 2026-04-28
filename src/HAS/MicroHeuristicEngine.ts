 
export class MicroHeuristicEngine {
    static analyze(err: string): string | null {
        const l = err.toLowerCase();
        
        if (/(failed to fetch|network error|offline|err_connection)/i.test(l)) {
            return '[OFFLINE HEURISTIC] Network Failure detected. Check connection or API endpoint.';
        }
        
        if (/(cors|access-control-allow-origin)/i.test(l)) {
            return '[OFFLINE HEURISTIC] CORS Policy Block. Backend origin mismatch.';
        }
        
        if (/(timeout|timed out|socket hang up)/i.test(l)) {
            return '[OFFLINE HEURISTIC] Request Timeout. Server is overloaded or slow.';
        }

        if (/(401|403|unauthorized|forbidden)/i.test(l)) {
            return '[OFFLINE HEURISTIC] Auth Failure. Token expired or invalid.';
        }
        
        if (/(cannot read properties of undefined|is not a function)/i.test(l)) {
            return '[RUNTIME HEURISTIC] Null reference exception. Check object initialization and use optional chaining (?.).';
        }

        return null;
    }
}