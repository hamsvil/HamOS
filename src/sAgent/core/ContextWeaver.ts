import { memory } from '../memory/Memory';

/**
 * ContextWeaver - Assembles history, memory, and relevant files
 */
export class ContextWeaver {
  public async weave(input: string): Promise<string> {
    const history = memory.short.getContext();
    const longTerm = memory.long.recall(input); // Simplified vector recall mock

    let context = `--- RECENT HISTORY ---\n${JSON.stringify(history)}\n`;
    if (longTerm) {
      context += `\n--- LONG TERM KNOWLEDGE ---\n${longTerm}\n`;
    }

    return `${context}\n\nUSER INPUT: ${input}`;
  }
}
