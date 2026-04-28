 
import { MultiProviderRouter } from './MultiProviderRouter';
import { FiveTierDegradation } from './FiveTierDegradation';

const VISUAL_ERROR_PATTERNS = [
    /CSS/, /style/i, /className/i, /render/i, /layout/i,
    /overflow/i, /height/i, /width/i, /display/i, /position/i,
];

export class OracleEye {
    static isVisualError(errorText: string): boolean {
        return VISUAL_ERROR_PATTERNS.some(p => p.test(errorText));
    }

    static async captureAndAnalyze(errorContext: string): Promise<string> {
        if (!this.isVisualError(errorContext)) return '';
        if (FiveTierDegradation.currentTier >= 3) return ''; 

        try {
            return await MultiProviderRouter.route(
                `Analyze visual bugs for: ${errorContext}. Describe visual issues in 2-3 sentences.`,
                'vision'
            );
        } catch {
            return ''; 
        }
    }
}
