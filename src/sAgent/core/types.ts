export type BrainTier = 'pro' | 'flash' | 'deep';

export interface Intent {
  id: string;
  rawInput: string;
  complexity: number;
  domain: string;
  timestamp: number;
}

export interface RouteDecision {
  tier: BrainTier;
  capabilities: string[];
  persona?: string;
  multimodal?: 'vision' | 'audio' | 'video' | 'image-gen' | 'video-gen' | 'audio-gen';
  destructive: boolean;
  reasoning: string;
}

export interface SovereignPlan {
  originalPrompt: string;
  intent: Intent;
  route?: RouteDecision;
  requiresDeepResearch: boolean;
  tasks: SovereignTask[];
  context: Record<string, any>;
}

export interface SovereignTask {
  id: string;
  type: 'ui' | 'logic' | 'security' | 'database' | 'infra' | 'research';
  instruction: string;
  assignedBrain: BrainTier;
  priority: number;
}

export interface TelemetryEvent {
  id: string;
  component: string;
  action: string;
  timestamp: number;
  status: 'success' | 'failure' | 'warn' | 'info';
  metadata: any;
}

export interface Persona {
  id: string;
  name: string;
  domain: string;
  systemInstruction: string;
  preferredTier: BrainTier;
  tools: string[];
}

export interface Tool {
  name: string;
  description: string;
  parameters: any;
  execute: (args: any) => Promise<any>;
  guardrail?: boolean;
}

export interface SovereignResponse {
  id: string;
  text: string;
  status: 'success' | 'failure';
  plan?: SovereignPlan;
  latencyMs: number;
}
