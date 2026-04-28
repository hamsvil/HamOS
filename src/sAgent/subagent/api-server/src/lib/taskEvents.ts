import { EventEmitter } from "events";

export interface TaskLogEvent {
  taskId: string;
  level: string;
  message: string;
  agentCodename?: string;
  timestamp: string;
}

class TaskEventBus extends EventEmitter {
  emit(event: "log", data: TaskLogEvent): boolean;
  emit(event: string | symbol, ...args: unknown[]): boolean {
    return super.emit(event, ...args);
  }

  on(event: string | symbol, listener: (...args: unknown[]) => void): this {
    return super.on(event, listener);
  }

  emitLog(data: TaskLogEvent): void {
    this.emit("log", data);
  }
}

export const taskEventBus = new TaskEventBus();
taskEventBus.setMaxListeners(200);
