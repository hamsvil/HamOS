export enum HamEventType {
  UI_INTERACTION = 'UI_INTERACTION',
  MEMORY_APPEND = 'MEMORY_APPEND',
  SYNC_STATE = 'SYNC_STATE',
  RESTART_SERVER = 'RESTART_SERVER',
  AI_RESPONSE_DELTA = 'AI_RESPONSE_DELTA',
  AI_RESPONSE = 'AI_RESPONSE',
  AI_THINKING_START = 'AI_THINKING_START',
  AI_THINKING_END = 'AI_THINKING_END',
  SYSTEM_ERROR = 'SYSTEM_ERROR',
  BROWSER_CONTROL = 'BROWSER_CONTROL',
  BROWSER_STATE = 'BROWSER_STATE',
  AI_VISION_TARGET = 'AI_VISION_TARGET',
  AI_ACTION_LOG = 'AI_ACTION_LOG',
  AI_STOP = 'AI_STOP',
  SYNC_COMPLETE = 'SYNC_COMPLETE',
}

export interface HamEvent {
  id: string;
  type: HamEventType;
  timestamp: number;
  source: string;
  payload: any;
}

export interface HamWorkerMessage {
  type: string;
  payload: any;
}
