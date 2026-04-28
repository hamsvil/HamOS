/* eslint-disable no-useless-assignment */
import { CompressionResult, ContextPayload } from './types';

export class ContextCompressor {
  private readonly maxTokens: number;

  constructor(maxTokens: number = 1000000) {
    this.maxTokens = maxTokens;
  }

  /**
   * Estimates token count (rough heuristic: 1 token ~ 4 chars)
   */
  public estimateTokens(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Compresses context using a Zero-Cost Sliding Window approach.
   * It prioritizes keeping the most recent messages and drops older ones
   * until the total token count is within the limit.
   */
  public async compress(payloads: ContextPayload[]): Promise<CompressionResult> {
    let totalTokens = 0;
    const tokenCounts = payloads.map(p => {
      const tokens = this.estimateTokens(`[${p.role}]: ${p.content}`);
      totalTokens += tokens;
      return tokens;
    });

    const originalTokens = totalTokens;

    if (originalTokens <= this.maxTokens) {
      return {
        originalTokens,
        compressedTokens: originalTokens,
        content: payloads,
        dropped: [],
        compressionRatio: 1,
      };
    }

    // Zero-Cost Sliding Window: Keep the newest messages
    const keptPayloads: ContextPayload[] = [];
    const droppedPayloads: ContextPayload[] = [];
    let currentTokens = 0;

    // Always try to keep the first message if it's a system prompt
    let systemPrompt: ContextPayload | null = null;
    let startIndex = 0;
    if (payloads.length > 0 && payloads[0].role === 'system') {
      systemPrompt = payloads[0];
      currentTokens += tokenCounts[0];
      startIndex = 1;
    }

    // Iterate backwards from the newest messages
    for (let i = payloads.length - 1; i >= startIndex; i--) {
      if (currentTokens + tokenCounts[i] <= this.maxTokens) {
        keptPayloads.unshift(payloads[i]);
        currentTokens += tokenCounts[i];
      } else {
        droppedPayloads.unshift(payloads[i]);
      }
    }

    if (systemPrompt) {
      keptPayloads.unshift(systemPrompt);
    }

    return {
      originalTokens,
      compressedTokens: currentTokens,
      content: keptPayloads,
      dropped: droppedPayloads,
      compressionRatio: currentTokens / originalTokens,
    };
  }
}
