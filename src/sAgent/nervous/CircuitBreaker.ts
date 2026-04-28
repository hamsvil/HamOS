import { eventBus } from './EventBus';

export class CircuitBreaker {
  private static failures: Map<string, number> = new Map();
  private static status: Map<string, 'open' | 'closed'> = new Map();

  public static reportFailure(serviceId: string) {
    const current = this.failures.get(serviceId) || 0;
    this.failures.set(serviceId, current + 1);

    if (current + 1 >= 3) {
      this.status.set(serviceId, 'open');
      console.error(`[CircuitBreaker] Opened for ${serviceId}`);
      setTimeout(() => this.reset(serviceId), 60000 * 5); // 5 min timeout
    }
  }

  public static isOpen(serviceId: string): boolean {
    return this.status.get(serviceId) === 'open';
  }

  private static reset(serviceId: string) {
    this.failures.set(serviceId, 0);
    this.status.set(serviceId, 'closed');
    console.log(`[CircuitBreaker] Reset for ${serviceId}`);
  }
}
