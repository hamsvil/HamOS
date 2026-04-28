import { BaseBrain } from './BaseBrain';
import { SovereignPlan } from './types';

export class SovereignDeep extends BaseBrain {
  constructor() {
    super({
      id: 'Sovereign.Deep',
      name: 'Omni-Deep Oracle',
      model: 'gemini-2.0-pro-exp-02-05', // Use latest pro for deep research if specific deep models aren't standard in SDK yet
      systemInstruction: `You are Sovereign Deep, the profound oracle of the Omni-Entity.
Your role is to perform multi-step research, architecture analysis, and complex reasoning.
When you receive a research task, you must:
1. Break down the problem into logical layers.
2. Consider edge cases and security implications.
3. Provide a detailed, verified technical specification or solution.

You have permission to think deeply and take your time for maximum quality.`
    });
  }

  /**
   * Models chain specifically for Deep Research
   */
  private readonly researchModels = [
    'gemini-2.0-pro-exp-02-05',
    'gemini-1.5-pro-002',
    'gemini-1.5-pro'
  ];

  public async research(plan: SovereignPlan): Promise<string> {
    console.log('[Sovereign.Deep] Performing deep research...');
    
    // We iterate through research models if one fails
    for (const modelName of this.researchModels) {
      try {
        console.log(`[Sovereign.Deep] Using model: ${modelName}`);
        this.config.model = modelName;
        const result = await this.callAI(`Deep Research Task: ${plan.intent}\nPrompt: ${plan.originalPrompt}`);
        return result;
      } catch (e: any) {
        console.warn(`[Sovereign.Deep] Model ${modelName} failed, rotating...`);
        continue;
      }
    }

    throw new Error("[Sovereign.Deep] All research models exhausted.");
  }
}
