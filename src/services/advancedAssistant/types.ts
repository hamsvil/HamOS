export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, string>;
  execute: (params: Record<string, unknown>, context?: Record<string, unknown>) => Promise<string>;
}

export interface AgentAction {
  type: string;
  path?: string;
  content?: string;
  params?: Record<string, unknown>;
}

export interface AgentObservation {
  action: string;
  output: string;
}

export interface PlanStep {
  id: string;
  description: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
}

export interface SecurityContext {
  userId: string;
  role: string;
  permissions: string[];
}

export interface AgentMemory {
  input: string;
  output: string;
  timestamp?: number;
}
