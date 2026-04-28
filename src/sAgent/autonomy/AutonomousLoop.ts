import { sovereign } from '../core/Sovereign';
import { eventBus } from '../nervous/EventBus';

export class AutonomousLoop {
  private interval: any;
  private running = false;

  public start(intervalMs: number = 3600000) { // 1 hour default
    if (this.running) return;
    this.running = true;
    console.log('[Autonomy] Loop started.');

    this.interval = setInterval(() => this.runCycle(), intervalMs);
  }

  public stop() {
    clearInterval(this.interval);
    this.running = false;
    console.log('[Autonomy] Loop stopped.');
  }

  private async runCycle() {
    await eventBus.emit('autonomy.cycle.start', { timestamp: Date.now() });
    
    // Whitelisted directive check
    const result = await sovereign.execute("Perform a health audit of the codebase.");
    
    await eventBus.emit('autonomy.cycle.end', { result });
  }
}

export const autonomousLoop = new AutonomousLoop();
