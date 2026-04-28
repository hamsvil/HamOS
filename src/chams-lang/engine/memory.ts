 
 
import { ChamsState } from '../core/types';

// ============================================================================
// cHams V5.5: THE AEGIS MEMORY (REACTIVE STATE & TIME-TRAVEL)
// ============================================================================

/**
 * Environment
 * Represents the lexical scope and reactive memory of the execution engine.
 */
export class Environment {
    private variables: Map<string, unknown> = new Map();
    private bindings: Map<string, Set<string>> = new Map(); // Source -> Targets (Reactive Streams)
    private parent: Environment | null;
    private static readonly MAX_RECURSION_DEPTH = 500;
    private activeUpdates: Set<string> = new Set(); // Instance-scoped lock for circular binding detection

    constructor(parent: Environment | null = null) {
        this.parent = parent;
    }

    /**
     * Defines a new variable in the current scope.
     */
    public define(name: string, value: any): void {
        this.variables.set(name, value);
        this.triggerBindings(name, value);
    }

    /**
     * Assigns a value to an existing variable, traversing up the scope chain if necessary.
     */
    public assign(name: string, value: any, depth: number = 0): void {
        if (depth > Environment.MAX_RECURSION_DEPTH) {
            throw new Error(`[Runtime Error] Maximum scope depth exceeded during assignment to '${name}'.`);
        }

        if (this.variables.has(name)) {
            this.variables.set(name, value);
            this.triggerBindings(name, value);
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value, depth + 1);
            return;
        }
        throw new Error(`[Runtime Error] Undefined variable '${name}'.`);
    }

    /**
     * Retrieves the value of a variable from the current or parent scopes.
     */
    public get(name: string, depth: number = 0): any {
        if (depth > Environment.MAX_RECURSION_DEPTH) {
            throw new Error(`[Runtime Error] Maximum scope depth exceeded during lookup of '${name}'.`);
        }

        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        if (this.parent) {
            return this.parent.get(name, depth + 1);
        }
        throw new Error(`[Runtime Error] Undefined variable '${name}'.`);
    }

    /**
     * Binds a source variable to a target variable.
     * When the source changes, the target is automatically updated.
     * This is the core of the Neural-Reactive architecture (No-Loop paradigm).
     */
    public bind(source: string, target: string): void {
        if (!this.bindings.has(source)) {
            this.bindings.set(source, new Set());
        }
        this.bindings.get(source)!.add(target);
        
        // Initial synchronization
        try {
            const val = this.get(source);
            this.assign(target, val);
        } catch (_e) {
            // Source might not exist yet, which is acceptable in reactive streams.
            // It will sync once the source is defined.
        }
    }

    /**
     * Triggers updates to all bound target variables.
     * Implements Circular Dependency Protection.
     */
    private triggerBindings(source: string, value: any): void {
        if (this.activeUpdates.has(source)) {
            // Circular dependency detected. 
            // We halt the propagation for this branch to prevent Stack Overflow.
            return;
        }

        const targets = this.bindings.get(source);
        if (targets) {
            this.activeUpdates.add(source);
            try {
                for (const target of targets) {
                    try {
                        this.assign(target, value);
                    } catch (_e) {
                        // If target doesn't exist in the scope chain, define it in the current scope.
                        this.define(target, value);
                    }
                }
            } finally {
                this.activeUpdates.delete(source);
            }
        }
    }

    /**
     * Clones the environment for Time-Travel Snapshots.
     * V5.5.1: Implements Holographic Cloning to preserve functions.
     */
    public clone(): Environment {
        const cloned = new Environment(this.parent);
        cloned.variables = new Map();
        for (const [key, val] of this.variables) {
            cloned.variables.set(key, this.holographicCopy(val));
        }
        cloned.bindings = new Map();
        for (const [key, val] of this.bindings) {
            cloned.bindings.set(key, new Set(val));
        }
        return cloned;
    }

    /**
     * Holographic Copy: Deep copies objects/arrays but keeps functions by reference.
     */
    private holographicCopy(val: any): any {
        if (val === null || typeof val !== 'object') return val;
        if (typeof val === 'function') return val;
        if (Array.isArray(val)) return val.map(item => this.holographicCopy(item));
        
        const copy: Record<string, unknown> = {};
        for (const key in val as Record<string, unknown>) {
            if (Object.prototype.hasOwnProperty.call(val, key)) {
                copy[key] = this.holographicCopy((val as Record<string, unknown>)[key]);
            }
        }
        return copy;
    }

    /**
     * Returns a deep copy of the variables for state persistence.
     */
    public getSnapshot(): Record<string, unknown> {
        const snapshot: Record<string, unknown> = {};
        for (const [key, val] of this.variables) {
            snapshot[key] = this.holographicCopy(val);
        }
        return snapshot;
    }

    /**
     * Restores variables from a snapshot.
     */
    public restore(snapshot: Record<string, unknown>): void {
        this.variables.clear();
        for (const key in snapshot) {
            this.variables.set(key, this.holographicCopy(snapshot[key]));
        }
    }
}

/**
 * MemoryManager
 * Manages the global state, Gas limits, and Time-Travel Snapshots.
 */
export class MemoryManager {
    private state: ChamsState;
    private globalEnv: Environment;

    constructor(gasLimit: number = 100000) {
        this.globalEnv = new Environment();
        this.state = {
            memory: {},
            gasLimit,
            gasUsed: 0,
            snapshots: [],
            status: 'idle',
            errorLog: []
        };
    }

    public getGlobalEnv(): Environment {
        return this.globalEnv;
    }

    public getState(): ChamsState {
        return this.state;
    }

    /**
     * Temporal Desync Protection: Ensures the AI waits for hardware "Ready" signal.
     */
    public async waitForSync(): Promise<void> {
        // In a real hardware environment, this would wait for a specific interrupt.
        // In the web sandbox, we yield to the event loop.
        return new Promise(resolve => setTimeout(resolve, 0));
    }

    /**
     * Consumes Gas for each operation.
     * Prevents Infinite Loops and Halting Problem freezes.
     */
    public consumeGas(amount: number = 1): void {
        this.state.gasUsed += amount;
        if (this.state.gasUsed > this.state.gasLimit) {
            this.state.status = 'halted';
            throw new Error(`[Out of Gas] Execution exceeded the gas limit of ${this.state.gasLimit} operations. Halting to prevent system freeze.`);
        }
    }

    /**
     * Takes a snapshot of the current state for Time-Travel Recovery.
     */
    public takeSnapshot(): void {
        // Keep maximum 50 snapshots to prevent Memory Bloat
        if (this.state.snapshots.length >= 50) {
            this.state.snapshots.shift();
        }
        
        this.state.snapshots.push({
            gasUsed: this.state.gasUsed,
            timestamp: Date.now(),
            // V5.5.1 FIX: Use Holographic Cloning instead of JSON to preserve functions.
            dataSnapshot: this.globalEnv.getSnapshot()
        });
    }

    /**
     * Rewinds the state to the last safe snapshot.
     * V5.5.1 FIX: Actually restores the variable state in globalEnv.
     */
    public rewind(): void {
        if (this.state.snapshots.length > 0) {
            const lastSnapshot = this.state.snapshots.pop();
            if (lastSnapshot) {
                this.state.gasUsed = lastSnapshot.gasUsed;
                this.state.status = 'idle';
                this.globalEnv.restore(lastSnapshot.dataSnapshot);
                // console.log(`[Time-Travel] Rewound and restored state to snapshot at ${new Date(lastSnapshot.timestamp).toISOString()}`);
            }
        }
    }

    public logError(error: string): void {
        this.state.errorLog.push(error);
        if (this.state.errorLog.length > 100) {
            this.state.errorLog.shift();
        }
    }
}
