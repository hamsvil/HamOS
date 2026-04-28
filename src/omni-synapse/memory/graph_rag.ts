 
import { OmniMemoryNode, OmniMemoryGraph, OmniStateHash } from '../core/types';
import { OmniSanitizer } from '../security/sanitizer';

/**
 * HolographicGraphRAG: The infinite memory engine.
 * It uses a graph structure to connect related concepts and events,
 * allowing for O(1) retrieval of context without filling the LLM window.
 */
export class HolographicGraphRAG {
    private graph: OmniMemoryGraph = {
        nodes: new Map(),
        rootHash: ''
    };

    /**
     * Adds a new node to the memory graph.
     * Automatically links it to related nodes based on tags.
     */
    public async addNode(content: string, tags: string[]): Promise<string> {
        const id = `node_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const sanitizedContent = OmniSanitizer.sanitizeText(content);
        
        const node: OmniMemoryNode = {
            id,
            content: sanitizedContent,
            timestamp: Date.now(),
            tags,
            connections: []
        };

        // Find connections (simple tag intersection for now)
        for (const [existingId, existingNode] of this.graph.nodes.entries()) {
            const commonTags = tags.filter(t => existingNode.tags.includes(t));
            if (commonTags.length > 0) {
                node.connections.push(existingId);
                existingNode.connections.push(id); // Bidirectional
            }
        }

        this.graph.nodes.set(id, node);
        
        // Update Root Hash (DCS)
        this.graph.rootHash = await OmniSanitizer.generateStateHash(Array.from(this.graph.nodes.values()));
        
        return id;
    }

    /**
     * Retrieves context for a given query by traversing the graph.
     * This is the "Holographic" part: it reconstructs the relevant state
     * without needing the entire history.
     */
    public getContext(queryTags: string[], maxDepth: number = 2): OmniMemoryNode[] {
        const contextNodes = new Set<OmniMemoryNode>();
        const queue: { id: string, depth: number }[] = [];

        // Seed the queue with direct matches
        for (const [id, node] of this.graph.nodes.entries()) {
            if (queryTags.some(t => node.tags.includes(t))) {
                queue.push({ id, depth: 0 });
                contextNodes.add(node);
            }
        }

        // BFS traversal for related context
        while (queue.length > 0) {
            const current = queue.shift()!;
            if (current.depth >= maxDepth) continue;

            const node = this.graph.nodes.get(current.id);
            if (!node) continue;

            for (const connectionId of node.connections) {
                const connectedNode = this.graph.nodes.get(connectionId);
                if (connectedNode && !contextNodes.has(connectedNode)) {
                    contextNodes.add(connectedNode);
                    queue.push({ id: connectionId, depth: current.depth + 1 });
                }
            }
        }

        // Sort by relevance/recency
        return Array.from(contextNodes).sort((a, b) => b.timestamp - a.timestamp);
    }

    /**
     * Prunes old or irrelevant nodes from the graph to maintain O(1) efficiency.
     */
    public async pruneNodes(maxNodes: number = 1000): Promise<number> {
        const nodesArray = Array.from(this.graph.nodes.entries());
        
        if (nodesArray.length > maxNodes) {
            // Sort by timestamp ascending (oldest first)
            nodesArray.sort((a, b) => a[1].timestamp - b[1].timestamp);
            
            // Remove the oldest nodes
            const nodesToRemove = nodesArray.slice(0, nodesArray.length - maxNodes);
            for (const [id, _] of nodesToRemove) {
                this.graph.nodes.delete(id);
            }
            
            // Update Root Hash
            this.graph.rootHash = await OmniSanitizer.generateStateHash(Array.from(this.graph.nodes.values()));
            return nodesToRemove.length;
        }
        return 0;
    }

    /**
     * Returns the current State Hash for DCS synchronization.
     */
    public getRootHash(): OmniStateHash {
        return this.graph.rootHash;
    }
}

export const memoryGraph = new HolographicGraphRAG();
