/* eslint-disable no-useless-assignment */
/* eslint-disable no-control-regex */
import { HybridRouter } from './HybridRouter';
import { ContextCompressor } from './ContextCompressor';
import { SingularityBridge } from './SingularityBridge';
import { CircuitBreaker } from './CircuitBreaker';
import { ContextPayload, OrchestratorConfig, RouteDecision, AIRequest, AIResponse } from './types';
import { vectorStore } from '../../vectorStore';
import { GoogleGenAI, Type } from '@google/genai';
import { webLlmService } from '../../webLlmService';
import { executeShellCommand } from '../../shellService';

/**
 * Orchestrator — Central AI Routing & Context Management
 *
 * FIX #8: GoogleGenAI instances di-cache per apiKey di Map (tidak dibuat ulang tiap request).
 * FIX #4 (companion): Meneruskan isLocalLlmReady ke HybridRouter.determineRoute().
 */
export class Orchestrator {
  private static instance: Orchestrator;
  private router: HybridRouter;
  private compressor: ContextCompressor;
  private bridge: SingularityBridge;
  private circuitBreaker: CircuitBreaker;

  // FIX #8: Cache GoogleGenAI per sanitized apiKey — tidak buat ulang tiap request
  private readonly aiClientCache: Map<string, GoogleGenAI> = new Map();

  constructor(config: OrchestratorConfig) {
    this.router = new HybridRouter(config.maxTokensBeforeLocal);
    this.compressor = new ContextCompressor(config.maxTokensBeforeCompression);
    this.bridge = new SingularityBridge();
    this.circuitBreaker = new CircuitBreaker(
      config.circuitBreakerThreshold,
      config.circuitBreakerResetTimeoutMs,
    );
    Orchestrator.instance = this;
  }

  public static getInstance(): Orchestrator {
    if (!Orchestrator.instance) {
      Orchestrator.instance = new Orchestrator({
        maxTokensBeforeLocal: 2000,
        maxTokensBeforeCompression: 4000,
        circuitBreakerThreshold: 5,
        circuitBreakerResetTimeoutMs: 30000,
      });
    }
    return Orchestrator.instance;
  }

  // FIX #8: Ambil atau buat cached GoogleGenAI instance dengan LRU mechanism
  private getAiClient(apiKey: string): GoogleGenAI {
    const existing = this.aiClientCache.get(apiKey);
    if (existing) {
      // Move to end to mark as recently used
      this.aiClientCache.delete(apiKey);
      this.aiClientCache.set(apiKey, existing);
      return existing;
    }
    
    // LRU Eviction if cache is too large (e.g., > 10)
    if (this.aiClientCache.size >= 10) {
      const oldestKey = this.aiClientCache.keys().next().value;
      if (oldestKey) this.aiClientCache.delete(oldestKey);
    }
    
    const client = new GoogleGenAI({ apiKey });
    this.aiClientCache.set(apiKey, client);
    return client;
  }

  public async routeRequest(request: AIRequest): Promise<AIResponse> {
    const userMessage =
      request.messages[request.messages.length - 1]?.content || '';
    const historyArray = Array.isArray(request.messages) ? request.messages : [];
    const history = historyArray.slice(0, -1);

    const { decision, finalContext, result } = await this.processRequest(
      userMessage,
      history,
      false,
      async (decision, context) => {
        const rawKey =
          request.apiKey || import.meta.env.VITE_GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env.GEMINI_API_KEY : undefined) || (import.meta as any).env?.GEMINI_API_KEY;
        const apiKey = rawKey
          ?.trim()
          .replace(/[\s\n\r\t\x00-\x1F\x7F]/g, '');
        if (!apiKey)
          throw new Error(
            'No API Key provided or key is invalid after sanitization',
          );

        // FIX #8: Use cached client instead of new GoogleGenAI every call
        const ai = this.getAiClient(apiKey);
        const model = request.cloudModel || decision.modelId;

        const shellTool = {
          functionDeclarations: [
            {
              name: 'run_shell_command',
              description:
                'Execute a shell command on the server system. Use this to list files, check system status, or perform file operations.',
              parameters: {
                type: Type.OBJECT,
                properties: {
                  command: {
                    type: Type.STRING,
                    description:
                      'The shell command to execute (e.g., "ls -la", "pwd", "cat package.json")',
                  },
                },
                required: ['command'],
              },
            },
          ],
        };

        const response = await ai.models.generateContent({
          model,
          contents: context.map((c) => ({
            role: c.role === 'system' ? 'user' : c.role,
            parts: [{ text: c.content }],
          })),
          config: {
            systemInstruction: request.systemInstruction,
            temperature: request.temperature,
            tools: [shellTool],
          },
        });

        // Handle Function Calling
        const functionCalls = response.functionCalls;
        if (functionCalls && functionCalls.length > 0) {
          const call = functionCalls[0];
          if (call.name === 'run_shell_command') {
            const { command } = call.args as { command: string };
            const shellResult = await executeShellCommand(command);
            const output = shellResult.output;

            const secondResponse = await ai.models.generateContent({
              model,
              contents: [
                ...context.map((c) => ({
                  role: c.role === 'system' ? 'user' : c.role,
                  parts: [{ text: c.content }],
                })),
                {
                  role: 'model',
                  parts: [{ functionCall: call }],
                },
                {
                  role: 'user',
                  parts: [
                    {
                      functionResponse: {
                        name: 'run_shell_command',
                        response: { output },
                      },
                    },
                  ],
                },
              ],
              config: {
                systemInstruction: request.systemInstruction,
                temperature: request.temperature,
                tools: [shellTool],
              },
            });

            return secondResponse.text || '';
          }
        }

        return response.text || '';
      },
    );

    return {
      text: result,
      decision,
      finalContext,
    };
  }

  private async checkNetworkStatus(): Promise<boolean> {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return false;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const response = await fetch('https://1.1.1.1/cdn-cgi/trace', {
        mode: 'no-cors',
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      return response.type === 'opaque' || response.ok;
    } catch {
      // If the ping fails, assume online if navigator.onLine is true
      // to avoid forcing all traffic to local-llm in environments that block 1.1.1.1
      if (typeof navigator !== 'undefined') return navigator.onLine;
      return true;
    }
  }

  public async processRequest<T>(
    userMessage: string,
    history: ContextPayload[],
    includeActiveTabContext: boolean = false,
    executor?: (
      decision: RouteDecision,
      context: ContextPayload[],
    ) => Promise<T>,
  ): Promise<{
    decision: RouteDecision;
    finalContext: ContextPayload[];
    result?: T;
  }> {
    let contextToCompress: ContextPayload[] = [...history];

    // 1. Memory Retrieval: Fetch relevant context from VectorStore
    try {
      const relevantDocs = await vectorStore.search(userMessage, 3);
      if (relevantDocs.length > 0) {
        const memoryParts = await Promise.all(
          relevantDocs.map(async (doc) => {
            const content = await vectorStore.getDocumentContent(doc.path);
            return `[Memory: ${doc.path} (Score: ${doc.score.toFixed(2)})]\n${content || '(Content unavailable)'}`;
          }),
        );
        const memoryContext = memoryParts.join('\n---\n');
        contextToCompress.unshift({
          role: 'system',
          content: `[Relevant Memory Context Found]\n${memoryContext}`,
          timestamp: Date.now(),
        });
      }
    } catch (e) {
      console.error('Memory retrieval failed:', e);
    }

    // 2. Singularity Bridge: Inject DOM context if requested
    if (includeActiveTabContext) {
      const snapshot = await this.bridge.getActiveTabSnapshot();
      if (snapshot) {
        const extractedText = await this.bridge.extractContext(snapshot);
        contextToCompress.unshift({
          role: 'system',
          content: `[Active Tab Context: ${snapshot.title} - ${snapshot.url}]\n${extractedText}`,
          timestamp: Date.now(),
        });
      }
    }

    // 3. Context Compression
    const compressionResult =
      await this.compressor.compress(contextToCompress);
    let finalContext = compressionResult.content;

    // 3.1 Summarization of dropped context (Self-Healing Memory)
    if (compressionResult.dropped.length > 0 && executor) {
      try {
        const summaryPrompt = `Summarize the following conversation history concisely to preserve context for the next turn. Focus on key decisions, facts, and user preferences:\n\n${compressionResult.dropped.map((m) => `[${m.role}]: ${m.content}`).join('\n')}`;
        const summaryDecision: RouteDecision = {
          provider: 'gemini-cloud',
          modelId: 'gemini-2.5-flash',
          reason: 'Context summarization',
          estimatedTokens: this.compressor.estimateTokens(summaryPrompt),
        };
        const summary = await executor(summaryDecision, [
          { role: 'user', content: summaryPrompt, timestamp: Date.now() },
        ]);
        if (summary && typeof summary === 'string') {
          finalContext.unshift({
            role: 'system',
            content: `[Summary of Previous Context]\n${summary}`,
            timestamp: Date.now(),
          });
        }
      } catch (e) {
        console.warn(
          'Context summarization failed, proceeding with pruned context:',
          e,
        );
      }
    }

    if (compressionResult.compressionRatio < 1) {
      finalContext.unshift({
        role: 'system',
        content: `[Context Compressed - Ratio: ${compressionResult.compressionRatio.toFixed(2)}]`,
        timestamp: Date.now(),
      });
    }

    const userPayload: ContextPayload = {
      role: 'user',
      content: userMessage,
      timestamp: Date.now(),
    };
    finalContext.push(userPayload);

    const totalTokens = this.compressor.estimateTokens(
      finalContext.map((c) => c.content).join('\n'),
    );

    // 4. Hybrid Routing with localLlmReady check
    const isNetworkOnline = await this.checkNetworkStatus();
    const isCloudApiRateLimited = !this.circuitBreaker.canExecute();

    // FIX #4: Pass actual local LLM readiness — avoids silent routing to unloaded model
    const isLocalLlmReady = webLlmService.isReady();

    const decision = await this.router.determineRoute(
      totalTokens,
      isNetworkOnline,
      isCloudApiRateLimited,
      isLocalLlmReady,
    );

    if (!executor) {
      return { decision, finalContext };
    }

    try {
      const result = await executor(decision, finalContext);
      this.recordApiSuccess();
      return { decision, finalContext, result };
    } catch (error) {
      this.recordApiFailure();
      if (
        decision.provider === 'gemini-cloud' ||
        decision.provider === 'hybrid'
      ) {
        console.warn('Cloud API failed, attempting fallback route…', error);
        const fallbackDecision = await this.router.determineRoute(
          totalTokens,
          isNetworkOnline,
          true,
          isLocalLlmReady,
        );
        // Only fall back to local if model is actually ready — otherwise rethrow
        if (fallbackDecision.provider === 'local-llm' && !isLocalLlmReady) {
          throw error;
        }
        const fallbackResult = await executor(fallbackDecision, finalContext);
        return { decision: fallbackDecision, finalContext, result: fallbackResult };
      }
      throw error;
    }
  }

  public recordApiSuccess(): void {
    this.circuitBreaker.recordSuccess();
  }

  public recordApiFailure(): void {
    this.circuitBreaker.recordFailure();
  }
}
