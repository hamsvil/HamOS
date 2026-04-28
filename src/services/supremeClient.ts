/* eslint-disable no-useless-assignment */
/**
 * Supreme Tools Client
 * Allows frontend sub-agents to communicate with the backend Supreme Tools (AST Surgeon, OmniGraph, etc.)
 */

export class SupremeClient {
    // Determine Base URL. For Node/backend execution, use localhost:3000. For browser, use relative.
    private static get API_BASE() {
        return typeof window === 'undefined' ? 'http://localhost:3000/api/supreme' : '/api/supreme';
    }

    public static async traceDependencies(filePath: string): Promise<string[]> {
        try {
            const res = await fetch(`${this.API_BASE}/trace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath })
            });
            const data = await res.json();
            return data.dependencies || [];
        } catch (e) {
            console.error('[SupremeClient] Trace failed:', e);
            return [];
        }
    }

    public static async getSemanticContext(filePath: string): Promise<any> {
        try {
            const res = await fetch(`${this.API_BASE}/context`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath })
            });
            const data = await res.json();
            return data.context || null;
        } catch (e) {
            console.error('[SupremeClient] Context failed:', e);
            return null;
        }
    }

    public static async renameSymbol(filePath: string, oldName: string, newName: string): Promise<boolean> {
        try {
            const res = await fetch(`${this.API_BASE}/rename`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ filePath, oldName, newName })
            });
            const data = await res.json();
            return data.success || false;
        } catch (e) {
            console.error('[SupremeClient] Rename failed:', e);
            return false;
        }
    }
}
