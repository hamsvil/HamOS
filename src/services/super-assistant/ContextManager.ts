/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// [STABILITY] Promise chains verified
import { ChatMessageData } from '../../components/HamAiStudio/types';
import { geminiKeyManager } from '../geminiKeyManager';
import { safeStorage } from '../../utils/storage';

export class ContextManager {
  private static instance: ContextManager;
  private memory: ChatMessageData[] = [];
  private maxTokens: number = 32000; // Configurable
  private summary: string = "";

  private constructor() {}

  public static getInstance(): ContextManager {
    if (!ContextManager.instance) {
      ContextManager.instance = new ContextManager();
    }
    return ContextManager.instance;
  }

  // 6. Long-term Memory (Simple implementation using local storage for now)
  public async loadLongTermMemory(projectId: string) {
    const saved = safeStorage.getItem(`ham_memory_${projectId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      this.memory = parsed.memory || [];
      this.summary = parsed.summary || "";
    }
  }

  public async saveLongTermMemory(projectId: string) {
    safeStorage.setItem(`ham_memory_${projectId}`, JSON.stringify({ memory: this.memory, summary: this.summary }));
  }

  // 9. Sliding Window & 43. Context Compression
  public getOptimizedContext(history: ChatMessageData[]): ChatMessageData[] {
    // 1. Filter out redundant steps and strip XML code blocks to save tokens
    const cleaned = history.map((msg, index) => {
      let content = msg.content;
      const isOld = index < history.length - 3; // Keep last 3 messages full

      if (msg.role === 'ai' || msg.role === 'assistant') {
        // Strip new XML format blocks
        content = content.replace(/<thought>[\s\S]*?<\/thought>/g, '[THOUGHT PROCESS COMPRESSED]');
        content = content.replace(/<code path="(.*?)">[\s\S]*?<\/code>/g, '[CREATED FILE: $1]');
        content = content.replace(/<edit path="(.*?)">[\s\S]*?<\/edit>/g, '[EDITED FILE: $1]');
        content = content.replace(/<step title="(.*?)">\s*(?:\[CREATED FILE: .*?\]|\[EDITED FILE: .*?\]|\s)*<\/step>/g, '[STEP EXECUTED: $1]');

        // Legacy ReAct format stripping
        if (isOld) {
            content = content.replace(/Thought: [\s\S]*?(?=Action:|Final Answer:|$)/g, 'Thought: [Optimized]\n');
            content = content.replace(/Action: [\s\S]*?(?=Observation:|$)/g, 'Action: [Optimized]\n');
            content = content.replace(/Observation: [\s\S]*?(?=Thought:|Final Answer:|$)/g, 'Observation: [Optimized]\n');
        }
      }
      
      return {
        ...msg,
        content,
        steps: msg.steps?.map(s => ({ id: s.id, type: s.type, label: s.label, status: s.status })) // Strip details
      } as ChatMessageData;
    });

    // 2. Sliding Window: Keep last 15 messages + system instructions
    const windowSize = 15;
    if (cleaned.length <= windowSize) {
        if (this.summary) {
            return [{ id: 'summary', role: 'system' as const, content: `Previous Context Summary: ${this.summary}`, timestamp: Date.now() }, ...cleaned];
        }
        return cleaned;
    }

    const systemMsgs = cleaned.filter(m => m.role === 'system');
    const recentMsgs = cleaned.slice(-windowSize);

    // Trigger async summarization of the older messages if we haven't recently
    const olderMsgs = cleaned.slice(0, -windowSize).filter(m => m.role !== 'system');
    if (olderMsgs.length > 5) {
        this.compressHistory(olderMsgs).then(newSummary => {
            if (newSummary) this.summary = newSummary;
        }).catch(console.error);
    }

    const contextWithSummary = this.summary 
        ? [{ id: 'summary', role: 'system' as const, content: `Previous Context Summary: ${this.summary}`, timestamp: Date.now() }, ...systemMsgs, ...recentMsgs]
        : [...systemMsgs, ...recentMsgs];

    return contextWithSummary;
  }

  // 43. Context Compression (Summarization - Placeholder for AI call)
  public async compressHistory(history: ChatMessageData[]): Promise<string> {
    if (history.length === 0) return this.summary;
    
    try {
        const client = geminiKeyManager.getClient();
        const historyText = history.map(m => `${m.role}: ${m.content}`).join('\n\n');
        
        const prompt = `Summarize the following conversation history concisely. Focus on the user's goals, the current state of the project, and any important decisions made. Keep it under 500 words.\n\nPrevious Summary: ${this.summary}\n\nNew History:\n${historyText}`;
        
        const result = await client.models.generateContent({
          model: 'gemini-2.5-pro',
          contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        return result.text || this.summary;
    } catch (e) {
        // Failed to compress history
        return this.summary;
    }
  }

  public addToMemory(message: ChatMessageData) {
    this.memory.push(message);
    if (this.memory.length > 100) this.memory.shift(); // Cap memory
  }
}
