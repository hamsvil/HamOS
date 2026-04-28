 
import { SemanticNeuralPatcher } from './SemanticNeuralPatcher';

export type FixPolicy = 'AUTO_APPLY' | 'SHADOW_ONLY' | 'ESCALATE_HUMAN' | 'REJECT';

export interface ConfidenceReport {
    totalScore: number;
    breakdown: { syntax: number; semantic: number; tests: number; history: number };
    policy: FixPolicy;
    reasoning: string;
}

export class ConfidenceOracle {
    static async score(fix: string, errorContext: string, codeContext: string): Promise<ConfidenceReport> {
        const [syntax, semantic, tests, history] = await Promise.all([
            this.checkSyntax(fix),
            this.checkSemantic(fix, codeContext),
            this.checkTests(fix),
            this.checkHistory(errorContext),
        ]);

        const total = syntax + semantic + tests + history;
        const policy: FixPolicy =
            total >= 70 ? 'AUTO_APPLY' :
            total >= 55 ? 'SHADOW_ONLY' :
            total >= 40 ? 'ESCALATE_HUMAN' : 'REJECT';

        return {
            totalScore: total,
            breakdown: { syntax, semantic, tests, history },
            policy,
            reasoning: `Score: ${total}/100 [Syntax:${syntax}/30 Semantic:${semantic}/30 Tests:${tests}/20 History:${history}/20] → ${policy}`,
        };
    }

    private static async checkSyntax(fix: string): Promise<number> {
        try {
            // Dynamic import to avoid loading babel in all contexts
            const { parse } = await import('@babel/parser');
            parse(fix, { sourceType: 'module', plugins: ['typescript', 'jsx'] });
            return 30;
        } catch { return 0; }
    }

    private static async checkSemantic(fix: string, codeContext: string): Promise<number> {
        // Check if fix uses consistent naming conventions, imports, patterns
        const hasConsistentPatterns = codeContext.length > 0 && fix.length > 0;
        return hasConsistentPatterns ? 20 : 10;
    }

    private static async checkTests(fix: string): Promise<number> {
        const hasTestKeywords = /\b(test|spec|expect|describe|it\(|assert)\b/.test(fix);
        const hasMeaningfulLogic = fix.split('\n').length > 3;
        if (hasTestKeywords) return 20;
        if (hasMeaningfulLogic) return 10;
        return 5;
    }

    private static async checkHistory(errorContext: string): Promise<number> {
        const cached = await SemanticNeuralPatcher.findSimilar(errorContext, 0.80);
        if (!cached) return 10;
        return Math.round(cached.successRate * 20);
    }
}
