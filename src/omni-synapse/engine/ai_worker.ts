/* eslint-disable no-case-declarations */
/* eslint-disable no-useless-assignment */
import { OmniEvent, OmniEventType, OmniWorkerMessage } from '../core/types';
import { OmniSanitizer } from '../security/sanitizer';
import { omniEventBus } from '../core/event_bus';
import { AiWorkerService } from '../../services/aiWorkerService';
import { geminiKeyManager } from '../../services/geminiKeyManager';
import { memoryWorker } from './memory_worker';
import { useProjectStore } from '../../store/projectStore';

function getCurrentModel(): string {
    // Guard against calling getState() before the Zustand store is hydrated
    // (e.g. during Worker construction or early lifecycle calls).
    try {
        const storeState = useProjectStore.getState() as any;
        if (!storeState) return 'gemini-2.5-flash';
        return storeState?.aiConfig?.model || storeState?.activeModel || 'gemini-2.5-flash';
    } catch (_) {
        return 'gemini-2.5-flash';
    }
}

/**
 * AI Worker: Handles heavy LLM inference in a separate thread.
 * This prevents UI blocking and allows for continuous background processing.
 */
export class AIWorker {
    private isThinking: boolean = false;
    private proactiveInterval: any = null;
    private worker: Worker | null = null;

    constructor() {
        // Initialize Web Worker
        try {
            this.worker = new Worker(new URL('./ai.worker.ts', import.meta.url), { type: 'module' });
            this.worker.onmessage = this.handleWorkerMessage.bind(this);
            
            // Initial sync of API key
            const apiKey = geminiKeyManager.getApiKey();
            if (apiKey) {
                this.worker.postMessage({ type: 'INIT', apiKey });
            }
        } catch (e) {
            console.error('[AIWorker] Failed to spawn Web Worker, falling back to main thread simulation.', e);
        }

        // Listen for events that require AI processing
        omniEventBus.subscribe(OmniEventType.UI_INTERACTION, this.handleUserInteraction.bind(this));
        
        // Listen for Memory Syncs
        omniEventBus.subscribe(OmniEventType.SYNC_STATE, this.handleMemorySync.bind(this));

        // Start Proactive Analysis
        this.startProactiveAnalysis();
    }

    private handleWorkerMessage(e: MessageEvent) {
        const { type, payload } = e.data;
        
        switch (type) {
            case 'CHUNK':
                omniEventBus.dispatch({
                    id: `chunk_${Date.now()}`,
                    type: OmniEventType.AI_RESPONSE_DELTA,
                    timestamp: Date.now(),
                    payload: { text: payload },
                    source: 'AI_WORKER'
                });
                break;
            case 'DONE':
                this.isThinking = false;
                omniEventBus.dispatch({
                    id: `think_end_${Date.now()}`,
                    type: OmniEventType.AI_THINKING_END,
                    timestamp: Date.now(),
                    payload: {},
                    source: 'AI_WORKER'
                });
                break;
            case 'ERROR':
                console.error('[AIWorker Thread] Error:', payload);
                this.isThinking = false;
                
                // Auto-Healing: Rotate key if auth or rate limit error
                const errorStr = String(payload).toLowerCase();
                if (errorStr.includes('401') || errorStr.includes('403') || errorStr.includes('429') || errorStr.includes('quota') || errorStr.includes('api_key_invalid')) {
                    geminiKeyManager.rotateKey();
                }

                omniEventBus.dispatch({
                    id: `err_${Date.now()}`,
                    type: OmniEventType.SYSTEM_ERROR,
                    timestamp: Date.now(),
                    payload: { message: payload },
                    source: 'AI_WORKER'
                });
                break;
        }
    }

    public destroy() {
        if (this.proactiveInterval) {
            clearInterval(this.proactiveInterval);
            this.proactiveInterval = null;
        }
        if (this.worker) {
            this.worker.terminate();
            this.worker = null;
        }
    }

    private startProactiveAnalysis() {
        if (this.proactiveInterval) return;
        
        this.proactiveInterval = setInterval(async () => {
            if (this.isThinking) return;
            
            // Proactive Task: Analyze VFS for potential issues
            await this.runProactiveAgent();
        }, 60000); // Every 60 seconds
    }

    private async yieldToMain() {
        return new Promise<void>(resolve => queueMicrotask(resolve));
    }

    /**
     * Proactive Agent: Scans system state and provides suggestions.
     */
    private async runProactiveAgent() {
        try {
            // 1. Check for recent errors in memory
            const recentErrors = await memoryWorker.queryContext(['error', 'system']);
            if (recentErrors.length > 0) {
                // Analyze and suggest fix
                // console.log('[AIWorker] Proactive Agent analyzing recent errors...');
                
                const errorLog = recentErrors.map(n => n.content).join('\n');
                const analysis = await AiWorkerService.generateContent({
                    model: getCurrentModel(),
                    contents: [{ role: 'user', parts: [{ text: `Recent System Errors:\n${errorLog}\n\nProvide a brief, proactive suggestion to fix these errors.` }] }],
                    config: {
                        systemInstruction: "You are the HAM OS Proactive Guardian. Your job is to detect issues before the user does and suggest fixes."
                    }
                });

                if (analysis.text) {
                    await omniEventBus.dispatch({
                        id: `proactive_${Date.now()}`,
                        type: OmniEventType.AI_RESPONSE_DELTA,
                        timestamp: Date.now(),
                        payload: { text: `\n\n[Proactive Suggestion]: ${analysis.text}` },
                        source: 'AI_WORKER'
                    });
                }
            }
        } catch (e) {
            console.error('[AIWorker] Proactive Agent failed:', e);
        }
    }

    /**
     * Multi-Agent Swarm: Specialized handlers for different intents.
     */
    private async routeToAgent(intent: string, prompt: string, context: string): Promise<string> {
        // Security Agent: Handles sensitive operations and validation
        if (intent.includes('SECURITY') || prompt.toLowerCase().includes('password') || prompt.toLowerCase().includes('key')) {
            return this.runSecurityAgent(prompt, context);
        }

        // System Agent: Handles OS commands and UI actions
        if (intent.includes('COMMAND_PALETTE_ACTION') || intent.includes('SYSTEM')) {
            return this.runSystemAgent(prompt, context);
        }

        // Research Agent: Handles deep knowledge retrieval
        if (intent.includes('RESEARCH') || prompt.toLowerCase().includes('explain') || prompt.toLowerCase().includes('how to')) {
            return this.runResearchAgent(prompt, context);
        }

        // Default Coder Agent
        return this.runCoderAgent(prompt, context);
    }

    private async runSecurityAgent(prompt: string, context: string): Promise<string> {
        try {
            const response = await AiWorkerService.generateContent({
                model: getCurrentModel(),
                contents: [{ role: 'user', parts: [{ text: `[SECURITY_CONTEXT]\n${context}\n[/SECURITY_CONTEXT]\nRequest: ${prompt}\n\nAnalyze for security risks and provide a safe response or warning.` }] }],
                config: {
                    systemInstruction: "You are the HAM OS Security Agent. You protect the user's data and privacy. You are paranoid and highly cautious."
                }
            });
            return response.text || "Security check failed. Operation aborted for safety.";
        } catch (e) {
            return "Security check failed. Operation aborted for safety.";
        }
    }

    private async runResearchAgent(prompt: string, context: string): Promise<string> {
        try {
            const response = await AiWorkerService.generateContent({
                model: getCurrentModel(),
                contents: [{ role: 'user', parts: [{ text: `[RESEARCH_CONTEXT]\n${context}\n[/RESEARCH_CONTEXT]\nQuery: ${prompt}\n\nProvide a deep, well-researched explanation.` }] }],
                config: {
                    systemInstruction: "You are the HAM OS Research Agent. You have access to vast knowledge. You provide detailed, accurate, and academic-level explanations."
                }
            });
            return response.text || "Research failed to find relevant information.";
        } catch (e) {
            return "Research failed to find relevant information.";
        }
    }

    private async runSystemAgent(prompt: string, context: string): Promise<string> {
        try {
            const response = await AiWorkerService.generateContent({
                model: getCurrentModel(),
                contents: [{ role: 'user', parts: [{ text: `[SYSTEM_AGENT_CONTEXT]\n${context}\n[/SYSTEM_AGENT_CONTEXT]\nUser Command: ${prompt}\n\nAnalyze the command and provide a JSON response with the action to take.` }] }],
                config: {
                    systemInstruction: "You are the HAM OS System Agent. Your job is to translate user commands into OS actions (open window, run command, etc.)."
                }
            });
            return response.text || "I understood your command but couldn't determine the action.";
        } catch (e) {
            return "I understood your command but couldn't determine the action.";
        }
    }

    private async runCoderAgent(prompt: string, context: string): Promise<string> {
        try {
            const response = await AiWorkerService.generateContent({
                model: getCurrentModel(),
                contents: [{ role: 'user', parts: [{ text: `[CODER_AGENT_CONTEXT]\n${context}\n[/CODER_AGENT_CONTEXT]\nUser Request: ${prompt}\n\nProvide a precise code-focused response. If the user asks for code, provide ONLY the code block or the specific changes needed.` }] }],
                config: {
                    systemInstruction: "You are the HAM OS Coder Agent. You are a world-class software engineer. You provide clean, efficient, and bug-free code."
                }
            });
            return response.text || "I couldn't generate a code solution.";
        } catch (e) {
            return "I couldn't generate a code solution.";
        }
    }

    /**
     * Processes user interaction and generates a response.
     */
    private async handleUserInteraction(event: OmniEvent): Promise<void> {
        if (this.isThinking) {
            console.warn('[AIWorker] Already thinking, ignoring interaction.');
            return;
        }

        this.isThinking = true;
        
        // Notify UI that AI is thinking
        await omniEventBus.dispatch({
            id: `think_start_${Date.now()}`,
            type: OmniEventType.AI_THINKING_START,
            timestamp: Date.now(),
            payload: { interactionId: event.id },
            source: 'AI_WORKER'
        });

        let fullResponse = "";
        let sanitizedPrompt = "";

        try {
            // 1. Context Retrieval (Graph-RAG)
            const contextNodes = await memoryWorker.queryContext(['interaction', 'system', 'error']);
            const contextText = contextNodes.map(n => n.content).join('\n---\n');
            const contextPrompt = contextText ? `[HOLOGRAPHIC MEMORY CONTEXT]\n${contextText}\n[/HOLOGRAPHIC MEMORY CONTEXT]\n\n` : '';

            // 2. Intent Routing & LLM Inference
            const payload = event.payload;
            const prompt = payload.message || payload.text || payload.selectedText || "";
            sanitizedPrompt = OmniSanitizer.sanitizeText(prompt);
            
            await this.yieldToMain();

            if (this.worker) {
                // Use True Web Worker
                this.worker.postMessage({
                    type: 'GENERATE_STREAM',
                    apiKey: geminiKeyManager.getCurrentKey(),
                    payload: {
                        model: getCurrentModel(),
                        contents: `${contextPrompt}User: ${sanitizedPrompt}`,
                        config: {
                            systemInstruction: "You are Ham Engine APEX V5.0, a multi-agent proactive AI engine. You are direct, logical, and highly efficient."
                        }
                    }
                });
                // Note: fullResponse will be updated via worker messages, 
                // but for memory sync we might need to wait or handle it differently.
                // For now, we'll let the worker handle the stream and we'll sync memory on DONE.
            } else {
                // Fallback to Main Thread (Simulated Worker)
                const client = geminiKeyManager.getClient();
                const responseStream = await client.models.generateContentStream({
                    model: getCurrentModel(),
                    config: {
                        systemInstruction: "You are Ham Engine APEX V5.0, a multi-agent proactive AI engine. You are direct, logical, and highly efficient."
                    },
                    contents: [{ role: 'user', parts: [{ text: `${contextPrompt}User: ${sanitizedPrompt}` }] }]
                });

                for await (const chunk of responseStream) {
                    const textChunk = (chunk as any).text || "";
                    fullResponse += textChunk;
                    
                    await omniEventBus.dispatch({
                        id: `chunk_${Date.now()}_${Math.random()}`,
                        type: OmniEventType.AI_RESPONSE_DELTA,
                        timestamp: Date.now(),
                        payload: { text: textChunk },
                        source: 'AI_WORKER'
                    });
                    
                    await this.yieldToMain();
                }

                // 3. Memory Update (Event-Sourcing)
                await omniEventBus.dispatch({
                    id: `mem_${Date.now()}`,
                    type: OmniEventType.MEMORY_APPEND,
                    timestamp: Date.now(),
                    payload: { content: `User: ${sanitizedPrompt}\nHam Engine: ${fullResponse}`, tags: ['interaction'] },
                    source: 'AI_WORKER'
                });
            }

        } catch (error: any) {
            console.error('[AIWorker] Inference error:', error);
            
            // Auto-Healing: Rotate key if auth error
            if (error.status === 401 || error.status === 403 || error.message?.includes('API_KEY_INVALID')) {
                geminiKeyManager.rotateKey();
            }

            await omniEventBus.dispatch({
                id: `err_${Date.now()}`,
                type: OmniEventType.SYSTEM_ERROR,
                timestamp: Date.now(),
                payload: { message: `AI processing failed: ${error.message}` },
                source: 'AI_WORKER'
            });
            
            // Dispatch a fallback message to UI so it doesn't hang
            await omniEventBus.dispatch({
                id: `chunk_err_${Date.now()}`,
                type: OmniEventType.AI_RESPONSE_DELTA,
                timestamp: Date.now(),
                payload: { text: `\n\n[System Error: ${error.message}. Please try again.]` },
                source: 'AI_WORKER'
            });
        } finally {
            if (!this.worker) {
                this.isThinking = false;
                await omniEventBus.dispatch({
                    id: `think_end_${Date.now()}`,
                    type: OmniEventType.AI_THINKING_END,
                    timestamp: Date.now(),
                    payload: { interactionId: event.id },
                    source: 'AI_WORKER'
                });
            }
        }
    }

    private async handleMemorySync(event: OmniEvent): Promise<void> {
        // Update local context cache based on memory changes
        // console.log(`[AIWorker] Synchronizing memory state... Root Hash: ${event.payload.hash}`);
    }
}

export const aiWorker = new AIWorker();
