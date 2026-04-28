 
/* eslint-disable no-case-declarations */
// Memory Web Worker - Separate Thread for Graph-RAG and Context Retrieval
import { OmniMemoryNode } from '../core/types';

let nodes: OmniMemoryNode[] = [];

self.onmessage = (e: MessageEvent) => {
    const { type, payload } = e.data;

    switch (type) {
        case 'SYNC':
            nodes = payload;
            self.postMessage({ type: 'SYNCED' });
            break;

        case 'QUERY':
            const { tags } = payload;
            const results = nodes.filter(node => 
                tags.some((tag: string) => node.tags.includes(tag))
            ).sort((a, b) => b.timestamp - a.timestamp)
             .slice(0, 10);
            
            self.postMessage({ type: 'QUERY_RESULTS', payload: results });
            break;

        case 'APPEND':
            nodes.push(payload);
            // Limit memory size in worker
            if (nodes.length > 1000) nodes.shift();
            break;
    }
};
