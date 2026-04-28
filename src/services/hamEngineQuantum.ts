/* eslint-disable no-useless-assignment */
import { GoogleGenAI } from "@google/genai";
import { geminiKeyManager } from "./geminiKeyManager";

const MODELS = [
  "gemini-3.1-pro-preview",
  "gemini-3-flash-preview"
];

class HamEngineQuantum {
  private currentModelIndex = 0;

  async generateContentStream(contents: any[], config: any) {
    let lastError: unknown;
    // Try each model in the DNA list
    for (let i = 0; i < MODELS.length; i++) {
      const modelName = MODELS[this.currentModelIndex];
      try {
        const client = geminiKeyManager.getClient();
        
        return await client.models.generateContentStream({
          model: modelName,
          contents,
          config
        });
      } catch (error: unknown) {
        lastError = error;
        const err = error as Error;
        console.warn(`[Ham Engine Quantum] Model ${modelName} failed, rolling to next singularity... (${err.message})`);
        this.currentModelIndex = (this.currentModelIndex + 1) % MODELS.length;
      }
    }
    throw lastError || new Error("[Ham Engine Quantum] All models failed.");
  }
}

export const hamEngineQuantum = new HamEngineQuantum();
