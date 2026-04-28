 
import { OmniEvent, OmniEventType } from './types';
import { OmniSanitizer } from '../security/sanitizer';

type EventHandler = (event: OmniEvent) => void | Promise<void>;

/**
 * OmniEventBus: The central nervous system of Omni-Synapse.
 * It handles unidirectional data flow and ensures all events are sanitized.
 */
export class OmniEventBus {
    private static instance: OmniEventBus;
    private listeners: Map<OmniEventType, Set<EventHandler>> = new Map();
    private eventHistory: OmniEvent[] = [];
    private readonly MAX_HISTORY = 1000;

    private constructor() {}

    public static getInstance(): OmniEventBus {
        if (!OmniEventBus.instance) {
            OmniEventBus.instance = new OmniEventBus();
        }
        return OmniEventBus.instance;
    }

    /**
     * Subscribes to a specific event type.
     */
    public subscribe(type: OmniEventType, handler: EventHandler): () => void {
        if (!this.listeners.has(type)) {
            this.listeners.set(type, new Set());
        }
        this.listeners.get(type)!.add(handler);

        // Return unsubscribe function
        return () => {
            const handlers = this.listeners.get(type);
            if (handlers) {
                handlers.delete(handler);
                if (handlers.size === 0) {
                    this.listeners.delete(type);
                }
            }
        };
    }

    /**
     * Dispatches an event to all subscribers.
     * Ensures the event is sanitized and verified before processing.
     */
    public async dispatch(event: OmniEvent): Promise<void> {
        // 1. Security Check: Verify Integrity & Sanitize
        if (!OmniSanitizer.verifyEventIntegrity(event)) {
            console.error(`[OmniEventBus] Dropped invalid or malicious event: ${event.id}`);
            return;
        }

        // 2. Record in History (for Event-Sourcing)
        this.eventHistory.push(event);
        if (this.eventHistory.length > this.MAX_HISTORY) {
            this.eventHistory.shift(); // Maintain size limit
        }

        // 3. Notify Subscribers
        const handlers = this.listeners.get(event.type);
        if (handlers) {
            const promises = Array.from(handlers).map(async (handler) => {
                try {
                    await handler(event);
                } catch (error) {
                    console.error(`[OmniEventBus] Error in handler for event ${event.type}:`, error);
                }
            });
            
            // Execute all handlers concurrently
            await Promise.all(promises);
        }
    }

    /**
     * Retrieves the event history for state reconstruction.
     */
    public getHistory(): OmniEvent[] {
        return [...this.eventHistory];
    }
}

export const omniEventBus = OmniEventBus.getInstance();
