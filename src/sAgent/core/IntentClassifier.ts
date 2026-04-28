import { BaseBrain } from './BaseBrain';
import { RouteDecision, Intent } from './types';

export class IntentClassifier extends BaseBrain {
  constructor() {
    super({
      id: 'Sovereign.Classifier',
      name: 'Intent Router',
      model: 'gemini-2.0-flash', // Fast for classification
      systemInstruction: `You are the Intent Classifier for the Sovereign Omni-Entity.
Analyze user input and output a RouteDecision JSON.

TIERS:
- 'pro': Complex reasoning, architecture, planning.
- 'flash': Refactoring, small logic, UI components, file operations.
- 'deep': Deep research, multi-file audit, complex bug fixing.

Output Format (JSON strictly):
{
  "id": "uuid",
  "tier": "pro" | "flash" | "deep",
  "capabilities": ["filesystem", "ast", ...],
  "persona": "weaver" | "logic" | "sentinel" | ...,
  "destructive": boolean,
  "reasoning": "string"
}`
    });
  }

  public async classify(input: string): Promise<{ intent: Intent, route: RouteDecision }> {
    const rawResponse = await this.callAI(`Classify this input: "${input}"`);
    
    try {
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      const route: RouteDecision = jsonMatch ? JSON.parse(jsonMatch[0]) : this.getFallbackRoute();
      
      const intent: Intent = {
        id: Math.random().toString(36).substring(7),
        rawInput: input,
        complexity: route.tier === 'deep' ? 0.9 : (route.tier === 'pro' ? 0.6 : 0.2),
        domain: route.persona || 'general',
        timestamp: Date.now()
      };

      return { intent, route };
    } catch (e) {
      return { 
        intent: { id: 'fallback', rawInput: input, complexity: 0.1, domain: 'general', timestamp: Date.now() },
        route: this.getFallbackRoute()
      };
    }
  }

  private getFallbackRoute(): RouteDecision {
    return {
      tier: 'flash',
      capabilities: ['filesystem'],
      persona: 'logic',
      destructive: false,
      reasoning: 'Fallback due to classification error'
    };
  }
}
