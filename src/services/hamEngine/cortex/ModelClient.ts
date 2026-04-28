/* eslint-disable no-useless-assignment */
import { Content } from '@google/genai';
import { AiWorkerService } from '../../aiWorkerService';

export class ModelClient {
  constructor(private modelName: string, private history: Content[]) {}

  public async callWithBackoff(config: any, signal?: AbortSignal): Promise<any> {
    try {
      const response = await AiWorkerService.generateContent({
        model: this.modelName,
        contents: this.history,
        config: config.generationConfig || config,
        tools: config.tools,
        toolConfig: config.toolConfig
      });

      return {
        text: response.text,
        candidates: [{ 
          content: { parts: [{ text: response.text }] },
          functionCalls: response.functionCalls
        }],
        functionCalls: response.functionCalls
      };
    } catch (error) {
      console.error('[ModelClient] AI Call failed:', error);
      throw error;
    }
  }
}
