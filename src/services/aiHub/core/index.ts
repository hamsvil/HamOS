/* eslint-disable no-useless-assignment */
export * from './types';
export * from './CircuitBreaker';
export * from './ContextCompressor';
export * from './SingularityBridge';
export * from './HybridRouter';
export * from './Orchestrator';
export * from './NeuralContextService';

import { Orchestrator } from './Orchestrator';

export const orchestrator = new Orchestrator({
  maxTokensBeforeLocal: 2000,
  maxTokensBeforeCompression: 4000,
  circuitBreakerThreshold: 5,
  circuitBreakerResetTimeoutMs: 30000
});
