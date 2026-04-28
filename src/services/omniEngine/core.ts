/* eslint-disable no-useless-assignment */
import { GoogleGenAI, Content, GenerateContentResponse, Tool, FunctionDeclaration } from '@google/genai';
import { OmniMode, OmniState, OmniToolName, ToolkitType } from './types';
import { getToolkitByName } from './toolRegistry';
import { ToolHandlers } from './toolHandlers';
import { geminiKeyManager } from '../geminiKeyManager';
import { OmniSecurity } from './omniSecurity';

// ============================================================================
// OMNI-ENGINE V7: HYPERVISOR & SINGULARITY LOOP
// ============================================================================

export class OmniEngine {
  private state: OmniState;
  private history: Content[] = [];
  private ai: GoogleGenAI;
  private modelName: string;

  constructor(mode: OmniMode = 'deep', initialHistory: Content[] = []) {
    this.state = {
      mode,
      activeToolkit: 'base',
      historyLength: 0,
      lastErrorCount: 0,
      lastErrorType: null,
      isSandboxed: true,
      currentTask: null,
      totalTokensUsed: 0
    };

    this.history = initialHistory;

    // Initialize Gemini Client
    const apiKey = geminiKeyManager.getCurrentKey();
    if (!apiKey) throw new Error('No Gemini API key available.');
    this.ai = new GoogleGenAI({ apiKey });

    // Mode Selection (Asymmetric Arsenal)
    switch (mode) {
      case 'fast':
        this.modelName = 'gemini-2.5-flash';
        break;
      case 'thinking':
        this.modelName = 'gemini-2.5-flash';
        break;
      case 'deep':
      default:
        this.modelName = 'gemini-2.5-pro';
        break;
    }
  }

  /**
   * The Singularity Loop: The core autonomous execution cycle.
   */
  public async executeTask(prompt: string, onStep?: (step: any) => void): Promise<string> {
    this.state.currentTask = prompt;
    
    if (onStep) {
      onStep({ id: 'init', type: 'thought', label: `Initializing Omni-Engine (${this.state.mode} mode)`, status: 'running', progress: 5 });
    }

    
    // Initial Context with Architecture Constitution
    this.history.push({
      role: 'user',
      parts: [{ text: `You are the Omni-Engine V8, an advanced AI collaborator. 
IMPORTANT: You are currently in a CONVERSATIONAL state. 
- If the user is just chatting, asking questions, or discussing ideas, RESPOND CONVERSATIONALLY. Do NOT create files, do NOT build projects, and do NOT use tools unless explicitly requested.
- If the user explicitly asks you to build, create, or modify a project, ONLY THEN should you use your tools to execute the task autonomously.

User Input: ${prompt}

${OmniSecurity.getSystemConstitution()}` }]
    });

    let isFinished = false;
    let finalSummary = '';
    let loopCount = 0;
    const MAX_LOOPS = 50; // Circuit Breaker

    while (!isFinished && loopCount < MAX_LOOPS) {
      loopCount++;
      const currentProgress = Math.min(10 + (loopCount / MAX_LOOPS) * 80, 90);
      const stepId = `step-${loopCount}`;
      
      if (onStep) {
        onStep({ id: stepId, type: 'thought', label: `Reasoning Step ${loopCount}`, status: 'running', progress: currentProgress });
      }

      try {
        // Token Guillotine Check
        if (this.state.totalTokensUsed > OmniSecurity.MAX_TOKENS_PER_TASK) {
          if (onStep) onStep({ id: stepId, type: 'error', label: 'Token Guillotine Triggered', status: 'error' });
          return `[SYSTEM HALTED]: Token Guillotine triggered. Exceeded ${OmniSecurity.MAX_TOKENS_PER_TASK} tokens to prevent financial hemorrhage.`;
        }

        // 1. Decide (Call Gemini)
        const response = await this.callGeminiWithBackoff();
        
        // Rough token estimation (chars / 4)
        const responseText = response.text || '';
        this.state.totalTokensUsed += Math.floor(responseText.length / 4);
        const functionCalls = response.functionCalls;
        if (functionCalls) {
           this.state.totalTokensUsed += functionCalls.length * 50; // rough estimate
        }
        
        // Add model response to history
        this.history.push({
          role: 'model',
          parts: response.candidates?.[0]?.content?.parts || []
        });

        // 2. Check for Finish or Text Response
        if (!functionCalls || functionCalls.length === 0) {
          // If no tools called, assume finished or needs user input
          isFinished = true;
          finalSummary = response.text || 'Task completed with no final summary.';
          if (onStep) onStep({ id: stepId, type: 'thought', label: 'Task Completed', status: 'completed', progress: 100, details: [finalSummary] });
          break;
        }

        // 3. Act (Execute Tools in Parallel)
        const toolResponses = await Promise.all(
          functionCalls.map(async (call, idx) => {
            const name = call.name;
            const args = call.args as any;
            
            if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executing ${name}`, status: 'running', details: [JSON.stringify(args)] });

            // Handle Meta Tools Internally
            if (name === OmniToolName.LOAD_CONTEXTUAL_TOOLKIT) {
              this.state.activeToolkit = args.toolkitName as ToolkitType;
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: [`Toolkit switched to ${args.toolkitName}`] });
              return { name, response: { output: `Toolkit switched to ${args.toolkitName}` } };
            }
            if (name === OmniToolName.FINISH_TASK) {
              isFinished = true;
              finalSummary = args.summary;
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: [finalSummary] });
              return { name, response: { output: 'Task marked as finished.' } };
            }
            if (name === OmniToolName.UPGRADE_ENGINE_CORE) {
              // The Evolution Pipeline (Shadow Cloning)
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: ['Evolution Pipeline Initiated'] });
              return { name, response: { output: `[EVOLUTION PIPELINE INITIATED]: Shadow clone created for testing. Awaiting human approval for transplant. (Status: PENDING_HUMAN_APPROVAL)` } };
            }

            // Execute Real Tools
            const result = await ToolHandlers.executeTool(name, args);
            
            // Linter Gatekeeper Logic & Circuit Breaker
            if (name === OmniToolName.LINT_APPLET && !result.success) {
              this.state.lastErrorCount++;
              if (OmniSecurity.checkCircuitBreaker(this.state.lastErrorCount)) {
                // Graceful Degradation (Discard ShadowVFS)
                try {
                  const { shadowVFS } = await import('../hamEngine/kernel/ShadowVFS');
                  await shadowVFS.rollback();
                  result.output += '\n[SYSTEM]: Circuit Breaker Triggered. You failed to fix this 3 times. The system has rolled back Shadow VFS to revert your broken changes. I am halting execution to prevent further damage. Please review the errors and decide how to proceed.';
                } catch (e) {
                  result.output += '\n[SYSTEM]: Circuit Breaker Triggered, but rollback failed.';
                }
                this.state.lastErrorCount = 0; // Reset after breaker trips
                isFinished = true; // Halt execution
              }
            } else if (result.success) {
              this.state.lastErrorCount = 0; // Reset on success
            }

            if (onStep) {
               const status = result.success ? 'completed' : 'error';
               onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status, details: [result.output] });
            }

            return { name, response: { output: result.output, success: result.success } };
          })
        );

        // 4. Observe (Feed results back to Gemini)
        this.history.push({
          role: 'user',
          parts: toolResponses.map(tr => ({
            functionResponse: {
              name: tr.name,
              response: tr.response
            }
          }))
        });

      } catch (error: any) {
        console.error('[OmniEngine] Loop Error:', error);
        // Feed error back to model to self-heal
        this.history.push({
          role: 'user',
          parts: [{ text: `[SYSTEM ERROR]: ${error.message}. Please correct your approach.` }]
        });
      }
    }

    if (loopCount >= MAX_LOOPS) {
      return `[SYSTEM HALTED]: Maximum loop count (${MAX_LOOPS}) reached. Task incomplete.`;
    }

    return finalSummary;
  }

  /**
   * Smart Exponential Backoff for API Limits
   */
  private async callGeminiWithBackoff(): Promise<GenerateContentResponse> {
    let retries = 0;
    const maxRetries = 5;

    while (retries < maxRetries) {
      try {
        const tools = getToolkitByName(this.state.activeToolkit);
        
        const result = await this.ai.models.generateContent({ 
          model: this.modelName,
          contents: this.history,
          config: {
            tools: tools.length > 0 ? [{ functionDeclarations: tools as any }] : undefined,
          }
        });
        return result as any;
      } catch (error: any) {
        if (error.status === 429 || error.message?.includes('429')) {
          retries++;
          geminiKeyManager.markKeyExhausted(geminiKeyManager.getCurrentKey()!);
          
          // Exponential backoff with jitter
          const baseDelay = 2000 * Math.pow(2, retries);
          const jitter = Math.random() * 1000;
          const delay = baseDelay + jitter;
          
          console.warn(`[OmniEngine] Rate limit hit. Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Refresh key
          this.ai = new GoogleGenAI({ apiKey: geminiKeyManager.getCurrentKey()! });
        } else {
          throw error;
        }
      }
    }
    throw new Error('Max retries reached for API limits.');
  }
}
