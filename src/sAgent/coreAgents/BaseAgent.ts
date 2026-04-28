/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { GoogleGenAI, Tool } from '@google/genai';
import { SupremeClient } from '../../services/supremeClient';
import { useRateLimitStore } from '../../store/rateLimitStore';
import { KeyRotator } from './KeyRotator';
import { analyzeRisk } from '../capabilities/RiskAnalyzer';

export interface AgentConfig {
  id: string;
  name: string;
  role: string;
  systemInstruction: string;
  apiKeys: string[]; // Final built queue
  priorityKeys?: string[]; // Original agent-specific priority keys
}

export class BaseAgent {
  private config: AgentConfig;
  private ai: GoogleGenAI;
  private tools: Tool[];
  private toolImplementations: Record<string, Function>;

  constructor(config: AgentConfig, tools: Tool[] = [], toolImplementations: Record<string, Function> = {}) {
    this.config = config;
    this.tools = tools;
    this.toolImplementations = toolImplementations;

    // Ensure we have a valid queue
    if (!this.config.apiKeys || this.config.apiKeys.length === 0) {
      throw new Error(`[${config.id}] CRITICAL: No API keys provided.`);
    }

    // Inisialisasi client dengan API Key pertama (Utama)
    this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
  }

  /**
   * UTILITY: Retries a function with backoff for rate limits and rotates API keys
   * [SUPREME PROTOCOL 7-TIER]: No local retry on same key if error occurs, rotate instantly.
   */
  protected async withRetry<T>(fn: () => Promise<T>, modelAlias: string): Promise<T> {
    try {
      // Execute the task once. 
      // User requested: "jangan mencoba mengulang di model yang sama saat terkena erorr apapun pada model"
      return await fn();
    } catch (e: any) {
      const msg = e.message?.toLowerCase() || '';
      
      // Treat any error as a rotation signal to be safe and fast as per user request
      const failedKey = this.config.apiKeys[0];
      console.warn(`[${this.config.id}] [FAILOVER] Model ${modelAlias} failed. Key: ${failedKey.substring(0, 10)}... Error: ${e.message}`);
      
      // [INTELLIGENT ROTATION] Penalize key globally and rebuild local queue
      KeyRotator.getInstance().reportFailure(failedKey);
      this.config.apiKeys = KeyRotator.getInstance().getCombinedQueue(this.config.priorityKeys || []);
      
      // Re-initialize client if possible, but throw to let the fallback chain proceed
      if (this.config.apiKeys.length > 0) {
        this.ai = new GoogleGenAI({ apiKey: this.config.apiKeys[0] });
      }
      
      throw e; // Standard fallback chain will catch this
    }
  }

  private async executeToolImplementation(name: string, args: any): Promise<any> {
    if (this.toolImplementations[name]) {
        return await this.toolImplementations[name](args);
    }
    throw new Error(`Tool ${name} implementation not found.`);
  }

  /**
   * Mengeksekusi task dengan mekanisme Fallback 9-Tier (Pro 3.1 -> Flash 3 -> Flash 1.5 -> Flash 2.0 -> Pro 2.0 -> Pro 1.5 -> Flash Lite 3.1 -> Flash 2.5 -> Pro 2.5)
   */
  public async executeTask(prompt: string): Promise<string> {
    console.log(`[${this.config.id} - ${this.config.name}] Memulai task (SUPREME 9-TIER PROTOCOL)...`);
    
    // Risk Analysis Integration
    const risk = analyzeRisk(prompt);
    let riskPromptPrefix = '';
    if (risk.shouldEscalate) {
      console.warn(`[${this.config.id}] [HIGH RISK DETECTED] Patterns: ${risk.patterns.join(', ')}`);
      riskPromptPrefix = `[HIGH RISK TASK - ESCALATION RECOMMENDED] `;
    }

    let enhancedPrompt = riskPromptPrefix + prompt;
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

    const runWithModel = async (model: string, textPrompt: string) => {
      return await this.withRetry(async () => {
        let currentMessages: any[] = [{ role: 'user', parts: [{ text: textPrompt }] }];
        let finalResponseText = '';
        
        let lastToolCallSignature = '';
        let consecutiveSameCalls = 0;

        // --- SUPREME MANUAL OVERRIDE INJECTION ---
        let currentSystemInstruction = this.config.systemInstruction;
        if (typeof window !== 'undefined') {
           const globalSupremeOverride = localStorage.getItem('ham_supreme_agent_instruction');
           if (globalSupremeOverride && globalSupremeOverride.trim().length > 0) {
               currentSystemInstruction = `[SUPREME OVERRIDE LAW - ABSOLUTE PRIORITY]\n${globalSupremeOverride}\n\n[ORIGINAL IDENTITY]\n${currentSystemInstruction}`;
           }
        } else {
           // Backend context: Use static cross-layer storage file synced by UI
           try {
             // We map to absolute path at runtime or rely on a known backend route/state
             const fs = require('fs');
             const path = require('path');
             const overridePath = path.join(process.cwd(), '.supreme_override_command');
             if (fs.existsSync(overridePath)) {
                const globalSupremeOverride = fs.readFileSync(overridePath, 'utf-8');
                if (globalSupremeOverride && globalSupremeOverride.trim().length > 0) {
                   currentSystemInstruction = `[SUPREME OVERRIDE LAW - ABSOLUTE PRIORITY]\n${globalSupremeOverride}\n\n[ORIGINAL IDENTITY]\n${currentSystemInstruction}`;
                }
             }
           } catch(e) {}
        }
        // ------------------------------------------

        for (let turn = 0; turn < 10; turn++) {
            useRateLimitStore.getState().recordRequest();

            const toolsConfig = this.tools.length > 0 ? this.tools : undefined;
            const result = await this.ai.models.generateContent({
                model: model,
                contents: currentMessages,
                config: {
                    systemInstruction: currentSystemInstruction,
                    tools: toolsConfig as any
                }
            });
            
            const calls = result.functionCalls || [];
            
            if (calls && calls.length > 0) {
               const currentSignature = JSON.stringify(calls.map(c => ({ n: c.name, a: c.args })));
               if (currentSignature === lastToolCallSignature) {
                   consecutiveSameCalls++;
                   if (consecutiveSameCalls >= 3) {
                       console.warn(`[${this.config.id}] Recursive loop detected on tool calls. Breaking turn.`);
                       finalResponseText = "System halted: Recursive tool call loop detected.";
                       break;
                   }
               } else {
                   consecutiveSameCalls = 0;
               }
               lastToolCallSignature = currentSignature;

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
        
        KeyRotator.getInstance().reportSuccess(this.config.apiKeys[0]);
        return finalResponseText;
      }, model);
    };

    const fallbackModels = [
      'gemini-3.1-pro-preview',
      'gemini-3-flash-preview',
      'gemini-1.5-flash',
      'gemini-2.0-flash',
      'gemini-2.0-pro-exp-02-05',
      'gemini-1.5-pro',
      'gemini-3.1-flash-lite-preview-02-05',
      'gemini-2.5-flash', // Lapisan ke-8
      'gemini-2.5-pro'   // Lapisan ke-9
    ];

    const executeWithChain = async (retryAll = false): Promise<string> => {
        let lastErr: any;
        for (const model of fallbackModels) {
            try {
                console.log(`[${this.config.id}] Attempting with: ${model}...`);
                return await runWithModel(model, retryAll ? prompt : enhancedPrompt);
            } catch (e: any) {
                lastErr = e;
                continue; // Instant switch to next tier
            }
        }
        throw lastErr;
    };

    try {
      return await executeWithChain();
    } catch (error: any) {
      console.error(`[${this.config.id}] FULL 9-TIER CHAIN FAILED. Performing one final emergency retry...`);
      try {
          // Final Emergency retry logic (one more pass through entire chain as per user: "jika semua gagal baru lakukan retri dengan cepat sekali lagi saja")
          return await executeWithChain(true); 
      } catch (ultimateError: any) {
          throw new Error(`Agent ${this.config.id} TOTAL SYSTEM FAILURE after 9-tier recursive retry: ${ultimateError.message}`);
      }
    }
  }

  public getId(): string {
    return this.config.id;
  }
}
