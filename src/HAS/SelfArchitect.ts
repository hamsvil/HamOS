 
import { MultiProviderRouter } from './MultiProviderRouter';

export class SelfArchitect {
    private static failureLog: Map<string, number> = new Map();
    private static readonly PROPOSAL_THRESHOLD = 5;

    static recordFailure(errorCategory: string): void {
        const count = (this.failureLog.get(errorCategory) || 0) + 1;
        this.failureLog.set(errorCategory, count);
        if (count >= this.PROPOSAL_THRESHOLD) {
            this.generateProposal(errorCategory, count);
            this.failureLog.set(errorCategory, 0);
        }
    }

    private static async generateProposal(category: string, failureCount: number): Promise<void> {
        const proposal = await MultiProviderRouter.route(`
SAERE has failed ${failureCount} times handling errors in category: "${category}".
Generate a structured improvement proposal in JSON:
{
  "problemStatement": "...",
  "proposedSolution": "...",
  "affectedModules": ["..."],
  "estimatedImpact": "HIGH|MEDIUM|LOW",
  "implementationComplexity": "COMPLEX|MODERATE|SIMPLE"
}`, 'reasoning').catch(() => '{}');

        const markdown = `
## Evolution Proposal [${new Date().toISOString()}]
**Trigger:** ${failureCount} failures on category: "${category}"
**Proposal:** ${proposal}
---
`;
        if (typeof self !== 'undefined' && 'postMessage' in self) {
            (self as any).postMessage({ type: 'SAERE_LOG', payload: `[EVOLUTION_PROPOSAL] ${markdown}` });
        }
    }
}
