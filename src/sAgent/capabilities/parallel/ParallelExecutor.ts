import { Persona } from '../../core/types';
import { sovereign } from '../../core/Sovereign';

/**
 * ParallelExecutor - Replaces the old 15 Echo Swarm clones.
 * Spawns N parallel tasks using any persona.
 */
export class ParallelExecutor {
  public async executeParallel(
    tasks: { prompt: string; persona?: string }[],
    concurrency: number = 5
  ): Promise<any[]> {
    console.log(`[ParallelExecutor] Spawning ${tasks.length} tasks with concurrency ${concurrency}...`);
    
    // Simple pool implementation
    const results: any[] = [];
    const chunks = [];
    for (let i = 0; i < tasks.length; i += concurrency) {
      chunks.push(tasks.slice(i, i + concurrency));
    }

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(task => 
        sovereign.execute(task.prompt) // Note: Need a way to pass persona explicitly to Sovereign.execute
      );
      const chunkResults = await Promise.allSettled(chunkPromises);
      results.push(...chunkResults);
    }

    return results;
  }
}
