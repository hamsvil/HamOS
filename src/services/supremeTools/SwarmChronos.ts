/* eslint-disable no-useless-assignment */
import { EventEmitter } from 'events';
import { vfs } from '../vfsService';
import { Mutex } from 'async-mutex';

/**
 * Swarm Telepathy Buffer
 * Enables zero-latency shared memory and atomic locks between the 8 sub-agents.
 */
export class SwarmTelepathy {
    private static bus = new EventEmitter();
    
    private static sab: SharedArrayBuffer | ArrayBuffer;
    private static int32View: Int32Array | null = null;
    private static fallbackLocks: Map<number, boolean> = new Map();

    static {
        try {
            SwarmTelepathy.sab = new SharedArrayBuffer(1024);
            SwarmTelepathy.int32View = new Int32Array(SwarmTelepathy.sab);
        } catch (e) {
            console.warn('[SwarmTelepathy] SharedArrayBuffer not available. Falling back to in-memory map lock. True parallel atomic locks will be simulated.');
            SwarmTelepathy.sab = new ArrayBuffer(1024); // Dummy
        }

        // Integrate ResourceSentinel events into the Swarm bus
        if (typeof window !== 'undefined') {
            window.addEventListener('supreme-throttle', (e: any) => {
                this.broadcast('RESOURCE_SENTINEL', 'THROTTLE_CHANGE', e.detail);
            });
        }
    }

    public static broadcast(agentId: string, event: string, payload: any) {
        this.bus.emit(event, { agentId, payload });
    }

    public static listen(event: string, callback: (data: any) => void) {
        this.bus.on(event, callback);
    }

    /**
     * Zero-latency atomic lock for parallel agent execution.
     * Prevents two agents from modifying the same file simultaneously.
     */
    public static acquireLock(lockIndex: number): boolean {
        if (this.int32View) {
            return Atomics.compareExchange(this.int32View, lockIndex, 0, 1) === 0;
        } else {
            if (this.fallbackLocks.get(lockIndex)) return false;
            this.fallbackLocks.set(lockIndex, true);
            return true;
        }
    }

    public static releaseLock(lockIndex: number) {
        if (this.int32View) {
            Atomics.store(this.int32View, lockIndex, 0);
            Atomics.notify(this.int32View, lockIndex, 1);
        } else {
            this.fallbackLocks.set(lockIndex, false);
        }
    }
}

/**
 * Chronos Atomic Rollback
 * Virtual File System snapshot manager for instant recovery.
 */
export class Chronos {
    private static snapshots = new Map<string, Map<string, string>>();
    private static rollbackMutex = new Mutex();

    public static async takeSnapshot(snapshotId: string, filePaths: string[]) {
        const state = new Map<string, string>();
        for (const path of filePaths) {
            try {
                const content = await vfs.readFile(path);
                state.set(path, content);
            } catch (e) {
                console.warn(`[Chronos] Could not read ${path} for snapshot.`);
            }
        }
        this.snapshots.set(snapshotId, state);
        return true;
    }

    public static async revert(snapshotId: string): Promise<boolean> {
        return this.rollbackMutex.runExclusive(async () => {
            const state = this.snapshots.get(snapshotId);
            if (!state) {
                console.error(`[Chronos] CRITICAL: Snapshot [${snapshotId}] not found!`);
                return false;
            }
            
            console.warn(`[Chronos] Executing atomic rollback to snapshot [${snapshotId}]...`);
            const promises = [];
            
            const entries = Array.from(state.entries());
            for (const [path, content] of entries) {
                promises.push(vfs.writeFile(path, content, 'chronos-rollback'));
            }
            await Promise.all(promises);
            return true;
        });
    }
}
