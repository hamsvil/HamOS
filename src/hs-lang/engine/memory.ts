 
import { HamEngineState } from '../core/types';

// ============================================================================
// Ham Engine V5.5: THE AEGIS MEMORY (REACTIVE STATE & TIME-TRAVEL)
// ============================================================================

/**
 * Environment
 * Represents the lexical scope and reactive memory of the execution engine.
 */
export class Environment {
    private variables: Map<string, any> = new Map();
    private constants: Set<string> = new Set();
    private bindings: Map<string, Set<string>> = new Map(); // Source -> Targets (Reactive Streams)
    private parent: Environment | null;
    private cascadeLimit: number = 100; // Prevent Reactive Cascade
    private cascadeCount: number = 0;
    private bindingDepth: number = 0; // Synchronous depth counter for infinite loop prevention
    private lastTriggerTime: number = 0;
    private triggerDebounceMs: number = 1; // 1ms debounce to prevent GPU hang

    constructor(parent: Environment | null = null) {
        this.parent = parent;
    }

    /**
     * Defines a new variable in the current scope.
     */
    public define(name: string, value: any, isConst: boolean = false): void {
        if (this.variables.has(name)) {
            throw new Error(`[Runtime Error] Variable '${name}' has already been declared.`);
        }
        this.variables.set(name, value);
        if (isConst) {
            this.constants.add(name);
        }
        this.triggerBindings(name, value);
    }

    /**
     * Assigns a value to an existing variable, traversing up the scope chain if necessary.
     */
    public assign(name: string, value: any): void {
        if (this.variables.has(name)) {
            if (this.constants.has(name)) {
                throw new Error(`[Runtime Error] Assignment to constant variable '${name}'.`);
            }
            this.variables.set(name, value);
            this.triggerBindings(name, value);
            return;
        }
        if (this.parent) {
            this.parent.assign(name, value);
            return;
        }
        throw new Error(`[Runtime Error] Undefined variable '${name}'.`);
    }

    /**
     * Retrieves the value of a variable from the current or parent scopes.
     */
    public get(name: string): any {
        if (this.variables.has(name)) {
            return this.variables.get(name);
        }
        if (this.parent) {
            return this.parent.get(name);
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
        } catch (e) {
            // Source might not exist yet, which is acceptable in reactive streams.
            // It will sync once the source is defined.
        }
    }

    /**
     * Triggers updates to all bound target variables.
     * Implements Reactive Cascade Protection (Throttling/Debouncing).
     */
    private triggerBindings(source: string, value: any): void {
        if (this.bindingDepth > this.cascadeLimit) {
            console.warn(`[Reactive Cascade] Maximum binding depth exceeded for '${source}'. Possible infinite loop detected.`);
            return;
        }
        this.bindingDepth++;
        try {
            const now = Date.now();
            if (now - this.lastTriggerTime < this.triggerDebounceMs) {
                this.cascadeCount++;
                if (this.cascadeCount > this.cascadeLimit) {
                    console.warn(`[Reactive Cascade] Throttling active for '${source}'. Too many updates.`);
                    return;
                }
            } else {
                this.cascadeCount = 0;
            }
            this.lastTriggerTime = now;

            const targets = this.bindings.get(source);
            if (targets) {
                for (const target of targets) {
                    try {
                        this.assign(target, value);
                    } catch (e) {
                        // If target doesn't exist in the scope chain, define it in the current scope.
                        this.define(target, value);
                    }
                }
            }
        } finally {
            this.bindingDepth--;
        }
    }

    /**
     * Clones the environment for Time-Travel Snapshots.
     */
    public clone(): Environment {
        const cloned = new Environment(this.parent);
        cloned.variables = new Map(this.variables);
        cloned.constants = new Set(this.constants);
        cloned.bindings = new Map(this.bindings);
        return cloned;
    }

    /**
     * Clears all bindings and variables for cleanup.
     * Prevents Dangling Watchers (Memory Leaks).
     */
    public clearBindings(): void {
        this.bindings.clear();
        this.variables.clear();
        this.constants.clear();
    }

    /**
     * Final Cleanup (Dangling Watchers Protection)
     */
    public dispose(): void {
        this.clearBindings();
        if (this.parent) {
            // We don't necessarily dispose parent, but we clear reference
            this.parent = null;
        }
    }
}

/**
 * MemoryManager
 * Manages the global state, Gas limits, and Time-Travel Snapshots.
 */
export class MemoryManager {
    private state: HamEngineState;
    private globalEnv: Environment;

    constructor(gasLimit: number = 100000) {
        this.globalEnv = new Environment();
        this.state = {
            memory: {},
            gasLimit,
            gasUsed: 0,
            snapshots: [],
            status: 'idle',
            errorLog: [],
            lastSnapshotMemory: {},
            syncGate: true, // Default to ready
            locks: new Set()
        };
    }

    public getGlobalEnv(): Environment {
        return this.globalEnv;
    }

    public getState(): HamEngineState {
        return this.state;
    }

    /**
     * Temporal Sync-Gate
     * Ensures AI waits for hardware "Ready" signal.
     */
    public async waitForSync(): Promise<void> {
        while (!this.state.syncGate) {
            await new Promise(resolve => setTimeout(resolve, 10));
        }
    }

    public setSyncGate(ready: boolean): void {
        this.state.syncGate = ready;
    }

    /**
     * Mutex / Lock Manager
     * Prevents God-Primitive Race Conditions.
     */
    public async acquireLock(resourceId: string): Promise<void> {
        while (this.state.locks.has(resourceId)) {
            await new Promise(resolve => setTimeout(resolve, 5));
        }
        this.state.locks.add(resourceId);
    }

    public releaseLock(resourceId: string): void {
        this.state.locks.delete(resourceId);
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
            // In a full implementation, we would deep clone the Environment here.
            // For V5.5 performance, we store metadata and rely on immutable data structures where possible.
        });
    }

    /**
     * Rewinds the state to the last safe snapshot.
     */
    public rewind(): void {
        if (this.state.snapshots.length > 0) {
            const lastSnapshot = this.state.snapshots.pop();
            if (lastSnapshot) {
                this.state.gasUsed = lastSnapshot.gasUsed;
                this.state.status = 'idle';
                // console.log(`[Time-Travel] Rewound to snapshot at ${new Date(lastSnapshot.timestamp).toISOString()}`);
            }
        }
    }

    public logError(error: string): void {
        this.state.errorLog.push(error);
        if (this.state.errorLog.length > 100) {
            this.state.errorLog.shift();
        }
    }

    /**
     * Cleans up the memory manager and global environment.
     */
    public destroy(): void {
        this.globalEnv.dispose();
        this.state.memory = {};
        this.state.snapshots = [];
        this.state.errorLog = [];
        this.state.locks.clear();
    }
}
