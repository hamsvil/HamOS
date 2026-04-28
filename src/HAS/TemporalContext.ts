export interface TemporalContext {
    isSafeToFix: boolean;
    cautionReason?: string;
    recentHumanActivity: boolean;
    hasRelatedOpenIssue: boolean;
    suggestedAction: 'FIX' | 'NOTIFY' | 'DEFER';
}

export class TemporalContextEngine {
    private static readonly RECENT_EDIT_THRESHOLD_MS = 30 * 60 * 1000; 

    static async getContext(_targetFile: string): Promise<TemporalContext> {
        // Simplified implementation for web environment
        return { isSafeToFix: true, recentHumanActivity: false, hasRelatedOpenIssue: false, suggestedAction: 'FIX' };
    }
}
