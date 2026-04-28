import { eventBus } from '../nervous/EventBus';
import { TelemetryEvent } from './types';

export class Telemetry {
  private static instance: Telemetry;
  private readonly MAX_EVENTS = 1000;
  private events: TelemetryEvent[] = [];

  private constructor() {
    eventBus.on('intent.received', this.logEvent.bind(this));
    eventBus.on('route.decided', this.logEvent.bind(this));
    eventBus.on('capability.invoked', this.logEvent.bind(this));
    eventBus.on('capability.completed', this.logEvent.bind(this));
    eventBus.on('capability.failed', this.logEvent.bind(this));
    eventBus.on('memory.accessed', this.logEvent.bind(this));
  }

  public static getInstance(): Telemetry {
    if (!Telemetry.instance) {
      Telemetry.instance = new Telemetry();
    }
    return Telemetry.instance;
  }

  private logEvent(data: any) {
    const event: TelemetryEvent = {
      id: Math.random().toString(36).substring(7),
      component: 'Core', // This should be dynamic based on event
      action: 'EventReceived', // This too
      timestamp: Date.now(),
      status: 'success',
      metadata: data
    };

    this.events.push(event);
    if (this.events.length > this.MAX_EVENTS) {
      this.events.shift();
    }
    
    // Optional: Sync to storage or external observability tool
  }

  public getRecentLogs(count: number = 50): TelemetryEvent[] {
    return this.events.slice(-count);
  }
}

export const telemetry = Telemetry.getInstance();
