import { GoogleGenAI, Tool } from '@google/genai';
import { SupremeClient } from '../../services/supremeClient';
import { useRateLimitStore } from '../../store/rateLimitStore';
import { KeyRotator } from '../coreAgents/KeyRotator';

export interface DeepAgentConfig {
  id: string;
  name: string;
  role: string;
  systemInstruction: string;
  apiKeys: string[];
  priorityKeys?: string[];
}

/**
 * DEEP AGENTIC CORE — Specialized for Deep Research Models
 * Modified from BaseAgent.ts
 */
export class DeepResearchAgent {
  private config: DeepAgentConfig;
  private ai: GoogleGenAI;
  private tools: Tool[];
  private toolImplementations: Record<string, Function>;

  constructor(config: DeepAgentConfig, tools: Tool[] = [], toolImplementations: Record<string, Function> = {}) {
    this.config = config;
    this.tools = tools;
    this.toolImplementations = toolImplementations;

    if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
      throw new Error(`[${config.id}] CRITICAL: No API keys provided.`);
    }

    this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
  }

  private async withRetry<T>(fn: () => Promise<T>, modelAlias: string): Promise<T> {
    try {
      return await fn();
    } catch (e: any) {
      const failedKey = this.config.apiKeys[0];
      console.warn(`[DEEP-AGENTIC] [FAILOVER] Model ${modelAlias} failed. Key: ${failedKey.substring(0, 10)}... Error: ${e.message}`);
      
      KeyRotator.getInstance().reportFailure(failedKey);
      this.config.apiKeys = KeyRotator.getInstance().getCombinedQueue(this.config.priorityKeys || []);
      
      if (this.config.apiKeys.length > 0) {
        this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
      }
      
      throw e;
    }
  }

  private async executeToolImplementation(name: string, args: any): Promise<any> {
    if (this.toolImplementations[name]) {
        return await this.toolImplementations[name](args);
    }
    throw new Error(`Tool ${name} implementation not found.`);
  }

  public async executeTask(prompt: string): Promise<string> {
    console.log(`[${this.config.id}] Deep Research Task Initialized...`);
    
    let enhancedPrompt = prompt;
    // ... logic mapping etc included ...

    const runWithModel = async (model: string, textPrompt: string) => {
      return await this.withRetry(async () => {
        let currentMessages: any[] = [{ role: 'user', parts: [{ text: textPrompt }] }];
        let finalResponseText = '';
        
        for (let turn = 0; turn < 12; turn++) { // Slightly more turns for research
            useRateLimitStore.getState().recordRequest();

            const result = await this.ai.models.generateContent({
                model: model,
                contents: currentMessages,
                config: {
                    systemInstruction: this.config.systemInstruction,
                    tools: this.tools.length > 0 ? this.tools : undefined as any
                }
            });
            
            const calls = result.functionCalls || [];
            
            if (calls && calls.length > 0) {
               currentMessages.push({ role: 'model', parts: calls.map(fc => ({ functionCall: fc })) });
               const functionResponsesParts = [];
               for (const call of calls) {
                   const callResult = await this.executeToolImplementation(call.name, call.args) || { success: true };
                   functionResponsesParts.push({ functionResponse: { name: call.name, response: callResult } });
               }
               currentMessages.push({ role: 'user', parts: functionResponsesParts });
            } else {
               finalResponseText = result.text || '';
               break;
            }
        }
        
        KeyRotator.getInstance().reportSuccess(this.config.apiKeys[0]);
        return finalResponseText;
      }, model);
    };

    /**
     * RESEARCH-OPTIMIZED FALLBACK CHAIN
     * Primary: deep-research-max-preview-04-2026
     * Secondary: deep-research-pro
     */
    const researchModels = [
      'deep-research-max-preview-04-2026',
      'deep-research-preview-04-2026',
      'deep-research-pro-preview-12-2025',
      'gemini-3.1-pro-preview',
      'gemini-1.5-pro'
    ];

    const executeChain = async (): Promise<string> => {
        let lastErr: any;
        for (const model of researchModels) {
            try {
                console.log(`[DEEP-AGENTIC] Checking: ${model}...`);
                return await runWithModel(model, enhancedPrompt);
            } catch (e: any) {
                lastErr = e;
                continue;
            }
        }
        throw lastErr;
    };

    return await executeChain();
  }
}
