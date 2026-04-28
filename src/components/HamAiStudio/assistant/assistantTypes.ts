export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
  status: 'running' | 'success' | 'error';
  duration?: number;
  result?: string;
  error?: string;
}

export interface FileEdit {
  path: string;
  type: 'created' | 'edited' | 'deleted';
  diff?: string;
  summary?: {
    added: number;
    removed: number;
  };
}

export interface StepItem {
  id: string;
  label: string;
  status: 'pending' | 'running' | 'success' | 'error';
}

export type AssistantStatus = 'thinking' | 'planning' | 'executing' | 'done';

export type AssistantEvent = 
  | { type: 'text_chunk'; content: string }
  | { type: 'tool_call_start'; toolCall: ToolCall }
  | { type: 'tool_call_end'; toolCall: ToolCall }
  | { type: 'file_edit'; fileEdit: FileEdit }
  | { type: 'step_progress'; step: StepItem }
  | { type: 'status_change'; status: AssistantStatus }
  | { type: 'done' };
