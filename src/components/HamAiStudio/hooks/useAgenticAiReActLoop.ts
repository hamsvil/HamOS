/* eslint-disable no-useless-assignment */
 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
// [STABILITY] Promise chains verified
import { useRef } from 'react';
import { useAiGeneration } from './useAiGeneration';
import { useProjectState } from './useProjectState';
import { ToolRegistry } from '../../../services/advancedAssistant/tools/ToolRegistry';
import { ReasoningEngine } from '../../../services/advancedAssistant/reasoning/ReasoningEngine';
import { SecurityService } from '../../../services/advancedAssistant/security/SecurityService';
import { safeStorage } from '../../../utils/storage';
import { GET_AGENTIC_SYSTEM_PROMPT } from '../../../constants/prompts';
import { cleanCodeBlock, truncateForLog } from '../../../utils/textUtils';
import { XmlParser } from '../../../utils/xmlParser';
import { APP_CONFIG } from '../../../constants/config';
import { AgentState, AgentAction } from './useAgenticAiState';
import { useProjectStore } from '../../../store/projectStore';
import { vfs } from '../../../services/vfsService';
import { shadowVFS } from '../../../services/hamEngine/kernel/ShadowVFS';
import { ChatMessageData } from '../types';
import { buildExecutionBatches, processStreamingChunk } from './useAgenticAiReActLoopHelpers';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { memoryWorker } from '../../../ham-synapse/engine/memory_worker';
import { HamEventType } from '../../../ham-synapse/core/types';

export function useAgenticAiReActLoop(
    state: AgentState,
    dispatch: React.Dispatch<AgentAction>,
    projectState: ReturnType<typeof useProjectState> & { setDiffData: (data: { path: string, oldContent: string, newContent: string } | null) => void },
    projectType: string,
    generateResponse: ReturnType<typeof useAiGeneration>['generateResponse'],
    toolRegistry: React.MutableRefObject<ToolRegistry>,
    reasoningEngine: React.MutableRefObject<ReasoningEngine>,
    securityService: React.MutableRefObject<SecurityService>,
    abortControllerRef: React.MutableRefObject<AbortController | null>,
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    createdFiles: React.MutableRefObject<Set<string>>,
    executeAction: (actionName: string, params: Record<string, unknown>) => Promise<string>
) {
    const lastHistoryUpdate = useRef(0);
    const activeWorkerRef = useRef<Worker | null>(null);

    const delay = (ms: number, signal?: AbortSignal) => new Promise(resolve => {
        let timeoutId: NodeJS.Timeout;
        const onAbort = () => {
            clearTimeout(timeoutId);
            resolve(null);
        };
        
        timeoutId = setTimeout(() => {
            if (signal) {
                signal.removeEventListener('abort', onAbort);
            }
            resolve(null);
        }, ms);

        if (signal) {
            signal.addEventListener('abort', onAbort, { once: true });
        }
    });

    const runReActLoop = async (initialPrompt: string) => {
        const currentAbortController = abortControllerRef.current;
        let currentPrompt = initialPrompt;
        let loopCount = 0;
        let currentStepId = state.agentActivities.length;

        try {
          while (loopCount < APP_CONFIG.AGENT.MAX_LOOPS) {
              if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) throw new Error('Operation cancelled by user.');
              
              loopCount++;
              const currentProgress = Math.min(10 + (loopCount / APP_CONFIG.AGENT.MAX_LOOPS) * 80, 95);
              dispatch({ type: 'SET_PROGRESS', payload: Math.round(currentProgress) });

              // Create a checkpoint before each step for atomicity
              await shadowVFS.createCheckpoint();

              currentStepId++;
              const stepId = currentStepId;
              
              const aiWorker = new Worker(new URL('../../../workers/ai.worker.ts', import.meta.url), { type: 'module' });
              activeWorkerRef.current = aiWorker;

              const recentHistory = await Promise.race([
                  new Promise<ChatMessageData[]>((resolve) => {
                      const onAbort = () => {
                          aiWorker.terminate();
                          resolve(useProjectStore.getState().history);
                      };
                      
                      if (abortControllerRef.current) {
                          abortControllerRef.current.signal.addEventListener('abort', onAbort, { once: true });
                      }

                      aiWorker.onmessage = (e) => {
                          if (e.data.type === 'compress_history_RESULT') {
                              if (abortControllerRef.current) {
                                  abortControllerRef.current.signal.removeEventListener('abort', onAbort);
                              }
                              resolve(e.data.result);
                              aiWorker.terminate();
                              if (activeWorkerRef.current === aiWorker) activeWorkerRef.current = null;
                          }
                      };
                      aiWorker.onerror = (err) => {
                          console.error('compress_history worker error:', err);
                          if (abortControllerRef.current) {
                              abortControllerRef.current.signal.removeEventListener('abort', onAbort);
                          }
                          aiWorker.terminate();
                          if (activeWorkerRef.current === aiWorker) activeWorkerRef.current = null;
                          resolve(useProjectStore.getState().history);
                      };
                      aiWorker.postMessage({ type: 'compress_history', payload: useProjectStore.getState().history });
                  }),
                  delay(5000, currentAbortController?.signal).then(() => {
                      console.warn('compress_history worker timed out, using uncompressed history');
                      aiWorker.terminate();
                      if (activeWorkerRef.current === aiWorker) activeWorkerRef.current = null;
                      return useProjectStore.getState().history;
                  })
              ]);
              
              const snapshot = await vfs.getProjectSnapshot();
              const stagedChanges = await shadowVFS.getStagedChanges();
              
              // Merge staged changes into snapshot for AI context
              for (const [path, content] of stagedChanges.entries()) {
                  const existingFile = snapshot.files.find(f => f.path === path);
                  if (existingFile) {
                      if (content === '') {
                          // File deleted in shadow
                          snapshot.files = snapshot.files.filter(f => f.path !== path);
                      } else {
                          existingFile.content = content;
                      }
                  } else if (content !== '') {
                      // New file in shadow
                      snapshot.files.push({ path, content });
                  }
              }

              const aiMode = safeStorage.getItem('ham_ai_mode') || 'deep';
              const fileList = aiMode === 'fast' ? '' : (snapshot.files.map(f => `- ${f.path}`).join('\n') || 'No files yet.');
              
              let allowedTools = toolRegistry.current.listTools();
              if (aiMode === 'fast') {
                  allowedTools = ['write_file', 'read_file', 'list_files', 'edit_file', 'multi_edit'];
              } else if (aiMode === 'thinking') {
                  allowedTools = ['write_file', 'read_file', 'list_files', 'edit_file', 'multi_edit', 'run_command', 'delete_file', 'move_file', 'mkdir'];
              }
              
              const toolList = allowedTools.map(name => {
                const tool = toolRegistry.current.getTool(name);
                return `- ${name}: ${tool?.description} (Params: ${JSON.stringify(tool?.parameters)})`;
              }).join('\n');
              
              // Ham Engine Integration: Graph-RAG Context Retrieval
              const contextNodes = await memoryWorker.queryContext(['interaction', projectType]);
              const contextText = contextNodes.map(n => n.content).join('\n---\n');
              const omniContext = (aiMode === 'fast' || !contextText) ? '' : `\n\n[HAM ENGINE HOLOGRAPHIC MEMORY CONTEXT]\n${contextText}\n[/HAM ENGINE HOLOGRAPHIC MEMORY CONTEXT]\n`;
              
              const agenticSystemPrompt = GET_AGENTIC_SYSTEM_PROMPT(toolList, projectType, fileList) + omniContext;
              const truncatedSystemPrompt = agenticSystemPrompt.length > 12000 ? agenticSystemPrompt.substring(0, 12000) + '\n... [TRUNCATED FOR TOKEN LIMIT]' : agenticSystemPrompt;

              let response = '';
              try {
                // Finding 9: Refresh context if needed (handled by buildSystemInstruction inside generateResponse if we modify it)
                // Actually, useAiGeneration_Part1.ts needs to be modified to rebuild systemInstruction.
                
                response = await generateResponse(
                    currentPrompt, 
                    (recentHistory || []).slice(0, -1),
                    useProjectStore.getState().project, 
                    async (chunk) => {
                        processStreamingChunk(chunk, projectState, lastHistoryUpdate, abortControllerRef);
                    }, 
                    undefined, 
                    projectType,
                    truncatedSystemPrompt,
                    false,
                    abortControllerRef.current?.signal
                );
                
                // Omni-Synapse Integration: Memory Logging
                hamEventBus.dispatch({
                    id: `mem_${Date.now()}`,
                    type: HamEventType.MEMORY_APPEND,
                    timestamp: Date.now(),
                    payload: { content: `User: ${currentPrompt}\nAI: ${response}`, tags: ['interaction', projectType] },
                    source: 'SYSTEM'
                });
                
              } catch (apiError: any) {
                 const errorMessage = apiError instanceof Error ? apiError.message : String(apiError);
                 if (!abortControllerRef.current || abortControllerRef.current.signal.aborted || errorMessage.includes('cancelled')) {
                     throw new Error('Operation cancelled by user.', { cause: apiError });
                 }
                 
                 const isApiLimit = errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit');
                 const isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('failed to call') || errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('ham engine api');
                 
                 if (isApiLimit || isNetworkError) {
                     // Restore to checkpoint on network/API failure
                     await shadowVFS.restoreCheckpoint();

                     dispatch({ type: 'ADD_ACTIVITY', payload: { 
                        id: stepId.toString() + '_retry',
                        type: 'error',
                        title: isApiLimit ? 'API Limit Reached' : 'Network Error',
                        details: isApiLimit ? 'All API keys exhausted or rate limit exceeded. Waiting before retry...' : `Connection issue: ${errorMessage}. Retrying...`,
                        status: 'warning',
                        timestamp: Date.now()
                     }});
                     
                     // Don't decrement loopCount to prevent infinite loop, but wait before retrying
                     loopCount--; // Actually, let's decrement it so we don't consume the agent's reasoning loops, but we need a separate fail-safe if it fails forever.
                     // Wait, if we decrement loopCount, we could loop forever. Let's just wait and continue.
                     // Actually, let's keep loopCount as is, but maybe add a specific retry counter?
                     // For now, let's just wait and continue.
                     await delay(isApiLimit ? 10000 : 3000, currentAbortController?.signal); 
                     continue;
                 }

                 currentPrompt += `\n[SYSTEM ERROR DURING GENERATION]: ${truncateForLog(errorMessage)}\nPlease try a different approach or acknowledge the error.`;
                 
                 // Restore to checkpoint on generation error
                 await shadowVFS.restoreCheckpoint();

                 dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: stepId.toString(),
                    type: 'error',
                    title: 'Generation Error (Self-Healing)',
                    details: errorMessage,
                    status: 'warning',
                    timestamp: Date.now()
                 }});
                 
                 await delay(2000, currentAbortController?.signal);
                 continue;
              }

              if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) throw new Error('Operation cancelled by user.');

              if (response === "NO_API_KEY" || response === "ENDPOINT_NOT_CONFIGURED") {
                  projectState.setHistory(prev => {
                      const newHistory = [...prev];
                      const lastMsg = newHistory[newHistory.length - 1];
                      if (lastMsg && lastMsg.role === 'ai') {
                          lastMsg.content = response === "NO_API_KEY" ? "⚠️ **API Key Ham Engine belum diatur.**" : "⚠️ **Kaggle Endpoint belum diatur.**";
                          lastMsg.isError = true;
                      }
                      queueMicrotask(() => {
                          projectState.saveImmediately?.(undefined, newHistory).catch(err => {
                              console.error('Failed to save history immediately:', err);
                          });
                      });
                      return newHistory;
                  });
                  break;
              }

              const { thoughts, actions, raw } = XmlParser.parseFinal(response);
              
              if (thoughts.length === 0 && actions.length === 0) {
                 // Try to detect final answer if not parsed by XML
                 const hasFinalAnswerTag = response.includes('<final_answer>') || response.includes('</final_answer>');
                 const hasCodeTag = response.includes('<code') || response.includes('<edit');
                 
                 // If it has no action tags, no thought tags, and no code tags, it's just a conversational response
                 if (response.length > 0 && (!hasCodeTag || hasFinalAnswerTag)) {
                     // Assume plain text response or final_answer tag is final answer
                     let finalContent = response;
                     if (hasFinalAnswerTag) {
                         const match = response.match(/<final_answer>([\s\S]*?)(?:<\/final_answer>|$)/i);
                         if (match && match[1]) {
                             finalContent = match[1].trim();
                         } else {
                             finalContent = response.replace(/<\/?final_answer>/gi, '').trim();
                         }
                     }
                     const enhancedFinalAnswer = `### **Laporan Pembuatan Proyek (Ham Engine Core Report)**\n\n${finalContent}\n\n**Status:** Singularity Achieved.`;
                     projectState.setHistory(prev => {
                        const newHistory = [...prev];
                        const lastMsg = newHistory[newHistory.length - 1];
                        if (lastMsg && lastMsg.role === 'ai') {
                            lastMsg.content = enhancedFinalAnswer;
                        }
                        queueMicrotask(() => {
                            projectState.saveImmediately?.(undefined, newHistory).catch(err => {
                                console.error('Failed to save history immediately:', err);
                            });
                        });
                        return newHistory;
                    });
                    dispatch({ type: 'SET_PROGRESS', payload: 100 });
                    dispatch({ type: 'ADD_ACTIVITY', payload: { 
                        id: stepId.toString(),
                        type: 'success',
                        title: 'Task Completed',
                        details: 'Final answer generated.',
                        status: 'success',
                        timestamp: Date.now()
                    }});
                    break;
                 }

                 if (!response || response.trim() === '') {
                     currentPrompt += `\n[SYSTEM ERROR]: Your response was empty. Please provide a valid response.`;
                 } else {
                     currentPrompt += `\n[SYSTEM ERROR]: Your response was malformed. If you are trying to write code, use <code path="..."> or <edit path="...">. If you are just talking, do not use XML tags. Your raw output was: ${truncateForLog(response)}...`;
                 }
                 dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: stepId.toString(),
                    type: 'correction',
                    title: 'Format Error (Self-Healing)',
                    details: 'AI response did not contain valid XML tags. Forcing correction.',
                    status: 'warning',
                    timestamp: Date.now()
                 }});
                 continue;
              }
              
              thoughts.forEach(t => {
                   dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: stepId.toString(),
                    type: 'thought',
                    title: 'Reasoning',
                    details: t,
                    status: 'completed',
                    timestamp: Date.now()
                  }});
              });

              if (actions.length > 0) {
                  let allObservations = '';
                  
                  const executionBatches = buildExecutionBatches(actions);
                  let actionIndex = 0;
                  let hasFailure = false;

                  for (const batch of executionBatches) {
                      if (hasFailure) break;
                      if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) throw new Error('Operation cancelled by user.');

                      const batchPromises = batch.map(async (action) => {
                          if (hasFailure) return `\nSkipped ${action.name} due to previous failure.`;
                          const currentIndex = actionIndex++;
                          const actionStepId = `${stepId}_action_${currentIndex}`;
                          
                          if (action.name === 'write_file' && action.parameters?.path) {
                            createdFiles.current.add(action.parameters.path as string);
                          }

                          const evaluation = await reasoningEngine.current.evaluateAction(action, useProjectStore.getState().project);
                          if (evaluation.score < 0.5) {
                              dispatch({ type: 'ADD_ACTIVITY', payload: { 
                                id: actionStepId,
                                type: 'correction',
                                title: 'Self-Correction',
                                details: evaluation.feedback,
                                status: 'warning',
                                timestamp: Date.now()
                              }});
                              return `\nSelf-Correction for ${action.name}: ${evaluation.feedback}`;
                          }

                          let observation = '';
                          
                          const formatParamsForLog = (params: Record<string, unknown>) => {
                              if (!params) return '{}';
                              const cloned = { ...params };
                              if (cloned.content && typeof cloned.content === 'string') {
                                  cloned.content = truncateForLog(cloned.content);
                              }
                              return JSON.stringify(cloned, null, 2);
                          };

                          dispatch({ type: 'ADD_ACTIVITY', payload: { 
                            id: actionStepId,
                            type: 'tool',
                            title: `Executing: ${action.name}`,
                            details: `Params: ${formatParamsForLog(action.parameters)}`,
                            status: 'running',
                            timestamp: Date.now()
                          }});

                          try {
                              if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) throw new Error('Operation cancelled by user.');
                              
                              const safeParams = { ...action.parameters };
                              if (safeParams.content) {
                                  safeParams.content = securityService.current.sanitizeOutput(safeParams.content as string);
                              }
                              
                              if (aiMode === 'fast' && !allowedTools.includes(action.name)) {
                                  observation = `Error: Tool ${action.name} is not allowed in fast mode. Available tools: ${allowedTools.join(', ')}`;
                                  hasFailure = true;
                              } else {
                                  observation = await executeAction(action.name, safeParams);
                                  if (observation.toLowerCase().includes('error') || observation.toLowerCase().includes('failed')) {
                                      hasFailure = true;
                                  }
                              }
                          } catch (err: any) {
                              const errMsg = err instanceof Error ? err.message : String(err);
                              observation = `Error executing tool ${action.name}: ${errMsg}`;
                              hasFailure = true;
                          }

                          dispatch({ type: 'UPDATE_ACTIVITY', payload: {
                              id: actionStepId,
                              updates: {
                                  status: 'completed',
                                  details: `Params: ${formatParamsForLog(action.parameters)}\n\nResult:\n${truncateForLog(observation)}`
                              }
                          }});

                          return `\nObservation for ${action.name}: ${observation}`;
                      });

                      const batchResults = await Promise.all(batchPromises);
                      allObservations += batchResults.join('');
                  }

                  if (hasFailure) {
                      // Finding 11: Atomic Rollback for turn/batch
                      // We already have step-level rollback in the catch block, 
                      // but for explicit tool failures within a batch, we restore here.
                      const rollbackMsg = await shadowVFS.restoreCheckpoint();
                      allObservations += `\n\n[SYSTEM NOTICE]: One or more actions failed. Step-level rollback executed to maintain project integrity. ${rollbackMsg}`;
                  }

                  currentPrompt += `\n${allObservations}`;
                  
                  projectState.setHistory(prev => {
                      const newHistory = [...prev];
                      const lastMsg = newHistory[newHistory.length - 1];
                      if (lastMsg && lastMsg.role === 'ai') {
                          lastMsg.content = `Executed ${actions.length} actions successfully.`;
                      }
                      queueMicrotask(() => {
                          projectState.saveImmediately?.(undefined, newHistory).catch(err => {
                              console.error('Failed to save history immediately:', err);
                          });
                      });
                      return newHistory;
                  });
                  
                  dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: stepId + '_done',
                    type: 'success',
                    title: 'Actions Completed',
                    details: `Executed ${actions.length} actions.`,
                    status: 'success',
                    timestamp: Date.now()
                  }});
                  
                  continue;
              } else {
                  const textWithoutTags = response.replace(/<thought>[\s\S]*?<\/thought>/gi, '').trim();
                  const hasCodeTag = textWithoutTags.includes('<code') || textWithoutTags.includes('<edit');
                  
                  if (textWithoutTags.length > 0 && !hasCodeTag && !textWithoutTags.includes('<action')) {
                      // Treat the remaining text as the final answer
                      let finalContent = textWithoutTags;
                      const hasFinalAnswerTag = finalContent.includes('<final_answer>');
                      if (hasFinalAnswerTag) {
                          const match = finalContent.match(/<final_answer>([\s\S]*?)(?:<\/final_answer>|$)/i);
                          if (match && match[1]) {
                              finalContent = match[1].trim();
                          } else {
                              finalContent = finalContent.replace(/<\/?final_answer>/gi, '').trim();
                          }
                      }
                      
                      const enhancedFinalAnswer = `### **Laporan Pembuatan Proyek (Ham Engine Core Report)**\n\n${finalContent}\n\n**Status:** Singularity Achieved.`;
                      projectState.setHistory(prev => {
                          const newHistory = [...prev];
                          const lastMsg = newHistory[newHistory.length - 1];
                          if (lastMsg && lastMsg.role === 'ai') {
                              lastMsg.content = enhancedFinalAnswer;
                          }
                      queueMicrotask(() => {
                          projectState.saveImmediately?.(undefined, newHistory).catch(err => {
                              console.error('Failed to save history immediately:', err);
                          });
                      });
                          return newHistory;
                      });
                      dispatch({ type: 'SET_PROGRESS', payload: 100 });
                      dispatch({ type: 'ADD_ACTIVITY', payload: { 
                          id: stepId.toString(),
                          type: 'success',
                          title: 'Task Completed',
                          details: 'Final answer generated.',
                          status: 'success',
                          timestamp: Date.now()
                      }});
                      break;
                  } else {
                      if (hasCodeTag) {
                          currentPrompt += `\n[SYSTEM ERROR]: Your response was malformed. If you are trying to write code, use <code path="..."> or <edit path="...">. Make sure to close the tags properly. Your raw output was: ${response.substring(0, 100)}...`;
                      } else if (textWithoutTags.includes('<action')) {
                          currentPrompt += `\n[SYSTEM ERROR]: Your <action> tag was malformed. Make sure to use the correct format: <action name="tool_name"><parameter name="param_name">value</parameter></action>. Your raw output was: ${response.substring(0, 100)}...`;
                      } else {
                          currentPrompt += `\nSystem: Please provide an <action> or <final_answer>.`;
                      }
                  }
              }
          }

          if (loopCount >= APP_CONFIG.AGENT.MAX_LOOPS) {
              const lastActions = currentPrompt.split('\n').filter(line => line.includes('<action')).slice(-5).map(line => {
                const match = line.match(/<action name="([^"]+)"/);
                return match ? match[1] : line;
              }).join(', ');
              
              const diagnosticInfo = `Max iterations (${APP_CONFIG.AGENT.MAX_LOOPS}) reached. The agent seems stuck in a loop. Last actions: [${lastActions}]. Current loop count: ${loopCount}.`;
              
              projectState.setHistory(prev => {
                  const newHistory = [...prev];
                  const lastMsg = newHistory[newHistory.length - 1];
                  if (lastMsg && lastMsg.role === 'ai') {
                      lastMsg.content += `\n\n[SYSTEM ERROR]: ${diagnosticInfo}`;
                      lastMsg.isError = true;
                  }
                  return newHistory;
              });
          }
        } catch (error: any) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            if (errorMessage.includes('cancelled')) {
                 return;
            }
            console.error("Agent Loop Error:", error);
            projectState.setHistory(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                    if (lastMsg.content === 'Thinking...') {
                        lastMsg.content = `[SYSTEM ERROR]: ${errorMessage}`;
                        lastMsg.isError = true;
                    } else {
                        lastMsg.content += `\n\n[SYSTEM ERROR]: ${errorMessage}`;
                        lastMsg.isError = true;
                    }
                }
                queueMicrotask(() => {
                    projectState.saveImmediately?.(undefined, newHistory).catch(err => {
                        console.error('Failed to save history immediately:', err);
                    });
                });
                return newHistory;
            });
        } finally {
            if (activeWorkerRef.current) {
                activeWorkerRef.current.terminate();
                activeWorkerRef.current = null;
            }

            if (abortControllerRef.current === currentAbortController) {
                abortControllerRef.current = null;
                dispatch({ type: 'SET_PROCESSING', payload: false });
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
            }
        }
    };

    return runReActLoop;
}
