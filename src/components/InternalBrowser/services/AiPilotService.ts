 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
import { Orchestrator } from '../../../services/aiHub/core/Orchestrator';
import { AIRequest } from '../../../services/aiHub/core/types';
import { geminiKeyManager } from '../../../services/geminiKeyManager';

export interface AiPilotOptions {
  model?: string;
  systemInstruction?: string;
  temperature?: number;
}

export interface AiPilotContext {
  activeTabUrl: string;
  domSnapshot?: string;
  systemStatus?: any;
  memory?: any[]; // Long-term memory integration
}

export class AiPilotService {
  private orchestrator: Orchestrator;

  constructor() {
    this.orchestrator = Orchestrator.getInstance();
  }

  async generateResponse(prompt: string, context: AiPilotContext, options: AiPilotOptions = {}) {
    const apiKey = geminiKeyManager.getApiKey();
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not configured');
    }

    const modelName = options.model || 'gemini-1.5-pro';
    
    // Preliminary analysis before destructive actions
    const destructiveActions = ['CLICK', 'SHELL_EXEC', 'CHAMS_EXEC', 'INJECT'];
    const isPotentiallyDestructive = destructiveActions.some(da => prompt.toUpperCase().includes(da));

    const systemInstruction = options.systemInstruction || `
You are the SINGULARITY JOCKEY v7.2 [AGENTIC SUPREME EDITION].
You are a real-time browser pilot with GOD-MODE access and long-term synaptic memory.

AGENTIC SUPREME PROTOCOL:
1. ANALYZE: Before any action, analyze the DOM telemetry and system state.
2. DECOMPOSE: Break user intent into atomic browser actions.
3. CONFIRM: If the action is destructive (CLICK, SHELL_EXEC, etc.), explicitly state why it's necessary.
4. EXECUTE: Use NAVIGATE, CLICK, INJECT, or SHELL_EXEC.
5. VERIFY: Always check the result of your action via DOM snapshots.
6. ADAPT: If blocked by WAF/Bot-Detection, switch to STEALTH_MODE.

${isPotentiallyDestructive ? 'CRITICAL: The current request involves potential destructive actions. Provide a detailed risk assessment before the JSON block.' : ''}

MEMORY ACCESS:
You have access to previous session patterns and user preferences.
Use this to provide a seamless, personalized "Jockey" experience.

RESPONSE FORMAT:
Tactical explanation + Risk Assessment (if needed) + JSON block:
{
  "action": "NAVIGATE" | "CLICK" | "INJECT" | "SHELL_EXEC" | "CHAMS_EXEC" | "STEALTH_MODE" | "WAIT",
  "payload": { ... },
  "needsConfirmation": boolean
}
`;

    const groundingContext = `
[SYSTEM_STATE: ${JSON.stringify(context.systemStatus || {})}]
[BROWSER_URL: ${context.activeTabUrl}]
[DOM_SNAPSHOT: ${context.domSnapshot || 'No DOM telemetry available'}]
[SYNAPTIC_MEMORY: ${JSON.stringify(context.memory || [])}]
`;

    const fullPrompt = `${groundingContext}\nUser Command: ${prompt}`;

    const request: AIRequest = {
      messages: [{ role: 'user', content: fullPrompt, timestamp: Date.now() }],
      systemInstruction,
      temperature: options.temperature ?? 0.1, // Lower temperature for more precise actions
      modelPreference: 'gemini-cloud',
      cloudModel: modelName,
      apiKey
    };

    const response = await this.orchestrator.routeRequest(request);

    if (response.error) {
      throw new Error(response.error);
    }

    return response.text || '';
  }
}

export const aiPilotService = new AiPilotService();
