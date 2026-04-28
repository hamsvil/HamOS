import { StateRehydrator } from '../StateRehydrator';
import { CircuitMaster } from '../CircuitMaster';

export class ShadowMirror {
    private static ghostState: Map<string, any> = new Map();

    static async enterShadowMode() {
        console.log('[SAERE] Entering Shadow Mode (Ghost Layer Active)');
        CircuitMaster.setShadowTesting(true);
        // Snapshot current state
        this.ghostState.clear();
    }

    static async exitShadowMode(commit: boolean = false) {
        console.log(`[SAERE] Exiting Shadow Mode (Commit: ${commit})`);
        if (commit) {
            for (const [key, value] of this.ghostState.entries()) {
                StateRehydrator.set(key, value);
            }
        }
        this.ghostState.clear();
        CircuitMaster.setShadowTesting(false);
    }

    static set(key: string, value: any) {
        if (CircuitMaster.isShadowTesting()) {
            this.ghostState.set(key, value);
        } else {
            StateRehydrator.set(key, value);
        }
    }

    static get(key: string) {
        if (CircuitMaster.isShadowTesting() && this.ghostState.has(key)) {
            return this.ghostState.get(key);
        }
        return StateRehydrator.get(key);
    }
}
