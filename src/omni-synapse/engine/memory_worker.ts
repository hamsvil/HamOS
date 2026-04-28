 
 
import { OmniEvent, OmniEventType, OmniWorkerMessage } from '../core/types';
import { memoryGraph } from '../memory/graph_rag';
import { omniEventBus } from '../core/event_bus';

/**
 * Memory Worker: Handles Graph-RAG operations and State Management.
 * Separating this from the AI Worker prevents memory operations from blocking inference.
 */
export class MemoryWorker {
    private worker: Worker | null = null;
    private queryResolvers: Map<string, (value: any[]) => void> = new Map();

    constructor() {
        // Initialize Web Worker
        try {
            this.worker = new Worker(new URL('./memory.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
        } catch (e) {
            console.error('[MemoryWorker] Failed to spawn Web Worker.', e);
        }

        // Listen for events that modify memory
        omniEventBus.subscribe(OmniEventType.MEMORY_APPEND, this.handleMemoryAppend.bind(this));
        omniEventBus.subscribe(OmniEventType.MEMORY_PRUNE, this.handleMemoryPrune.bind(this));
    }

    private handleWorkerMessage(e: MessageEvent) {
        const { type, payload, queryId } = e.data;
        
        if (type === 'QUERY_RESULTS') {
            const resolver = this.queryResolvers.get(queryId);
            if (resolver) {
                resolver(payload);
                this.queryResolvers.delete(queryId);
            }
        }
    }

    /**
     * Simulates receiving a message from the main thread (if this were a real Web Worker).
     */
    public onMessage(message: OmniWorkerMessage): void {
        switch (message.type) {
            case 'EVENT':
                omniEventBus.dispatch(message.payload as OmniEvent);
                break;
        }
    }

    /**
     * Adds a new node to the Holographic Graph.
     */
    private async handleMemoryAppend(event: OmniEvent): Promise<void> {
        try {
            const { content, tags } = event.payload;
            const nodeId = await memoryGraph.addNode(content, tags);
            
            // Sync to worker
            if (this.worker) {
                this.worker.postMessage({ 
                    type: 'APPEND', 
                    payload: { id: nodeId, content, tags, timestamp: event.timestamp } 
                });
            }

            // console.log(`[MemoryWorker] Added node ${nodeId} to Graph-RAG. Root Hash: ${memoryGraph.getRootHash()}`);
            
            // Trigger a State Sync (DCS) back to the AI Worker
            await omniEventBus.dispatch({
                id: `sync_${Date.now()}`,
                type: OmniEventType.SYNC_STATE,
                timestamp: Date.now(),
                payload: { hash: memoryGraph.getRootHash() },
                source: 'MEMORY_WORKER'
            });
            
        } catch (error) {
            console.error('[MemoryWorker] Failed to append memory:', error);
        }
    }

    /**
     * Prunes old or irrelevant nodes from the graph to maintain O(1) efficiency.
     */
    private async handleMemoryPrune(event: OmniEvent): Promise<void> {
        try {
            // console.log('[MemoryWorker] Pruning memory graph...');
            const prunedCount = await memoryGraph.pruneNodes(1000);
            
            if (prunedCount > 0) {
                // console.log(`[MemoryWorker] Pruned ${prunedCount} nodes.`);
                
                // Sync the new root hash
                await omniEventBus.dispatch({
                    id: `sync_prune_${Date.now()}`,
                    type: OmniEventType.SYNC_STATE,
                    timestamp: Date.now(),
                    payload: { hash: memoryGraph.getRootHash() },
                    source: 'MEMORY_WORKER'
                });
            }
        } catch (error) {
            console.error('[MemoryWorker] Failed to prune memory:', error);
        }
    }

    /**
     * Queries the Graph-RAG for context.
     * This would typically be called by the AI Worker via message passing.
     */
    public async queryContext(tags: string[]): Promise<any[]> {
        if (this.worker) {
            const queryId = `query_${Date.now()}_${Math.random()}`;
            return new Promise((resolve) => {
                this.queryResolvers.set(queryId, resolve);
                this.worker!.postMessage({ type: 'QUERY', payload: { tags }, queryId });
            });
        }
        return memoryGraph.getContext(tags);
    }

    public destroy() {
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
        this.queryResolvers.clear();
    }
}

export const memoryWorker = new MemoryWorker();
