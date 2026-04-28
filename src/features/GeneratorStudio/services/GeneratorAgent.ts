import { LisaBaseAgent, LisaAgentConfig } from '../../../sAgent/coreAgents/LisaBaseAgent';
import { agentPersonaRegistry } from '../../../sAgent/AgentPersonaRegistry';

export interface GeneratedContent {
  type: 'code' | 'ui' | 'content' | 'image-prompt';
  content: string;
  metadata: any;
  confidence: number;
}

export class GeneratorAgent extends LisaBaseAgent {
  constructor(config: Partial<LisaAgentConfig> = {}) {
    const persona = agentPersonaRegistry.getPersona('generator-studio');
    super({
      id: 'generator-agent',
      featureId: 'generator-studio',
      name: persona?.name || 'Generator Studio',
      role: persona?.role || 'Digital Content Architect',
      systemInstruction: persona?.systemPromptOverlay || 'You are the Generator Studio agent. Create high-quality code, UI designs, content, and image prompts based on user needs.',
      apiKeys: (globalThis as any).GEMINI_API_KEY ? [(globalThis as any).GEMINI_API_KEY] : [],
      logFile: 'logs/agent_generator.log',
      ...config
    });
  }

  public async generate(prompt: string, type: 'code' | 'ui' | 'content' | 'image-prompt'): Promise<GeneratedContent> {
    const response = await this.executeWithAudit(`Generate ${type} based on: ${prompt}`);
    try {
      const data = JSON.parse(response);
      return {
        type: data.type || type,
        content: data.content || response,
        metadata: data.metadata || {},
        confidence: data.confidence || 0.9
      };
    } catch (e) {
      return {
        type,
        content: response,
        metadata: {},
        confidence: 0.8
      };
    }
  }
}
