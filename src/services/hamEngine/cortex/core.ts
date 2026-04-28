 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { Content } from '@google/genai';
import { AI_MODELS } from '../../../constants/aiModels';
import { HamMode, HamState, HamToolName } from './types';
import { getToolsForMode } from './toolRegistry';
import { HamSecurity } from '../kernel/hamSecurity';
import { StatePersister } from './StatePersister';
import { ErrorRecovery } from './ErrorRecovery';
import { ToolExecutor } from './ToolExecutor';
import { ContextManager } from './ContextManager';
import { ModelClient } from './ModelClient';

// ============================================================================
// HAM ENGINE V8.2: HYPERVISOR & SINGULARITY LOOP (CORTEX)
// ============================================================================

export class HamEngine {
  private state: HamState;
  private history: Content[] = [];
  private modelName: string;
  private statePersister: StatePersister;
  private toolExecutor: ToolExecutor;
  private contextManager: ContextManager;
  private modelClient: ModelClient;

  public static async checkUnfinishedTask(projectName: string): Promise<string | null> {
    const persister = new StatePersister();
    return await persister.checkUnfinishedTask(projectName);
  }

  constructor(mode: HamMode = 'deep', initialHistory: Content[] = []) {
    this.statePersister = new StatePersister();
    this.state = {
      mode,
      activeToolkit: 'coder',
      historyLength: 0,
      lastErrorCount: 0,
      lastErrorType: null,
      isSandboxed: false,
      currentTask: '',
      currentProject: '',
      totalTokensUsed: 0,
      memoryContext: [],
      executionHistory: [],
      isFinished: false
    };

    this.history = initialHistory;
    this.modelName = mode === 'fast' ? AI_MODELS.DEFAULT_TEXT : (mode === 'thinking' ? AI_MODELS.FALLBACK : AI_MODELS.COMPLEX_TEXT);
    
    this.toolExecutor = new ToolExecutor(this.state);
    this.contextManager = new ContextManager(this.state, this.history);
    this.modelClient = new ModelClient(this.modelName, this.history);
  }

  private async restoreState(projectName: string) {
    const { state, history } = await this.statePersister.restoreState(projectName, this.state, this.history);
    this.state = state;
    this.history = history;
    this.contextManager = new ContextManager(this.state, this.history);
    this.modelClient = new ModelClient(this.modelName, this.history);
  }

  private async persistState(): Promise<void> {
    await this.statePersister.persistState(this.state, this.history);
  }

  public async executeTask(prompt: string, onStep?: (step: any) => void, projectName: string = 'Unknown Project', projectType: string = 'web', fileList: string = '', signal?: AbortSignal): Promise<string> {
    this.state.currentTask = prompt;
    this.state.isFinished = false;
    this.state.currentProject = projectName;

    await this.restoreState(projectName);

    if (onStep) onStep({ id: 'init', type: 'thought', label: `Initializing Ham Engine`, status: 'running', progress: 5 });

    this.history.push({ role: 'user', parts: [{ text: prompt }] });

    let loopCount = 0;
    const MAX_LOOPS = 500;
    const isComplex = prompt.length > 500 || prompt.toLowerCase().includes('refactor');
    const dynamicTokenLimit = HamSecurity.getDynamicTokenLimit(fileList.length, isComplex, this.state.mode);

    while (!this.state.isFinished && loopCount < MAX_LOOPS) {
      if (signal?.aborted) throw new Error('cancelled');
      loopCount++;
      const stepId = `step-${loopCount}`;
      
      if (onStep) onStep({ id: stepId, type: 'thought', label: `Reasoning Step ${loopCount}`, status: 'running', progress: Math.min(10 + (loopCount / MAX_LOOPS) * 80, 90) });

      try {
        if (this.state.totalTokensUsed > dynamicTokenLimit) return `[SYSTEM HALTED]: Token limit exceeded.`;

        const availableTools = getToolsForMode(this.state.mode, this.state.activeToolkit, this.state.isSandboxed);
        const config = {
          tools: availableTools.length > 0 ? [{ functionDeclarations: availableTools }] : undefined,
          systemInstruction: this.contextManager.getSystemInstruction(availableTools.map(t => t.name).join(', '), projectType, fileList),
          thinkingConfig: this.state.mode === 'thinking' ? { thinkingLevel: 'HIGH' } : undefined
        };

        const { originalText, index } = this.contextManager.injectDynamicTelemetry(dynamicTokenLimit);
        const response = await this.modelClient.callWithBackoff(config, signal);
        this.contextManager.restoreOriginalText(index, originalText);

        this.state.totalTokensUsed += Math.floor(((response.text?.length || 0) + JSON.stringify(this.history).length) / 4);
        this.history.push({ role: 'model', parts: response.candidates?.[0]?.content?.parts || [] });

        const functionCalls = response.functionCalls;
        if (!functionCalls || functionCalls.length === 0) {
          this.state.isFinished = true;
          if (onStep) onStep({ id: stepId, type: 'thought', label: 'Task Completed', status: 'completed', progress: 100 });
          break;
        }

        const toolResponses = await Promise.all(
          functionCalls.map(async (call: any, idx) => {
            const result = await this.toolExecutor.execute(call.name, call.args, onStep);
            if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${call.name}`, status: result.response.success === false ? 'error' : 'completed', details: [result.response.output] });
            return { name: result.name, response: result.response };
          })
        );

        this.history.push({ role: 'user', parts: toolResponses.map(tr => ({ functionResponse: tr })) });
        await this.persistState();

      } catch (error: unknown) {
        const err = error as Error;
        if (err.message === 'cancelled') throw err;
        this.history.push({ role: 'user', parts: [{ text: `[SYSTEM ERROR]: ${err.message}` }] });
      }
    }

    return this.state.isFinished ? 'Task completed.' : 'Task incomplete.';
  }
}
