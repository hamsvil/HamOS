import { eventBus } from './EventBus';
import { sovereign } from '../core/Sovereign';

/**
 * Resilience - One authority for self-healing
 */
export class Resilience {
  public static init() {
    eventBus.on('capability.failed', async ({ tool, error }) => {
      console.warn(`[Resilience] Capability ${tool} failed. Attempting self-healing...`);
      await sovereign.execute(`Fix the failure in capability ${tool}: ${error}`);
    });
  }
}
