/**
 * Sovereign Event Bus
 * Ported from ham-synapse
 */

type EventHandler = (data: any) => void | Promise<void>;

export class EventBus {
  private static instance: EventBus;
  private handlers: Map<string, Set<EventHandler>> = new Map();

  private constructor() {}

  public static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  public on(event: string, handler: EventHandler): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)?.add(handler);
  }

  public off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  public async emit(event: string, data: any): Promise<void> {
    const handlers = this.handlers.get(event);
    if (!handlers) return;

    const promises: any[] = [];
    handlers.forEach(handler => {
      try {
        const result = handler(data);
        if (result instanceof Promise) {
          promises.push(result);
        }
      } catch (e) {
        console.error(`[EventBus] Error in handler for ${event}:`, e);
      }
    });

    await Promise.allSettled(promises);
  }
}

export const eventBus = EventBus.getInstance();
