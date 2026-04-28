export type ModelProvider = 'gemini-cloud' | 'local-llm' | 'hybrid';

export interface RouteDecision {
  provider: ModelProvider;
  modelId: string;
  reason: string;
  estimatedTokens: number;
}

export interface ContextPayload {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
}

export interface CompressionResult {
  originalTokens: number;
  compressedTokens: number;
  content: ContextPayload[];
  dropped: ContextPayload[];
  compressionRatio: number;
}

export interface CircuitBreakerState {
  status: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  failureCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

export interface DOMSnapshot {
  url: string;
  title: string;
  content: string;
  timestamp: number;
}

export interface AIRequest {
  messages: ContextPayload[];
  systemInstruction?: string;
  temperature?: number;
  modelPreference?: ModelProvider;
  cloudModel?: string;
  apiKey?: string;
}

export interface AIResponse {
  text?: string;
  error?: string;
  decision: RouteDecision;
  finalContext: ContextPayload[];
}

export interface OrchestratorConfig {
  maxTokensBeforeLocal: number;
  maxTokensBeforeCompression: number;
  circuitBreakerThreshold: number;
  circuitBreakerResetTimeoutMs: number;
}
