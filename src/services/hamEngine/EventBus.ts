/* eslint-disable no-useless-assignment */
type EventCallback = (data: any) => void;

export class EventBus {
  private listeners: Map<string, EventCallback[]> = new Map();

  subscribe(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  subscribeOnce(event: string, callback: EventCallback) {
    const onceWrapper = (data: any) => {
      this.unsubscribe(event, onceWrapper);
      callback(data);
    };
    this.subscribe(event, onceWrapper);
  }

  publish(event: string, data?: any) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      // Use a copy to avoid issues if a callback unsubscribes during execution
      [...callbacks].forEach(cb => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EventBus] Error in listener for event "${event}":`, err);
        }
      });
    }
  }

  unsubscribe(event: string, callback: EventCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      this.listeners.set(event, callbacks.filter(cb => cb !== callback));
    }
  }

  clear() {
    this.listeners.clear();
  }
}

export const engineEventBus = new EventBus();
