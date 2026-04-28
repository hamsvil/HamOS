/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { GoogleGenAI, Content, GenerateContentResponse } from '@google/genai';
import { OmniMode, OmniState, OmniToolName, ToolkitType } from './types';
import { getToolsForMode } from './toolRegistry';
import { ToolHandlers } from './toolHandlers';
import { ToolHandlersPart2 } from './toolHandlersPart2';
import { geminiKeyManager } from '../../geminiKeyManager';
import { OmniSecurity } from '../kernel/omniSecurity';
import { OmniInquisitor } from '../inquisitor/auditor';
import { vfs } from '../../vfsService';

// ============================================================================
// OMNI-ENGINE V8.2: HYPERVISOR & SINGULARITY LOOP (CORTEX)
// ============================================================================

export class OmniEngine {
  private state: OmniState;
  private history: Content[] = [];
  private ai: GoogleGenAI;
  private modelName: string;
  private readonly STATE_FILE = '.omni/state.json';

  constructor(mode: OmniMode = 'deep', initialHistory: Content[] = []) {
    this.state = {
      mode,
      activeToolkit: 'base',
      historyLength: 0,
      lastErrorCount: 0,
      lastErrorType: null,
      isSandboxed: true,
      currentTask: null,
      currentProject: null,
      totalTokensUsed: 0
    };

    this.history = initialHistory;
    
    // Initialize Gemini Client
    const apiKey = geminiKeyManager.getCurrentKey();
    if (!apiKey) throw new Error('No Gemini API key available.');
    this.ai = new GoogleGenAI({ apiKey });

    // Mode Selection (Asymmetric Arsenal)
    switch (this.state.mode) {
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

  private async restoreState(projectName: string) {
    // Try to load persisted state
    try {
      const exists = await vfs.exists(this.STATE_FILE);
      if (exists) {
        const data = await vfs.readFile(this.STATE_FILE);
        const parsed = JSON.parse(data);
        if (parsed.state && parsed.history) {
          // Only restore if it's the same project
          if (parsed.state.currentProject === projectName) {
            this.state = { ...this.state, ...parsed.state };
            // Merge history, avoiding duplicates
            const existingContents = new Set(this.history.map(h => JSON.stringify(h.parts)));
            parsed.history.forEach((h: Content) => {
              const str = JSON.stringify(h.parts);
              if (!existingContents.has(str)) {
                this.history.push(h);
              }
            });
            
            // Prune history if too large (Anti-Bloat)
            const MAX_HISTORY_ITEMS = 20;
            if (this.history.length > MAX_HISTORY_ITEMS) {
              // console.log('[OmniEngine] Pruning history to save tokens...');
              // Keep the first system message (if any) and the last N messages
              const firstMessage = this.history[0];
              const lastMessages = this.history.slice(-MAX_HISTORY_ITEMS);
              this.history = [firstMessage, ...lastMessages];
            }

            // console.log('[OmniEngine] State restored successfully for:', projectName);
          }
        }
      }
    } catch (e) {
      console.warn('[OmniEngine] Failed to restore state:', e);
    }
  }

  /**
   * State Persistence (Anti-Amnesia): Saves the current state and history to VFS.
   */
  private async persistState(): Promise<void> {
    try {
      const data = JSON.stringify({ state: this.state, history: this.history }, null, 2);
      // Ensure directory exists (vfs.writeFile handles this if implemented, otherwise we might need to create it)
      await vfs.writeFile(this.STATE_FILE, data);
    } catch (e) {
      console.warn('[OmniEngine] Failed to persist state:', e);
    }
  }

  /**
   * The Singularity Loop: The core autonomous execution cycle.
   */
  public async executeTask(prompt: string, onStep?: (step: any) => void, projectName: string = 'Unknown Project', projectType: string = 'web', fileList: string = '', signal?: AbortSignal): Promise<string> {
    this.state.currentTask = prompt;
    this.state.currentProject = projectName;
    
    // Restore state for this specific project
    await this.restoreState(projectName);

    if (onStep) {
      onStep({ id: 'init', type: 'thought', label: `Initializing Omni-Engine (${this.state.mode} mode)`, status: 'running', progress: 5 });
    }

    // Initial Context
    const availableTools = getToolsForMode(this.state.mode, this.state.activeToolkit);
    const toolNames = availableTools.map(t => t.name).join(', ');

    this.history.push({
      role: 'user',
      parts: [{ text: `You are the Omni-Engine V8.2, an advanced AI collaborator. 
IMPORTANT: You are currently in a CONVERSATIONAL state. 
- If the user is just chatting, asking questions, or discussing ideas, RESPOND CONVERSATIONALLY. Do NOT create files, do NOT build projects, and do NOT use tools unless explicitly requested.
- If the user explicitly asks you to build, create, or modify a project, ONLY THEN should you use your tools to execute the task autonomously.

[SYSTEM STATUS]
Current Time: ${new Date().toISOString()}
Current Project: ${projectName}
Current Mode: ${this.state.mode.toUpperCase()}
Active Toolkit: ${this.state.activeToolkit.toUpperCase()}
Available Tools (${availableTools.length}): ${toolNames}
Consecutive Errors: ${this.state.lastErrorCount} (Circuit Breaker trips at 3)
Tokens Consumed: ${this.state.totalTokensUsed} / ${OmniSecurity.MAX_TOKENS_PER_TASK}

PROJECT STRUCTURE & CREATION SEQUENCE:
- Current Project Type: **${projectType.toUpperCase()}**
- MANDATORY FILE CREATION ORDER: You MUST create configuration and dependency files FIRST, followed by entry points, then components.
  * For WEB: 1. package.json -> 2. vite.config.ts/tsconfig.json -> 3. index.html -> 4. src/main.tsx -> 5. src/App.tsx -> 6. Components/Styles.
  * For ANDROID/APK: 1. android/build.gradle & android/app/build.gradle -> 2. android/app/src/main/AndroidManifest.xml -> 3. MainActivity.kt -> 4. res/layout & res/values.
- If APK/Android: Use 'android/app/src/main/java/...' and 'android/app/src/main/res/...'. DO NOT use web structure unless explicitly asked.
- If Web: Use 'src/...' and 'public/...'.
- REFLECTION PROTOCOL: Before calling any tools, you MUST briefly state your plan and critique it for potential issues (e.g., missing dependencies, race conditions, or logic gaps).
- CHAMS PROTOCOL: For tasks requiring extreme token efficiency, or when building UI/logic within the HAM OS environment, you MUST prioritize using the \`run_chams_code\` tool. cHams V5.5 is a highly compressed, reactive language designed specifically for AI. Use God-Primitives like \`OS.UI.Window\`, \`OS.VFS.Read\`, and \`OS.Sys.Exec\` to achieve complex results with minimal code.

CURRENT PROJECT FILES:
${fileList}

User Input: ${prompt}` }]
    });

    if (onStep) {
      onStep({ id: 'init', type: 'thought', label: `Omni-Engine Initialized`, status: 'completed', progress: 10 });
    }

    let isFinished = false;
    let finalSummary = '';
    let loopCount = 0;
    const MAX_LOOPS = 50; // Circuit Breaker

    while (!isFinished && loopCount < MAX_LOOPS) {
      if (signal?.aborted) {
        throw new Error('cancelled');
      }
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
        const response = await this.callGeminiWithBackoff(signal);
        
        // Improved Token Tracking: Account for input and output
        const inputTokens = JSON.stringify(this.history).length / 4;
        const responseText = response.text || '';
        const functionCalls = response.functionCalls || [];
        const outputTokens = (responseText.length / 4) + (functionCalls.length * 50);
        this.state.totalTokensUsed += Math.floor(inputTokens + outputTokens);
        
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
              // Linter Gatekeeper: Block finish if there are unresolved errors
              if (this.state.lastErrorCount > 0) {
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'error', details: ['Linter Gatekeeper blocked finish_task'] });
                return { name, response: { output: '[LINTER GATEKEEPER]: You cannot finish the task while there are unresolved errors. You MUST fix the linter/compiler errors first.' } };
              }

              // Final Quality Audit (Auto-Lint & Auto-Compile)
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Final Quality Audit`, status: 'running' });
              const lintResult = await ToolHandlersPart2.handleLintApplet();
              if (!lintResult.success) {
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Audit Failed`, status: 'error', details: [lintResult.output] });
                return { name, response: { output: `[FINAL AUDIT FAILED]: Linter found errors. Please fix them before finishing.\n${lintResult.output}` } };
              }
              
              const compileResult = await ToolHandlersPart2.handleCompileApplet();
              if (!compileResult.success) {
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Audit Failed`, status: 'error', details: [compileResult.output] });
                return { name, response: { output: `[FINAL AUDIT FAILED]: Compilation failed. Please fix the errors before finishing.\n${compileResult.output}` } };
              }

              // Anti-Blank Screen Check
              const appExists = await vfs.exists('src/App.tsx');
              if (appExists) {
                const appContent = await vfs.readFile('src/App.tsx');
                if (appContent.trim().length < 50) {
                  return { name, response: { output: '[ANTI-BLANK SCREEN]: src/App.tsx seems too empty or broken. Please ensure the main application component is properly implemented.' } };
                }
              }

              isFinished = true;
              finalSummary = args.summary;
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: [finalSummary] });
              return { name, response: { output: 'Task marked as finished and verified by Final Quality Audit.' } };
            }
            if (name === OmniToolName.UPGRADE_ENGINE_CORE) {
              // The Evolution Pipeline (Shadow Cloning & Inquisitor Audit)
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executing ${name}`, status: 'running', details: ['Evolution Pipeline Initiated'] });
              
              try {
                const shadowPath = args.shadowPath;
                if (!shadowPath) {
                   return { name, response: { output: `[EVOLUTION PIPELINE]: To upgrade the core, you must first create a shadow clone in /tmp/shadow_cortex/ using create_file, edit it, and then call UPGRADE_ENGINE_CORE again with the path to the shadow clone to trigger the Inquisitor Audit.` } };
                }

                // 1. Read Original and Mutated Code
                const targetFile = shadowPath.replace('/tmp/shadow_cortex/', '/src/services/omniEngine/cortex/');
                const originalCode = await vfs.readFile(targetFile);
                const mutatedCode = await vfs.readFile(shadowPath);

                // 2. Audit with Inquisitor
                const audit = await OmniInquisitor.auditCode(originalCode, mutatedCode);
                if (!audit.safe) {
                   return { name, response: { output: `[INQUISITOR AUDIT FAILED]: ${audit.reason}` } };
                }

                // 3. Apply Mutation (Atomic Write)
                await vfs.writeFile(targetFile, mutatedCode);
                
                return { name, response: { output: `[EVOLUTION SUCCESSFUL]: ${targetFile} has been upgraded and verified by the Inquisitor Audit.` } };
              } catch (error: any) {
                return { name, response: { output: `[EVOLUTION FAILED]: ${error.message}` } };
              }
            }

            try {
              // Execute Real Tools
              const result = await ToolHandlers.executeTool(name, args);
              
              // Linter Gatekeeper Logic & Circuit Breaker
              if (name === OmniToolName.LINT_APPLET && !result.success) {
                this.state.lastErrorCount++;
                if (OmniSecurity.checkCircuitBreaker(this.state.lastErrorCount)) {
                  // Graceful Degradation (Discard ShadowVFS)
                  try {
                    const { shadowVFS } = await import('../../hamEngine/kernel/ShadowVFS');
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
            } catch (toolError: any) {
              if (onStep) {
                 onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Failed ${name}`, status: 'error', details: [toolError.message] });
              }
              return { name, response: { output: `[TOOL ERROR]: ${toolError.message}`, success: false } };
            }
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

        // Mark the thought step as completed since the loop iteration is done
        if (onStep) {
          onStep({ id: stepId, type: 'thought', label: isFinished ? 'Task Completed' : `Reasoning Step ${loopCount} Completed`, status: 'completed', progress: isFinished ? 100 : currentProgress + 5 });
        }

        // State Persistence: Save state after every turn
        await this.persistState();

      } catch (error: any) {
        console.error('[OmniEngine] Loop Error:', error);
        
        if (onStep) {
          onStep({ id: stepId, type: 'thought', label: `Reasoning Step ${loopCount} Failed`, status: 'error', progress: currentProgress, details: [error.message] });
        }

        if (error.message === 'cancelled' || error.name === 'AbortError') {
          throw error;
        }

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
   * Smart Exponential Backoff for API Limits & Sandwich Constitution
   */
  private async callGeminiWithBackoff(signal?: AbortSignal): Promise<GenerateContentResponse> {
    let retries = 0;
    const maxRetries = 5;

    // Sandwich Constitution: Append the constitution to the last user message
    const historyCopy = [...this.history];
    const lastMessage = historyCopy[historyCopy.length - 1];
    if (lastMessage && lastMessage.role === 'user') {
      const parts = [...lastMessage.parts];
      // Check if it's a text part, if so append, otherwise add a new text part
      const lastPart = parts[parts.length - 1];
      const telemetry = `\n\n[REAL-TIME TELEMETRY]\nProject: ${this.state.currentProject}\nConsecutive Errors: ${this.state.lastErrorCount}/3\nTokens Used: ${this.state.totalTokensUsed}/${OmniSecurity.MAX_TOKENS_PER_TASK}\nActive Toolkit: ${this.state.activeToolkit.toUpperCase()}`;
      if (lastPart && lastPart.text) {
        parts[parts.length - 1] = { text: lastPart.text + telemetry + '\n\n' + OmniSecurity.getSystemConstitution() };
      } else {
        parts.push({ text: telemetry + '\n\n' + OmniSecurity.getSystemConstitution() });
      }
      historyCopy[historyCopy.length - 1] = { ...lastMessage, parts };
    }

    while (retries < maxRetries) {
      try {
        const tools = getToolsForMode(this.state.mode, this.state.activeToolkit);
        
        if (signal?.aborted) throw new Error('cancelled');
        
        const result = await this.ai.models.generateContent({
          model: this.modelName,
          contents: historyCopy, // Use the sandwiched history
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
