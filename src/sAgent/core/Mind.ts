import { BaseBrain } from './BaseBrain';
import { SovereignPlan } from './types';

export class SovereignMind extends BaseBrain {
  constructor() {
    super({
      id: 'Sovereign.Pro',
      name: 'Omni-Mind Router',
      model: 'gemini-2.0-pro-exp-02-05', // High reasoning for planning
      systemInstruction: `You are the Sovereign Pro, the master architect of the Omni-Entity.
Your task is to decompose high-level user requests into actionable technical plans.

PRINSIP EKSEKUSI:
1. Jika tugas memerlukan "Deep Thinking", "Complex Architecture Review", atau "Multi-step Research", aktifkan flag requiresDeepResearch.
2. Pecah tugas menjadi modul fungsional: UI, Logic, Security, Database, Infra.
3. Selalu prioritaskan keamanan data dan efisiensi kode.

Response must be in JSON format matching the SovereignPlan interface.`
    });
  }

  public async think(prompt: string): Promise<SovereignPlan> {
    console.log('[Sovereign.Mind] Thinking...');
    
    // In a real implementation, we would enforce JSON output.
    // For now, I will use a simple prompt.
    const response = await this.callAI(`Analyze this prompt and generate a SovereignPlan: "${prompt}"`);
    
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error("Invalid JSON plan output");
    } catch (e) {
      console.warn('[Sovereign.Mind] Blueprinting failed, using fallback plan.');
      return {
        originalPrompt: prompt,
        intent: {
          id: 'fallback-intent',
          rawInput: prompt,
          complexity: 1,
          domain: 'general',
          timestamp: Date.now()
        },
        requiresDeepResearch: false,
        tasks: [{ id: 'task-1', type: 'logic', instruction: prompt, assignedBrain: 'flash', priority: 1 }],
        context: {}
      };
    }
  }
}
