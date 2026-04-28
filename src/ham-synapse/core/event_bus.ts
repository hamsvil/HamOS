 
import { HamEvent, HamEventType } from './types';

type EventHandler = (event: HamEvent) => void;

class HamEventBus {
  private listeners: Map<HamEventType, EventHandler[]> = new Map();

  subscribe(type: HamEventType, handler: EventHandler): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }
    this.listeners.get(type)!.push(handler);

    return () => {
      const handlers = this.listeners.get(type);
      if (handlers) {
        this.listeners.set(type, handlers.filter(h => h !== handler));
      }
    };
  }

  dispatch(event: HamEvent): void {
    const handlers = this.listeners.get(event.type);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(event);
        } catch (error) {
          console.error(`[HamEventBus Error] Error in handler for event type ${event.type}:`, error);
          // Self-healing: Melaporkan kesalahan ke bus itu sendiri jika memungkinkan (hindari rekursi)
          if (event.type !== HamEventType.SYSTEM_ERROR) {
            this.dispatch({
              id: `err_${Date.now()}`,
              type: HamEventType.SYSTEM_ERROR,
              timestamp: Date.now(),
              source: 'EVENT_BUS',
              payload: { message: `Handler error: ${error instanceof Error ? error.message : String(error)}`, originalEvent: event }
            });
          }
        }
      });
    }
  }
}

export const hamEventBus = new HamEventBus();
