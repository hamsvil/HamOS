 
import { Content } from '@google/genai';
import { HamState, HamToolName, ToolkitType } from './types';
import { ToolHandlers } from './toolHandlers';
import { ToolHandlersPart2 } from './toolHandlersPart2';
import { HamSecurity } from '../kernel/hamSecurity';
import { HamInquisitor } from '../inquisitor/auditor';
import { vfs } from '../../vfsService';
import { ErrorRecovery } from './ErrorRecovery';

export class ExecutionLoop {
  public static async run(
    engine: { 
      state: HamState; 
      history: Content[]; 
      restoreState: (project: string) => Promise<void>;
      persistState: () => Promise<void>;
      callHamEngineWithBackoff: (signal: AbortSignal | undefined, limit: number, fileList: string, type: string) => Promise<unknown>;
    },
    prompt: string,
    onStep?: (step: Record<string, unknown>) => void,
    projectName: string = 'Unknown Project',
    projectType: string = 'web',
    fileList: string = '',
    signal?: AbortSignal
  ): Promise<string> {
    
    engine.state.currentTask = prompt;
    engine.state.isFinished = false;
    engine.state.currentProject = projectName;

    // Restore state for this specific project
    await engine.restoreState(projectName);

    if (onStep) {
      onStep({ id: 'init', type: 'thought', label: `Initializing Ham Engine (${engine.state.mode} mode)`, status: 'running', progress: 5 });
    }

    engine.history.push({
      role: 'user',
      parts: [{ text: prompt }]
    });

    let isFinished = false;
    let finalSummary = '';
    let loopCount = 0;
    const MAX_LOOPS = 500; // Circuit Breaker
    
    // SQR-SVFS V5.0: Dynamic Token Limit
    const isComplex = prompt.length > 500 || prompt.toLowerCase().includes('refactor') || prompt.toLowerCase().includes('architecture');
    const projectBytesSize = fileList.length;
    const dynamicTokenLimit = HamSecurity.getDynamicTokenLimit(projectBytesSize, isComplex, engine.state.mode);

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
        if (engine.state.totalTokensUsed > dynamicTokenLimit) {
          if (onStep) onStep({ id: stepId, type: 'error', label: 'Token Guillotine Triggered', status: 'error' });
          return `[SYSTEM HALTED]: Token Guillotine triggered. Exceeded ${dynamicTokenLimit} tokens to prevent financial hemorrhage.`;
        }

        // 1. Decide (Call Ham Engine)
        const response: any = await engine.callHamEngineWithBackoff(signal, dynamicTokenLimit, fileList, projectType);
        
        // Improved Token Tracking: Account for input and output
        const telemetry = `\n\n[REAL-TIME TELEMETRY]\nProject: ${engine.state.currentProject}\nConsecutive Errors: ${engine.state.lastErrorCount}/10\nTokens Used: ${engine.state.totalTokensUsed}/${dynamicTokenLimit}\nActive Toolkit: ${engine.state.activeToolkit.toUpperCase()}\nSandbox Mode: ${engine.state.isSandboxed ? 'ON' : 'OFF'}`;
        const systemInstruction = telemetry + '\n\n' + HamSecurity.getSystemConstitution();
        const inputTokens = (JSON.stringify(engine.history).length + systemInstruction.length) / 4;
        const outputTokens = (response.text?.length || 0) / 4 + (response.functionCalls?.length || 0) * 50;
        engine.state.totalTokensUsed += Math.floor(inputTokens + outputTokens);
        
        // Add model response to history
        engine.history.push({
          role: 'model',
          parts: response.candidates?.[0]?.content?.parts || []
        });

        const functionCalls = response.functionCalls;

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
          functionCalls.map(async (call: { name: string; args: Record<string, unknown>; id?: string }, idx: number) => {
            const name = call.name;
            const args = call.args;
            
            if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executing ${name}`, status: 'running', details: [JSON.stringify(args)] });

            // Handle Meta Tools Internally
            if (name === HamToolName.LOAD_CONTEXTUAL_TOOLKIT) {
              engine.state.activeToolkit = args.toolkitName as ToolkitType;
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: [`Toolkit switched to ${args.toolkitName}`] });
              return { name, response: { output: `Toolkit switched to ${args.toolkitName}` } };
            }
            if (name === HamToolName.FINISH_TASK) {
              // Linter Gatekeeper: Block finish if there are unresolved errors
              if (engine.state.lastErrorCount > 0) {
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'error', details: ['Linter Gatekeeper blocked finish_task'] });
                return { name, response: { output: '[LINTER GATEKEEPER]: You cannot finish the task while there are unresolved errors. You MUST fix the linter/compiler errors first.' } };
              }

              // Commit Shadow VFS to Main VFS before final audit
              const { shadowVFS } = await import('../kernel/ShadowVFS');
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Committing Shadow VFS`, status: 'running' });
              try {
                await shadowVFS.commitToMainVFS();
              } catch (commitError: any) {
                return { name, response: { output: `[SHADOW VFS ERROR]: Failed to commit changes. ${commitError.message}` } };
              }

              // Final Quality Audit (Auto-Lint & Auto-Compile)
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Final Quality Audit`, status: 'running' });
              const lintResult = await ToolHandlersPart2.handleLintApplet();
              if (!lintResult.success) {
                engine.state.lastErrorCount++;
                let outputMsg = `[FINAL AUDIT FAILED]: Linter found errors. Please fix them before finishing.\n${lintResult.output}`;
                const recovery = await ErrorRecovery.handleCircuitBreaker(engine.state.lastErrorCount, outputMsg);
                if (recovery.isFinished) {
                  engine.state.lastErrorCount = recovery.newErrorCount;
                  isFinished = true;
                  finalSummary = recovery.finalSummary;
                  outputMsg = recovery.outputMsg;
                }
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Audit Failed`, status: 'error', details: [lintResult.output] });
                return { name, response: { output: outputMsg } };
              }
              
              const compileResult = await ToolHandlersPart2.handleCompileApplet();
              if (!compileResult.success) {
                engine.state.lastErrorCount++;
                let outputMsg = `[FINAL AUDIT FAILED]: Compilation failed. Please fix the errors before finishing.\n${compileResult.output}`;
                const recovery = await ErrorRecovery.handleCircuitBreaker(engine.state.lastErrorCount, outputMsg);
                if (recovery.isFinished) {
                  engine.state.lastErrorCount = recovery.newErrorCount;
                  isFinished = true;
                  finalSummary = recovery.finalSummary;
                  outputMsg = recovery.outputMsg;
                }
                if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Audit Failed`, status: 'error', details: [compileResult.output] });
                return { name, response: { output: outputMsg } };
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
              finalSummary = (args as any).summary;
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status: 'completed', details: [finalSummary] });
              return { name, response: { output: 'Task marked as finished and verified by Final Quality Audit.' } };
            }
            if (name === HamToolName.UPGRADE_ENGINE_CORE) {
              // The Evolution Pipeline (Shadow Cloning & Inquisitor Audit)
              if (onStep) onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executing ${name}`, status: 'running', details: ['Evolution Pipeline Initiated'] });
              
              try {
                const shadowPath = (args as any).shadowPath;
                if (!shadowPath) {
                   return { name, response: { output: `[EVOLUTION PIPELINE]: To upgrade the core, you must first create a shadow clone in /tmp/shadow_cortex/ using create_file, edit it, and then call UPGRADE_ENGINE_CORE again with the path to the shadow clone to trigger the Inquisitor Audit.` } };
                }

                // 1. Read Original and Mutated Code
                const targetFile = (shadowPath as string).replace('/tmp/shadow_cortex/', '/src/services/hamEngine/cortex/');
                const originalCode = await vfs.readFile(targetFile);
                const mutatedCode = await vfs.readFile(shadowPath);

                // 2. Audit with Inquisitor
                const audit = await HamInquisitor.auditCode(originalCode, mutatedCode);
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
              const result = await ToolHandlers.executeTool(name as HamToolName, args);
              
              // Linter Gatekeeper Logic & Circuit Breaker
              if ((name === HamToolName.LINT_APPLET || name === HamToolName.COMPILE_APPLET) && !result.success) {
                engine.state.lastErrorCount++;
                const recovery = await ErrorRecovery.handleCircuitBreaker(engine.state.lastErrorCount, result.output);
                if (recovery.isFinished) {
                  engine.state.lastErrorCount = recovery.newErrorCount;
                  isFinished = true;
                  finalSummary = recovery.finalSummary;
                  result.output = recovery.outputMsg;
                }
              } else if ((name === HamToolName.LINT_APPLET || name === HamToolName.COMPILE_APPLET) && result.success) {
                engine.state.lastErrorCount = 0; // Reset only on successful validation
              }

              if (onStep) {
                 const status = result.success ? 'completed' : 'error';
                 onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Executed ${name}`, status, details: [result.output] });
              }

              return { name, response: { output: result.output, success: result.success } };
            } catch (toolError: any) {
              engine.state.lastErrorCount++;
              let errorOutput = `[TOOL ERROR]: ${toolError.message}`;
              
              const recovery = await ErrorRecovery.handleCircuitBreaker(engine.state.lastErrorCount, errorOutput);
              if (recovery.isFinished) {
                engine.state.lastErrorCount = recovery.newErrorCount;
                isFinished = true;
                finalSummary = recovery.finalSummary;
                errorOutput = recovery.outputMsg;
              }

              if (onStep) {
                 onStep({ id: `${stepId}-${idx}`, type: 'action', label: `Failed ${name}`, status: 'error', details: [toolError.message] });
              }
              return { name, response: { output: errorOutput, success: false } };
            }
          })
        );

        // 4. Observe (Feed results back to Gemini)
        engine.history.push({
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
        await engine.persistState();

      } catch (error: any) {
        console.error('[HamEngine] Loop Error:', error);
        
        if (onStep) {
          onStep({ id: stepId, type: 'thought', label: `Reasoning Step ${loopCount} Failed`, status: 'error', progress: currentProgress, details: [error.message] });
        }

        if (error.message === 'cancelled' || error.name === 'AbortError') {
          throw error;
        }

        // Feed error back to model to self-heal
        engine.history.push({
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
}
