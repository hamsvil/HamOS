import { Content } from '@google/genai';
import { HamState } from './types';
import { GET_AGENTIC_SYSTEM_PROMPT } from '../../../constants/prompts';

export class ContextManager {
  constructor(private state: HamState, private history: Content[]) {}

  public getSystemInstruction(toolNames: string, projectType: string, fileList: string): string {
    return GET_AGENTIC_SYSTEM_PROMPT(toolNames, projectType, fileList);
  }

  public injectDynamicTelemetry(limit: number): { originalText: string, index: number } {
    return { originalText: '', index: -1 };
  }

  public restoreOriginalText(index: number, text: string): void {
    // Restore logic
  }

  public prune(history: Content[]): Content[] {
    return history;
  }
}
