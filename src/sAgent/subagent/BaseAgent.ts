/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { GoogleGenAI, Tool } from '@google/genai';
import { SupremeClient } from '../../services/supremeClient';
import { useRateLimitStore } from '../../store/rateLimitStore';
import { hamliCoreMemory } from './SharedMemory';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemInstruction: string;
  apiKeys: string[]; // List of API keys (primary first, fallbacks later)
}

export class BaseAgent {
  private config: AgentConfig;
  private ai: GoogleGenAI;
  private tools: Tool[];
  private toolImplementations: Record<string, Function>;
  private currentKeyIndex = 0;

  constructor(config: AgentConfig, tools: Tool[] = [], toolImplementations: Record<string, Function> = {}) {
    this.config = config;
    this.tools = tools;
    this.toolImplementations = toolImplementations;

    if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
      throw new Error(`[${config.id}] CRITICAL: No API keys provided.`);
    }

    // Inisialisasi client dengan API Key pertama (Utama)
    this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
  }

  /**
   * Mengambil memory kolektif sebelum eksekusi
   */
  private getCollectiveMemory(): string {
    const memory = hamliCoreMemory.getAllMemory();
    return JSON.stringify(memory, null, 2);
  }

  /**
   * Menyimpan memory hasil eksekusi ke core
   */
  private async updateCollectiveMemory(key: string, value: any) {
    hamliCoreMemory.save(key, value);
    // Auto-persist in background
    setTimeout(() => hamliCoreMemory.persist(), 500);
  }

  /**
   * UTILITY: Retries a function with backoff for rate limits and rotates API keys
   */
  private async withRetry<T>(fn: () => Promise<T>, additionalRetries = 3): Promise<T> {
    const totalRetries = this.config.apiKeys.length + additionalRetries;
    let lastError: any;
    for (let i = 0; i < totalRetries; i++) {
      try {
        return await fn();
      } catch (e: any) {
        lastError = e;
        const msg = e.message?.toLowerCase() || '';
        
        if (
          msg.includes('429') || 
          msg.includes('quota') || 
          msg.includes('api key not valid') ||
          msg.includes('403') ||
          msg.includes('400') ||
          msg.includes('invalid api key')
        ) {
          console.warn(`[${this.config.id}] API Key rotation triggered: ${e.message}`);
          
          this.currentKeyIndex++;
          if (this.currentKeyIndex < this.config.apiKeys.length) {
            console.log(`[${this.config.id}] Switching to backup API key at offset ${this.currentKeyIndex}.`);
            // Switch key
            this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[this.currentKeyIndex] });
            // Retry immediately with the new key!
            continue; 
          } else {
             // Reset index and fall back to exponential backoff
             this.currentKeyIndex = 0;
             this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
             const baseDelay = 15000; // Minimal 15s to let quota breathe
             // using (i - this.config.apiKeys.length) for backoff multiplier
             const retryCount = Math.max(0, i - this.config.apiKeys.length);
             const delay = Math.pow(2, retryCount) * baseDelay;
             console.warn(`[${this.config.id}] ALL KEYS EXHAUSTED. Cooling down swarm for ${delay / 1000}s...`);
             await new Promise(resolve => setTimeout(resolve, delay));
             continue;
          }
        }
        throw e;
      }
    }
    throw lastError;
  }

  private async executeToolImplementation(name: string, args: any): Promise<any> {
    if (this.toolImplementations[name]) {
        return await this.toolImplementations[name](args);
    }
    throw new Error(`Tool ${name} implementation not found.`);
  }

  /**
   * Mengeksekusi task dengan mekanisme Fallback (Pro -> Flash) + Retries
   */
  public async executeTask(prompt: string): Promise<string> {
    console.log(`[${this.config.id} - ${this.config.name}] Memulai task...`);
    
    // [SUPREME PROTOCOL] Auto-extract AST context if a file path is mentioned
    // Architect Bypass: Skip AST extraction in Node.js to avoid local network deadlocks during audit.
    let enhancedPrompt = prompt;
    if (typeof window !== 'undefined') {
      const fileMatch = prompt.match(/(?:\/src\/|server\.ts)[a-zA-Z0-9_./-]+/);
      if (fileMatch) {
        const filePath = fileMatch[0];
        console.log(`[${this.config.id}] Mendeteksi target file: ${filePath}. Mengekstrak Semantic Context via SupremeClient...`);
        try {
          const semanticContext = await SupremeClient.getSemanticContext(filePath);
          const dependencies = await SupremeClient.traceDependencies(filePath);
          if (semanticContext) {
            enhancedPrompt += `\n\n[SUPREME AST CONTEXT INJECTED]\nDependencies: ${JSON.stringify(dependencies)}\nSemantic Structure: ${JSON.stringify(semanticContext)}`;
          }
        } catch (_e) {
          console.warn(`[${this.config.id}] Gagal mengekstrak AST context, melanjutkan tanpa context tambahan.`);
        }
      }
    }

    const collectiveContext = this.getCollectiveMemory();
    const systemInstructionWithMemory = `${this.config.systemInstruction}\n\n[HAMLI SHARED MEMORY CONTEXT]\n${collectiveContext}`;

    const runWithModel = async (model: string, textPrompt: string) => {
      return await this.withRetry(async () => {
        let currentMessages: any[] = [{ role: 'user', parts: [{ text: textPrompt }] }];
        let finalResponseText = '';
        
        // Loop for tool execution
        for (let turn = 0; turn < 10; turn++) {
            // Track API Request for global limiter
            useRateLimitStore.getState().recordRequest();

            const toolsConfig = this.tools.length > 0 ? this.tools : undefined;
            const result = await this.ai.models.generateContent({
                model: model,
                contents: currentMessages,
                config: {
                    systemInstruction: { parts: [{ text: systemInstructionWithMemory }] },
                    tools: toolsConfig as any
                }
            });
            
            const calls = result.functionCalls || [];
            
            if (calls && calls.length > 0) {
               currentMessages.push({
                   role: 'model',
                   parts: calls.map(fc => ({ functionCall: fc }))
               });
               
               const functionResponsesParts = [];
               for (const call of calls) {
                   const funcName = call.name;
                   const args = call.args;
                   let callResult: any;
                   try {
                       callResult = await this.executeToolImplementation(funcName, args) || { success: true };
                   } catch (e: any) {
                       callResult = { error: e.message || 'Unknown error' };
                   }
                   functionResponsesParts.push({
                       functionResponse: {
                           name: funcName,
                           response: callResult
                       }
                   });
               }
               
               currentMessages.push({
                   role: 'user',
                   parts: functionResponsesParts
               });
            } else {
               finalResponseText = result.text || '';
               break;
            }
        }
        return finalResponseText;
      });
    };

    try {
      // Percobaan 1: Gunakan Gemini 3 Flash (Fast & Stable)
      console.log(`[${this.config.id}] Menggunakan mesin utama (FLASH 3)...`);
      return await runWithModel('gemini-3-flash-preview', enhancedPrompt);
    } catch (error: unknown) {
      const err = error as Error;
      console.warn(`[${this.config.id}] Mesin FLASH 3 gagal (${err.message}). Beralih ke mesin fallback (FLASH 2.5)...`);
      
      try {
        // Percobaan 2: Gunakan Gemini 2.5 Flash jika 3 Flash gagal
        return await runWithModel('gemini-2.5-flash', prompt);
      } catch (fallbackError: unknown) {
        const fallErr = fallbackError as Error;
        console.error(`[${this.config.id}] Mesin FALLBACK juga gagal:`, fallErr);
        throw new Error(`Agent ${this.config.id} mengalami kegagalan sistem total: ${fallErr.message} (Cause: ${fallErr.name})`);
      }
    }
  }

  public getId(): string {
    return this.config.id;
  }
}
