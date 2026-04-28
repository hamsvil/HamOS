import { Tool, GoogleGenAI } from '@google/genai';
import { treasury } from '../treasury/Treasury';
import { eventBus } from '../nervous/EventBus';

export interface BrainConfig {
  id: string;
  name: string;
  model: string;
  systemInstruction?: string;
  tools?: Tool[];
  toolImplementations?: Record<string, Function>;
}

export abstract class BaseBrain {
  protected config: BrainConfig;

  constructor(config: BrainConfig) {
    this.config = config;
  }

  /**
   * Enhanced callAI using shared Treasury
   */
  public async callAI(prompt: string, history: any[] = []): Promise<string> {
    const startTime = Date.now();
    let currentKey = '';
    
    try {
      const selection = await treasury.getClient({ model: this.config.model });
      if (!selection) throw new Error("Treasury could not provide a client.");

      const { client, key, model: targetModel } = selection;
      currentKey = key;

      // Use any to bypass weird linter mismatch if necessary, but try to use it correctly
      const model = (client as any).getGenerativeModel({
        model: targetModel,
        systemInstruction: this.config.systemInstruction,
        tools: this.config.tools,
      });

      let currentMessages: any[] = [
        ...history,
        { role: 'user', parts: [{ text: prompt }] }
      ];

      let finalResponse = '';

      for (let turn = 0; turn < 10; turn++) {
        const result = await model.generateContent({ contents: currentMessages });
        const response = result.response;
        const calls = response.functionCalls();

        if (calls && calls.length > 0) {
          currentMessages.push({ role: 'model', parts: calls.map(fc => ({ functionCall: fc })) });
          const functionResponsesParts = [];
          for (const call of calls) {
            eventBus.emit('capability.invoked', { tool: call.name, args: call.args });
            if (this.config.toolImplementations?.[call.name]) {
              const callResult = await this.config.toolImplementations[call.name](call.args);
              functionResponsesParts.push({ functionResponse: { name: call.name, response: callResult } });
              eventBus.emit('capability.completed', { tool: call.name });
            } else {
              functionResponsesParts.push({ functionResponse: { name: call.name, response: { error: 'Tool not implemented' } } });
              eventBus.emit('capability.failed', { tool: call.name, error: 'Not implemented' });
            }
          }
          currentMessages.push({ role: 'user', parts: functionResponsesParts });
        } else {
          finalResponse = response.text();
          break;
        }
      }

      treasury.reportSuccess(currentKey, 1000); // Record estimated tokens for now
      return finalResponse || 'No response';

    } catch (error: any) {
      if (currentKey) treasury.reportFailure(currentKey);
      console.error(`[${this.config.id}] AI call failed:`, error.message);
      throw error;
    }
  }
}
