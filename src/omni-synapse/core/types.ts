export type OmniStateHash = string; // Hex string representing state
export type OmniEventId = string;

export enum OmniEventType {
    // Memory Events
    MEMORY_APPEND = 'MEMORY_APPEND',
    MEMORY_PRUNE = 'MEMORY_PRUNE',
    
    // UI Events
    UI_RENDER = 'UI_RENDER',
    UI_INTERACTION = 'UI_INTERACTION',
    
    // AI Events
    AI_THINKING_START = 'AI_THINKING_START',
    AI_THINKING_END = 'AI_THINKING_END',
    AI_RESPONSE_DELTA = 'AI_RESPONSE_DELTA',
    
    // System Events
    SYSTEM_ERROR = 'SYSTEM_ERROR',
    SYSTEM_READY = 'SYSTEM_READY',
    SYNC_STATE = 'SYNC_STATE'
}

export interface OmniEvent<T = any> {
    id: OmniEventId;
    type: OmniEventType;
    timestamp: number;
    payload: T;
    source: 'UI' | 'AI_WORKER' | 'MEMORY_WORKER' | 'SYSTEM';
    signature?: string; // Cryptographic signature for security
}

export interface OmniStateDelta {
    path: string; // JSON path to the modified state
    value: any;
    operation: 'SET' | 'DELETE' | 'MERGE';
}

export interface OmniMemoryNode {
    id: string;
    content: string;
    embedding?: Float32Array; // Zero-Compute Embedding
    timestamp: number;
    tags: string[];
    connections: string[]; // IDs of related nodes (Graph-RAG)
}

export interface OmniMemoryGraph {
    nodes: Map<string, OmniMemoryNode>;
    rootHash: OmniStateHash;
}

export interface OmniWorkerMessage {
    type: 'INIT' | 'EVENT' | 'SYNC_STATE' | 'ERROR';
    payload: any;
}
