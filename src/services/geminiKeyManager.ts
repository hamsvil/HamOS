/* eslint-disable no-useless-assignment */
import { GoogleGenAI } from "@google/genai";
import { safeStorage } from "../utils/storage";
import { EnvironmentChecker } from "../services/environmentChecker";
import { nativeBridge } from "../utils/nativeBridge";
import { KMSProxy } from "./kmsProxy";

import { neuralRouter, AIProvider, ModelConfig } from "./NeuralRouter";

// Backward compatibility wrapper
class GeminiKeyManager {
  public getApiKey(): string {
    return neuralRouter.getApiKey(AIProvider.GEMINI);
  }

  public getCurrentKey(): string {
    return this.getApiKey();
  }

  public markKeyExhausted(key: string) {
    neuralRouter.markKeyExhausted(key);
  }

  public rotateKey(key?: string) {
    const keyToExhaust = key || this.getCurrentKey();
    if (keyToExhaust) {
      neuralRouter.markKeyExhausted(keyToExhaust);
    }
  }

  public getClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  public getGenAIClient(): GoogleGenAI {
    const apiKey = this.getApiKey();
    return new GoogleGenAI({ apiKey });
  }

  public async executeWithRetry<T>(
    operation: (client: GoogleGenAI, apiKey: string) => Promise<T>,
    timeoutMs: number = 600000,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const config: ModelConfig = {
      provider: AIProvider.GEMINI,
      model: 'gemini-2.0-flash'
    };

    return neuralRouter.executeWithGenAIRetry(
      async (clients, apiKey) => {
        if (clients.gemini) return operation(clients.gemini, apiKey);
        console.warn('[GeminiKeyManager] executeWithRetry: All Gemini keys exhausted.');
        throw new Error("No Gemini API key available. Please configure a Gemini API key in Settings → AI Configuration.");
      },
      config,
      timeoutMs,
      abortSignal
    );
  }

  public async executeWithGenAIRetry<T>(
    operation: (client: GoogleGenAI, apiKey: string) => Promise<T>,
    timeoutMs: number = 600000,
    abortSignal?: AbortSignal
  ): Promise<T> {
    const config: ModelConfig = {
      provider: AIProvider.GEMINI,
      model: 'gemini-2.0-flash'
    };

    return neuralRouter.executeWithGenAIRetry(
      async (clients, apiKey) => {
        if (clients.gemini) return operation(clients.gemini, apiKey);
        console.warn('[GeminiKeyManager] executeWithGenAIRetry: All Gemini keys exhausted.');
        throw new Error("No Gemini API key available. Please configure a Gemini API key in Settings → AI Configuration.");
      },
      config,
      timeoutMs,
      abortSignal
    );
  }
}

export const geminiKeyManager = new GeminiKeyManager();
export { neuralRouter };
export type { AIProvider, ModelConfig };
