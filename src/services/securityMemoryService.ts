/* eslint-disable no-useless-assignment */
/**
 * Security Memory Service
 * Handles cross-session persistence for security patterns and target intelligence.
 */
export class SecurityMemoryService {
    private storageKey = 'ham_os_security_memory';

    async save(key: string, data: any): Promise<void> {
        const memory = this.getAll();
        memory[key] = {
            data,
            timestamp: Date.now()
        };
        localStorage.setItem(this.storageKey, JSON.stringify(memory));
    }

    async load(key: string): Promise<any | null> {
        const memory = this.getAll();
        return memory[key]?.data || null;
    }

    private getAll(): Record<string, { data: any, timestamp: number }> {
        const raw = localStorage.getItem(this.storageKey);
        if (!raw) return {};
        try {
            return JSON.parse(raw);
        } catch {
            return {};
        }
    }

    async clear(): Promise<void> {
        localStorage.removeItem(this.storageKey);
    }
}

export const securityMemory = new SecurityMemoryService();
