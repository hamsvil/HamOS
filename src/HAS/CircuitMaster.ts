 
import { MerkleScribe } from './MerkleScribe';

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface Circuit {
    failureCount: number;
    lastFailureTime: number;
    state: CircuitState;
    errorSignature: string;
}

export class CircuitMaster {
    private static circuits: Map<string, Circuit> = new Map();
    private static readonly MAX_FAILURES = 3;
    private static readonly RESET_TIMEOUT_MS = 5 * 60 * 1000;
    private static shadowTesting = false;

    static isOpen(errorSignature: string): boolean {
        const circuit = this.circuits.get(errorSignature);
        if (!circuit || circuit.state === 'CLOSED') return false;
        if (Date.now() - circuit.lastFailureTime > this.RESET_TIMEOUT_MS) {
            circuit.state = 'HALF_OPEN';
            return false;
        }
        return circuit.state === 'OPEN';
    }

    static recordFailure(errorSignature: string): void {
        this.cleanupOldCircuits();
        const circuit = this.circuits.get(errorSignature) || {
            failureCount: 0, lastFailureTime: 0, state: 'CLOSED' as CircuitState, errorSignature,
        };
        circuit.failureCount++;
        circuit.lastFailureTime = Date.now();
        if (circuit.failureCount >= this.MAX_FAILURES) {
            circuit.state = 'OPEN';
            this.escalate(errorSignature, circuit.failureCount);
        }
        this.circuits.set(errorSignature, circuit);
        MerkleScribe.logAndVerify('CIRCUIT_FAILURE', { errorSignature, count: circuit.failureCount });
    }

    private static cleanupOldCircuits(): void {
        const now = Date.now();
        // Prevent map from growing unbounded by removing circuits older than 24 hours
        if (this.circuits.size > 100) {
            for (const [key, circuit] of this.circuits.entries()) {
                if (now - circuit.lastFailureTime > 24 * 60 * 60 * 1000) {
                    this.circuits.delete(key);
                }
            }
        }
    }

    static recordSuccess(errorSignature: string): void {
        this.circuits.delete(errorSignature);
    }

    private static escalate(errorSignature: string, attempts: number): void {
        const payload = {
            level: 'URGENT' as const,
            title: `SAERE Cannot Fix: ${errorSignature.substring(0, 60)}`,
            body: `After ${attempts} attempts, human intervention required.`,
        };
        MerkleScribe.logAndVerify('CIRCUIT_OPEN', { errorSignature, attempts });
        
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('SAERE_ESCALATE', { detail: payload }));
        } else if (typeof self !== 'undefined' && 'postMessage' in self) {
            (self as any).postMessage({ type: 'SAERE_ESCALATE', payload });
        }
    }

    static isShadowTesting(): boolean {
        return this.shadowTesting;
    }

    static setShadowTesting(val: boolean): void {
        this.shadowTesting = val;
    }

    static isTripped(errorSignature?: string): boolean {
        if (errorSignature) return this.isOpen(errorSignature);
        return Array.from(this.circuits.values()).some(c => c.state === 'OPEN');
    }

    static reset(errorSignature?: string): void {
        if (errorSignature) {
            this.circuits.delete(errorSignature);
        } else {
            this.circuits.clear();
        }
    }
}
