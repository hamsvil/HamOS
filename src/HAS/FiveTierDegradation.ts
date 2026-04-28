 
import { MerkleScribe } from './MerkleScribe';

export type DegradationTier = 1 | 2 | 3 | 4 | 5;

export class FiveTierDegradation {
    static currentTier: DegradationTier = 1;

    static readonly TIER_NAMES: Record<DegradationTier, string> = {
        1: 'SOVEREIGN — Full Power (All 41 modules active)',
        2: 'GUARDIAN — Reduced (Chaos/WebRTC disabled)',
        3: 'SENTINEL — Minimal (Core fix + 2 providers)',
        4: 'WATCHMAN — Critical Only (Local WASM fallback)',
        5: 'WITNESS — Read Only (Log & alert, no auto-fix)',
    };

    static evaluate(): DegradationTier {
        const mem = typeof performance !== 'undefined' && (performance as any).memory ? (performance as any).memory : null;
        const usedMB = mem ? mem.usedJSHeapSize / 1048576 : 0;
        const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

        // Emergency: no network
        if (!isOnline) return 4;

        // Critical: very high memory
        if (usedMB > 900) return 3;

        // High: elevated memory
        if (usedMB > 600) return 2;

        return 1;
    }

    static update(): void {
        const newTier = this.evaluate();
        if (newTier !== this.currentTier) {
            MerkleScribe.logAndVerify('TIER_CHANGE', { from: this.currentTier, to: newTier, name: this.TIER_NAMES[newTier] });
            this.currentTier = newTier;
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('SAERE_TIER_CHANGE', { detail: { tier: newTier, name: this.TIER_NAMES[newTier] } }));
            } else if (typeof self !== 'undefined' && 'postMessage' in self) {
                (self as any).postMessage({ type: 'SAERE_TIER_CHANGE', payload: { tier: newTier, name: this.TIER_NAMES[newTier] } });
            }
        }
    }

    static isFeatureEnabled(feature: string): boolean {
        const tier = this.currentTier;
        const featureMap: Record<string, number> = {
            'chaos_incubator': 2,     
            'webrtc_grid': 2,
            'evolutionary_mutagenesis': 2,
            'proactive_scanning': 3,
            'world_simulator': 3,
            'diversity_engine': 3,
            'cloud_api': 4,           
            'auto_fix': 5,            
        };
        const disabledAtTier = featureMap[feature];
        if (!disabledAtTier) return true;
        return tier < disabledAtTier;
    }
}
