 
import { MultiProviderRouter } from './MultiProviderRouter';

interface CausalNode {
    id: string;
    type: 'error' | 'state' | 'action' | 'code' | 'dependency';
    description: string;
    filePath?: string;
    lineNumber?: number;
    confidence: number;
}

interface CausalEdge {
    from: string;
    to: string;
    relationship: 'caused_by' | 'triggers' | 'depends_on' | 'corrupts';
    confidence: number;
}

interface CausalGraph {
    nodes: CausalNode[];
    edges: CausalEdge[];
    rootCauses: CausalNode[];
    rippleEffects: string[];
}

export class CausalArchitect {
    static async buildGraph(error: string, stackTrace: string, codeContext: string): Promise<CausalGraph> {
        const prompt = `
You are a causal reasoning expert analyzing a software error.
Build a causal chain in valid JSON format.

ERROR: ${error}
STACK TRACE: ${stackTrace}
CODE CONTEXT: ${codeContext}

Return JSON with this exact structure:
{
  "nodes": [
    {"id": "n1", "type": "error|state|action|code", "description": "...", "filePath": "...", "lineNumber": 42, "confidence": 95}
  ],
  "edges": [
    {"from": "n1", "to": "n2", "relationship": "caused_by", "confidence": 90}
  ]
}

Rules:
- Root cause nodes have NO incoming "caused_by" edges and type === "code"
- Include at least 3 nodes in the causal chain
- Confidence 0-100 for each node and edge
- Be specific about file paths when visible in stack trace
`;

        const response = await MultiProviderRouter.route(prompt, 'reasoning');
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error('[CAUSAL] Failed to parse causal graph from LLM response');
        
        const { nodes, edges } = JSON.parse(jsonMatch[0]);
        const rootCauses = this.findRootCauses(nodes, edges);
        const rippleEffects = this.findRippleEffects(rootCauses, edges);

        return { nodes, edges, rootCauses, rippleEffects };
    }

    private static findRootCauses(nodes: CausalNode[], edges: CausalEdge[]): CausalNode[] {
        const hasIncomingCausedBy = new Set(
            edges.filter(e => e.relationship === 'caused_by').map(e => e.to)
        );
        return nodes.filter(n => !hasIncomingCausedBy.has(n.id) && n.type === 'code');
    }

    private static findRippleEffects(rootCauses: CausalNode[], edges: CausalEdge[]): string[] {
        const affected = new Set<string>();
        const queue = rootCauses.map(n => n.id);
        while (queue.length > 0) {
            const current = queue.shift()!;
            edges.filter(e => e.from === current).forEach(e => {
                if (!affected.has(e.to)) {
                    affected.add(e.to);
                    queue.push(e.to);
                }
            });
        }
        return Array.from(affected);
    }
}
