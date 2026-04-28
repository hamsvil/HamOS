/* eslint-disable no-useless-assignment */
import { CircuitBreakerState } from './types';

export class CircuitBreaker {
  private state: CircuitBreakerState = {
    status: 'CLOSED',
    failureCount: 0,
    lastFailureTime: 0,
    nextRetryTime: 0,
  };

  private readonly threshold: number;
  private readonly resetTimeoutMs: number;
  private readonly maxBackoffMs: number = 60000; // Max 1 minute backoff

  constructor(threshold: number = 3, resetTimeoutMs: number = 10000) {
    this.threshold = threshold;
    this.resetTimeoutMs = resetTimeoutMs;
  }

  public getState(): 'CLOSED' | 'OPEN' | 'HALF_OPEN' {
    const now = Date.now();
    if (this.state.status === 'OPEN' && now >= this.state.nextRetryTime) {
      this.state.status = 'HALF_OPEN';
    }
    return this.state.status;
  }

  public recordSuccess(): void {
    this.state = {
      status: 'CLOSED',
      failureCount: 0,
      lastFailureTime: 0,
      nextRetryTime: 0,
    };
  }

  public recordFailure(): void {
    this.state.failureCount += 1;
    this.state.lastFailureTime = Date.now();

    if (this.state.failureCount >= this.threshold) {
      this.state.status = 'OPEN';
      // Exponential backoff: resetTimeout * 2^(failureCount - threshold)
      const backoffMultiplier = Math.pow(2, this.state.failureCount - this.threshold);
      const backoffTime = Math.min(this.resetTimeoutMs * backoffMultiplier, this.maxBackoffMs);
      this.state.nextRetryTime = this.state.lastFailureTime + backoffTime;
    }
  }

  public canExecute(): boolean {
    return this.getState() === 'CLOSED' || this.getState() === 'HALF_OPEN';
  }
}
