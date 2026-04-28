 
import { OmniEvent, OmniStateHash, OmniStateDelta, OmniEventType } from '../core/types';
import { omniEventBus } from '../core/event_bus';
import { OmniSanitizer } from '../security/sanitizer';

/**
 * OmniStateManager: Handles Differential Context Sync (DCS).
 * It maintains the application state and only sends deltas to the AI.
 */
export class OmniStateManager {
    private currentState: any = {};
    private stateHash: OmniStateHash = '';
    private hashUpdateTimeout: any = null;

    constructor() {
        // Subscribe to relevant events to update state
        omniEventBus.subscribe(OmniEventType.UI_INTERACTION, this.handleUIInteraction.bind(this));
        omniEventBus.subscribe(OmniEventType.MEMORY_APPEND, this.handleMemoryAppend.bind(this));
    }

    /**
     * Applies a delta to the current state.
     */
    public async applyDelta(delta: OmniStateDelta): Promise<void> {
        // Basic JSON Path implementation for demonstration
        const pathParts = delta.path.split('.');
        let current = this.currentState;
        
        for (let i = 0; i < pathParts.length - 1; i++) {
            if (!current[pathParts[i]]) {
                current[pathParts[i]] = {};
            }
            current = current[pathParts[i]];
        }

        const lastPart = pathParts[pathParts.length - 1];

        switch (delta.operation) {
            case 'SET':
                current[lastPart] = delta.value;
                break;
            case 'DELETE':
                delete current[lastPart];
                break;
            case 'MERGE':
                if (typeof current[lastPart] === 'object' && typeof delta.value === 'object') {
                    current[lastPart] = { ...current[lastPart], ...delta.value };
                } else {
                    current[lastPart] = delta.value;
                }
                break;
        }

        // Update State Hash (Debounced to prevent Event Loop Starvation)
        if (this.hashUpdateTimeout) {
            clearTimeout(this.hashUpdateTimeout);
        }
        this.hashUpdateTimeout = setTimeout(async () => {
            this.stateHash = await OmniSanitizer.generateStateHash(this.currentState);
        }, 100);
    }

    /**
     * Returns the current state hash.
     */
    public getHash(): OmniStateHash {
        return this.stateHash;
    }

    /**
     * Returns the full state (used for initial sync or recovery).
     */
    public getFullState(): any {
        return typeof structuredClone === 'function' ? structuredClone(this.currentState) : JSON.parse(JSON.stringify(this.currentState));
    }

    // Event Handlers
    private async handleUIInteraction(event: OmniEvent): Promise<void> {
        // Example: Update state based on UI interaction
        await this.applyDelta({
            path: `ui.lastInteraction`,
            value: event.payload,
            operation: 'SET'
        });
    }

    private async handleMemoryAppend(event: OmniEvent): Promise<void> {
         await this.applyDelta({
            path: `memory.lastAppendedNode`,
            value: event.payload.id,
            operation: 'SET'
        });
    }
}

export const stateManager = new OmniStateManager();
