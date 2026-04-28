import { BaseBrain } from './BaseBrain';
import { SovereignPlan } from './types';
import { fileSystemTools, fileSystemImplementations } from '../capabilities/FileSystem';

export class SovereignKernel extends BaseBrain {
  constructor() {
    super({
      id: 'Sovereign.Flash',
      name: 'Executive Engine',
      model: 'gemini-2.0-flash-exp', // Fast for execution
      systemInstruction: `You are Sovereign Flash, the executive arm of the Omni-Entity.
Your role is to execute technical instructions precisely using the provided tools.
Focus on correctness, speed, and standardizing the codebase.`,
      tools: fileSystemTools,
      toolImplementations: fileSystemImplementations
    });
  }

  public async run(plan: SovereignPlan): Promise<string> {
    console.log('[Sovereign.Kernel] Executing plan...');
    
    let combinedResults = '';
    
    // Execute each task
    for (const task of plan.tasks) {
      console.log(`[Sovereign.Kernel] Running task ${task.id}: ${task.type}`);
      const result = await this.callAI(`Execute task: ${task.instruction}`);
      combinedResults += `\n### Task ${task.id} Result:\n${result}\n`;
    }

    return combinedResults;
  }
}
