/* eslint-disable no-useless-assignment */
import { neuralRouter, AIProvider } from './NeuralRouter';
import { vfs } from './vfsService';
import { AiWorkerService } from './aiWorkerService';

export interface ShadowContext {
  prompt: string;
  timestamp: number;
  speculativeResponse?: string;
  dependencyGraph?: any;
}

export class ShadowEngine {
  private static instance: ShadowEngine;
  private cache: Map<string, ShadowContext> = new Map();
  private isSpeculating: boolean = false;

  private constructor() {}

  public static getInstance(): ShadowEngine {
    if (!ShadowEngine.instance) {
      ShadowEngine.instance = new ShadowEngine();
    }
    return ShadowEngine.instance;
  }

  /**
   * Speculatively pre-compute context and potential responses for a given prompt.
   * This runs in the background while the user is typing or before they hit 'send'.
   */
  public async speculate(prompt: string) {
    if (this.isSpeculating || prompt.length < 10) return;
    if (this.cache.has(prompt)) return;

    this.isSpeculating = true;
    // console.log(`[ShadowEngine] Speculating on prompt: "${prompt.substring(0, 30)}..."`);

    try {
      // 1. Pre-fetch relevant files (Surgical Context)
      const snapshot = await vfs.getProjectSnapshot();
      const { contextInjector } = await import('./ai/contextInjector');
      const relevantFiles = await contextInjector.getSurgicalContext(prompt, snapshot.files);

      // 2. Run a fast, low-cost model to generate a "Shadow Manifest"
      const shadowPrompt = `
        PRE-COMPUTE_TASK: SHADOW_MANIFEST
        PROMPT: "${prompt}"
        RELEVANT_FILES: ${relevantFiles}
        
        Provide a 1-sentence technical strategy and a list of 3-5 likely files to be modified.
      `;

      const response = await AiWorkerService.generateContent({
        model: 'gemini-2.5-flash',
        contents: shadowPrompt,
        config: {
            temperature: 0.1,
            maxOutputTokens: 200
        }
      });

      this.cache.set(prompt, {
        prompt,
        timestamp: Date.now(),
        speculativeResponse: response.text || '',
        dependencyGraph: relevantFiles
      });

      // console.log(`[ShadowEngine] Speculation complete for: "${prompt.substring(0, 30)}..."`);
    } catch (e) {
      console.error("[ShadowEngine] Speculation failed:", e);
    } finally {
      this.isSpeculating = false;
    }
  }

  public getSpeculation(prompt: string): ShadowContext | undefined {
    return this.cache.get(prompt);
  }

  public clearCache() {
    this.cache.clear();
  }
}

export const shadowEngine = ShadowEngine.getInstance();
