 
import { MultiProviderRouter } from './MultiProviderRouter';

export interface DecisionRecord {
    id: string;
    timestamp: number;
    errorSummary: string;
    rootCause: string;
    fixApplied: string;
    confidence: number;
    policy: string;
    reasoning: string;
    alternativesConsidered: string[];
    impactedFiles: string[];
    counterfactual: string;
    rollbackPlan: string;
}

export class InterpretabilityEngine {
    static async document(params: {
        error: string;
        rootCause: string;
        chosenFix: string;
        alternatives: string[];
        confidenceScore: number;
        policy: string;
        impactedFiles: string[];
    }): Promise<DecisionRecord> {
        const [reasoning, counterfactual] = await Promise.all([
            MultiProviderRouter.route(
                `In 2-3 plain sentences, explain WHY this fix was chosen:\nError: ${params.error}\nFix: ${params.chosenFix}\nAlternatives rejected: ${params.alternatives.slice(0,2).join('; ')}`,
                'text'
            ).catch(() => 'Reasoning unavailable.'),
            MultiProviderRouter.route(
                `In 1-2 sentences: what would happen if this error was NOT fixed?\nError: ${params.error}`,
                'text'
            ).catch(() => 'Counterfactual unavailable.'),
        ]);

        const record: DecisionRecord = {
            id: crypto.randomUUID(),
            timestamp: Date.now(),
            errorSummary: params.error.substring(0, 300),
            rootCause: params.rootCause,
            fixApplied: params.chosenFix.substring(0, 500),
            confidence: params.confidenceScore,
            policy: params.policy,
            reasoning,
            alternativesConsidered: params.alternatives,
            impactedFiles: params.impactedFiles,
            counterfactual,
            rollbackPlan: `Revert changes in: ${params.impactedFiles.join(', ')}`,
        };

        await this.writeToLog(record);
        return record;
    }

    private static async writeToLog(record: DecisionRecord): Promise<void> {
        const entry = `
## [${record.id.substring(0, 8)}] ${new Date(record.timestamp).toISOString()}

**Error:** ${record.errorSummary}
**Root Cause:** ${record.rootCause}
**Fix Policy:** ${record.policy} (Confidence: ${record.confidence}/100)

**Why This Fix:** ${record.reasoning}
**If Not Fixed:** ${record.counterfactual}

**Files Changed:** ${record.impactedFiles.join(', ') || 'none'}
**Rollback:** ${record.rollbackPlan}

---
`;
        if (typeof self !== 'undefined' && 'postMessage' in self) {
            (self as any).postMessage({ type: 'SAERE_LOG', payload: `[DECISION_LOG] ${entry}` });
        }
    }
}
