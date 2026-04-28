/* eslint-disable no-useless-assignment */
// [STABILITY] Promise chains verified
import { GoogleGenAI } from "@google/genai";
import { geminiKeyManager } from "./geminiKeyManager";
import { safeStorage } from "../utils/storage";
import { resilienceEngine } from "./ResilienceEngine";
import { AiWorkerService } from "./aiWorkerService";

interface ModelStats {
  name: string;
  maxQuota: number;
  remainingQuota: number;
  replenishRate: number; // Quota replenished per millisecond
  lastUpdated: number;
  tier: number; // Base priority tier
}

export class HamEngineQuantumService {
  private static instance: HamEngineQuantumService;
  
  // Smart Quota Tracking System
  // Tier determines base priority. Quota percentage determines dynamic priority.
  private models: ModelStats[] = [
    { name: 'gemini-3.1-pro-preview', maxQuota: 100000, remainingQuota: 100000, replenishRate: 100000 / 86400000, lastUpdated: Date.now(), tier: 3.1 },
    { name: 'gemini-3-flash-preview', maxQuota: 500000, remainingQuota: 500000, replenishRate: 500000 / 86400000, lastUpdated: Date.now(), tier: 3.0 },
    { name: 'gemini-1.5-flash-latest', maxQuota: 1000000, remainingQuota: 1000000, replenishRate: 1000000 / 86400000, lastUpdated: Date.now(), tier: 2.5 }
  ];

  private constructor() {}

  public static getInstance(): HamEngineQuantumService {
    if (!HamEngineQuantumService.instance) {
      HamEngineQuantumService.instance = new HamEngineQuantumService();
    }
    return HamEngineQuantumService.instance;
  }

  private quotaLock: Promise<void> = Promise.resolve();

  private async withQuotaLock<T>(fn: () => T | Promise<T>): Promise<T> {
      let release: () => void;
      const nextLock = new Promise<void>(resolve => { release = resolve; });
      const currentLock = this.quotaLock;
      this.quotaLock = currentLock.then(() => nextLock).catch(() => nextLock);
      
      try {
          await currentLock;
          return await fn();
      } finally {
          release!();
      }
  }

  private updateQuotas() {
    const now = Date.now();
    for (const model of this.models) {
      const elapsed = now - model.lastUpdated;
      model.remainingQuota = Math.min(model.maxQuota, model.remainingQuota + (elapsed * model.replenishRate));
      model.lastUpdated = now;
    }
  }

  private getBestModel(): ModelStats {
    this.updateQuotas();
    
    const aiMode = safeStorage.getItem('ham_ai_mode') || 'deep';
    let preferredModelName = 'gemini-3-flash-preview';
    if (aiMode === 'thinking') preferredModelName = 'gemini-1.5-flash-latest';
    else if (aiMode === 'fast') preferredModelName = 'gemini-1.5-flash-latest';
    
    // Check if preferred model exists and has quota
    const preferredModel = this.models.find(m => m.name === preferredModelName);
    if (preferredModel && (preferredModel.remainingQuota / preferredModel.maxQuota) > 0.15) {
        return preferredModel;
    }
    
    let bestModel = this.models[0];
    let bestScore = -Infinity;

    for (const model of this.models) {
      const quotaPercentage = model.remainingQuota / model.maxQuota;
      
      const penalty = quotaPercentage < 0.15 ? -500 : 0; 
      
      const score = (model.tier * 100) + (quotaPercentage * 100) + penalty;
      
      if (score > bestScore) {
        bestScore = score;
        bestModel = model;
      }
    }

    return bestModel;
  }

  private deductQuota(modelName: string, estimatedTokens: number) {
    const model = this.models.find(m => m.name === modelName);
    if (model) {
      model.remainingQuota = Math.max(0, model.remainingQuota - estimatedTokens);
    }
  }

  private handleRateLimit(modelName: string) {
    const model = this.models.find(m => m.name === modelName);
    if (model) {
      model.remainingQuota = 0; // Force switch on next request
      model.lastUpdated = Date.now();
    }
  }

  /**
   * Hard Looking & Smart Rolling Singularity Execution
   * Automatically rotates models intelligently based on quota and tier.
   */
  public async generateContentStream(
    contents: any[],
    systemInstruction: string,
    onChunk: (text: string) => void,
    signal?: AbortSignal,
    tools?: any[]
  ): Promise<{ text: string, functionCalls?: any[] }> {
    let lastError: Error & { status?: number } | null = null;
    
    // Ensure SUPREME PROTOCOL is included
    let finalSystemInstruction = systemInstruction;
    if (!finalSystemInstruction.includes("SUPREME PROTOCOL")) {
        finalSystemInstruction += "\n\n[SYSTEM REMINDER: SUPREME PROTOCOL v21.0 & HAM ENGINE APEX V5.0 ACTIVE. ZERO-GUESSWORK. ANTI-PANGKAS. SELF-HEALING. NO PLACEHOLDERS. COMPLETE FIXES ONLY. READ STRUKTUR.]";
    }

    const inputString = JSON.stringify(contents) + finalSystemInstruction;
    const estimatedInputTokens = Math.ceil(inputString.length / 3.5);

    const maxAttempts = this.models.length; 
    const attemptedModels = new Set<string>();

    for (let i = 0; i < maxAttempts; i++) {
      let currentModel = await this.withQuotaLock(() => {
          let model = this.getBestModel();
          if (attemptedModels.has(model.name)) {
             const availableModels = this.models.filter(m => !attemptedModels.has(m.name));
             if (availableModels.length === 0) return model;
             
             let fallbackScore = -Infinity;
             for (const m of availableModels) {
                 const qp = m.remainingQuota / m.maxQuota;
                 const sc = (m.tier * 100) + (qp * 100) - (qp < 0.15 ? 500 : 0);
                 if (sc > fallbackScore) {
                     fallbackScore = sc;
                     model = m;
                 }
             }
          }
          // Deduct input quota immediately to ensure parallel agents don't pile up on the same model if quota is low
          this.deductQuota(model.name, estimatedInputTokens);
          return model;
      });

      attemptedModels.add(currentModel.name);
      
      let success = false;
      let finalFullText = '';
      let functionCalls: any[] = [];
      
      try {
          if (signal?.aborted) throw new Error('ABORTED');

          const result = await AiWorkerService.generateStream({
            model: currentModel.name,
            contents: contents,
            config: {
              systemInstruction: finalSystemInstruction,
              temperature: 0.7, 
              topK: 40,
              topP: 0.95,
              tools: tools
            }
          }, (chunkText, groundingMetadata, fnCalls) => {
             if (chunkText) {
                 finalFullText += chunkText;
                 onChunk(finalFullText);
             }
             if (fnCalls && fnCalls.length > 0) {
                 functionCalls = fnCalls;
             }
          });
          
          if (signal?.aborted) throw new Error('ABORTED');
          
          success = true;
          finalFullText = result.text;
          if (result.functionCalls && result.functionCalls.length > 0) {
              functionCalls = result.functionCalls;
          }

      } catch (error: any) {
          const err = error as Error & { status?: number };
          lastError = err;
          // AiWorkerService already handles retries and key rotation.
          // If it fails here, it means the model/provider is truly unavailable or exhausted.
          // We continue to try the next model in the quantum pool.
      }

      if (success) {
        const estimatedOutputTokens = Math.ceil(finalFullText.length / 3.5);
        await this.withQuotaLock(() => this.deductQuota(currentModel.name, estimatedOutputTokens));
        return { text: finalFullText, functionCalls: functionCalls.length > 0 ? functionCalls : undefined };
      } else {
        await this.withQuotaLock(() => {
            if (lastError?.status === 429 || lastError?.status === 403 || lastError?.message?.toLowerCase().includes('quota') || lastError?.message?.toLowerCase().includes('rate limit')) {
                 this.handleRateLimit(currentModel.name);
            } else {
                 this.deductQuota(currentModel.name, currentModel.maxQuota * 0.2); 
            }
        });
      }
    }

    throw new Error(`Ham Engine Quantum Singularity Collapse: All DNA strands failed. Last error: ${lastError?.message}`);
  }
}

export const hamEngineQuantum = HamEngineQuantumService.getInstance();
