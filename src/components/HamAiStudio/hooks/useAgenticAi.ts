 
import { useState, useRef, useEffect, useReducer, useCallback } from 'react';
import { useAiGeneration } from './useAiGeneration';
import { vfs } from '../../../services/vfsService';
import { ToolRegistry } from '../../../services/advancedAssistant/tools/ToolRegistry';
import { ReasoningEngine } from '../../../services/advancedAssistant/reasoning/ReasoningEngine';
import { SecurityService } from '../../../services/advancedAssistant/security/SecurityService';
import { MemorySystem } from '../../../services/advancedAssistant/memory/MemorySystem';
import { PerformanceManager } from '../../../services/advancedAssistant/performance/PerformanceManager';
import { HamEngineCollaborator } from '../../../services/advancedAssistant/collaborator/HamEngineCollaborator';
import { OpenRouterCollaborator } from '../../../services/advancedAssistant/collaborator/OpenRouterCollaborator';
import { safeStorage } from '../../../utils/storage';
import { useToast } from '../../../context/ToastContext';
import { GET_AGENTIC_SYSTEM_PROMPT } from '../../../constants/prompts';
import { cleanCodeBlock, truncateForLog } from '../../../utils/textUtils';
import { XmlParser } from '../../../utils/xmlParser';
import { APP_CONFIG } from '../../../constants/config';
import { AgentActivity, ProjectData, ChatMessageData } from '../types';
import { useProjectStore } from '../../../store/projectStore';

import { AgentState, AgentAction, agentReducer, INITIAL_STATE } from './useAgenticAiState';
import { useAgenticAiSend } from './useAgenticAiSend';

/**
 * Hook for managing Agentic AI (ReAct Loop) functionality.
 * 
 * This hook orchestrates the autonomous agent loop, including:
 * - Planning and reasoning
 * - Tool execution
 * - Security validation
 * - Self-correction
 * - History management
 * 
 * @param projectState - The current state of the project (files, history, etc.)
 * @param projectType - The type of project (e.g., 'web', 'android')
 * @returns An object containing the agent's state and control functions.
 */
export interface AgenticAiProjectState {
  project: ProjectData | null;
  setProject: (project: ProjectData | null) => void;
  history: ChatMessageData[];
  setHistory: (history: ChatMessageData[] | ((prev: ChatMessageData[]) => ChatMessageData[])) => void;
  activeView: "chat" | "preview" | "dashboard";
  setActiveView: (view: "chat" | "preview" | "dashboard") => void;
  saveImmediately: (project?: ProjectData, history?: ChatMessageData[]) => Promise<void>;
  setDiffData: (data: { path: string, oldContent: string, newContent: string } | null) => void;
}

export function useAgenticAi(
  projectState: AgenticAiProjectState,
  projectType: string
) {
  const { 
    isLoading: isGenerationLoading, 
    generateResponse,
    cancelGeneration
  } = useAiGeneration();
  const { showToast } = useToast();

  const [state, dispatch] = useReducer(agentReducer, INITIAL_STATE);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const createdFiles = useRef<Set<string>>(new Set());
  const initialVfsSnapshot = useRef<{ path: string, content: string }[] | null>(null);
  
  // Services Initialization
  const toolRegistry = useRef(new ToolRegistry());
  const reasoningEngine = useRef(new ReasoningEngine());
  const securityService = useRef(new SecurityService());
  const memorySystem = useRef(new MemorySystem());
  const performanceManager = useRef(new PerformanceManager());
  const hamCollaborator = useRef(HamEngineCollaborator.getInstance());

  // Persistence
  useEffect(() => {
      const savedState = safeStorage.getItem('ham_agent_state');
      if (savedState) {
          try {
              const parsed = JSON.parse(savedState);
              if (parsed && Array.isArray(parsed.agentActivities)) {
                  dispatch({ type: 'RESTORE_STATE', payload: { ...INITIAL_STATE, ...parsed, isProcessing: false } });
              }
          } catch (e) {
              console.error("Failed to restore agent state", e);
          }
      }
  }, []);

  useEffect(() => {
      if (state.agentActivities.length > 0 || state.input) {
          safeStorage.setItem('ham_agent_state', JSON.stringify({
              agentActivities: state.agentActivities,
              input: state.input
          }));
      }
  }, [state.agentActivities, state.input]);

  useEffect(() => {
    // Register UI-dependent tools
    toolRegistry.current.register({
      name: 'preview_changes',
      description: 'Preview changes to a file before applying them',
      parameters: { path: 'string', content: 'string' },
      execute: async ({ path, content }: { path: string, content: string }) => {
        // Find old content
        let oldContent = '';
        try {
          const shadowContent = useProjectStore.getState().shadowBuffers[path];
          if (shadowContent !== undefined && shadowContent !== null && shadowContent !== '__DELETED__') {
            oldContent = shadowContent;
          } else if (await vfs.exists(path)) {
             oldContent = await vfs.readFile(path);
          }
        } catch (e) {
          oldContent = ''; // New file or error reading
        }
        
        if (content && content.length > 500000) {
            return `File too large for diff preview. Max size is 500KB. Proceeding with direct write.`;
        }

        projectState.setDiffData({
          path,
          oldContent,
          newContent: content
        });
        
        return `Diff preview opened for ${path}. User must accept changes manually.`;
      }
    });
  }, [projectState.setDiffData]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const lastHistoryUpdate = useRef(0);

  const isCancellingRef = useRef(false);

  const handleCancel = useCallback(async (event?: CustomEvent<{ rollback?: boolean }>) => {
    if (isCancellingRef.current) return;
    isCancellingRef.current = true;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    cancelGeneration();
    dispatch({ type: 'SET_PROCESSING', payload: false });
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    const shouldRollback = event?.detail?.rollback !== false;

    // Rollback changes if any
    if (shouldRollback && initialVfsSnapshot.current !== null) {
        try {
            useProjectStore.getState().clearShadowBuffers();
            // Get all files recursively to delete them properly
            const snapshot = await vfs.getProjectSnapshot();
            const currentFiles = snapshot.files.map(f => f.path);
            if (currentFiles.length > 0) {
                await vfs.bulkDelete(currentFiles);
            }
            if (initialVfsSnapshot.current.length > 0) {
                await vfs.bulkWrite(initialVfsSnapshot.current);
            }
            dispatch({ type: 'ADD_ACTIVITY', payload: {
                id: Date.now().toString(),
                type: 'warning',
                title: 'Rollback Complete',
                details: 'Restored project to state before AI execution.',
                status: 'warning',
                timestamp: Date.now()
            }});
        } catch (e: any) {
            console.error("Rollback failed", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            showToast(errorMessage, 'error');
        }
    }
    initialVfsSnapshot.current = null;

    // Update history to show cancellation
    projectState.setHistory(prev => {
        const historyArray = prev || [];
        const last = historyArray[historyArray.length - 1];
        if (last && last.role === 'ai') {
            return [...historyArray.slice(0, -1), { ...last, content: last.content + '\n\n[CANCELLED BY USER]', isError: true }];
        }
        return historyArray;
    });

    isCancellingRef.current = false;
  }, [cancelGeneration, dispatch, projectState, showToast]);

  useEffect(() => {
    const handleCancelEvent = (e: Event) => {
      handleCancel(e as CustomEvent<{ rollback?: boolean }>);
    };
    window.addEventListener('ham-cancel-generation', handleCancelEvent);
    return () => {
      window.removeEventListener('ham-cancel-generation', handleCancelEvent);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [handleCancel]);

  const executeAction = async (actionName: string, params: Record<string, unknown>): Promise<string> => {
    dispatch({ type: 'SET_ACTION', payload: actionName });
    
    const securityContext = { userId: 'user', role: 'admin', permissions: ['execute_shell'] }; 
    if (!securityService.current.validateExecution(actionName, securityContext)) {
        const errorMsg = `Action ${actionName} blocked by security policy.`;
        await securityService.current.logAudit('user', actionName, `Blocked: ${JSON.stringify(params)}`);
        return `Error: ${errorMsg}`;
    }

    if (actionName === 'run_command' && params.command) {
        if (!securityService.current.validateCommandContent(params.command as string)) {
            const errorMsg = `Command execution blocked: Unsafe command detected.`;
            await securityService.current.logAudit('user', actionName, `Blocked Unsafe Command: ${params.command as string}`);
            return `Error: ${errorMsg}`;
        }
    }

    if (params.content) {
        params.content = securityService.current.sanitizeInput(params.content as string);
    }

    const tool = toolRegistry.current.getTool(actionName);
    if (!tool) {
        if (actionName === 'write') return executeAction('write_file', params);
        if (actionName === 'read') return executeAction('read_file', params);
        return `Error: Tool ${actionName} not found.`;
    }

    try {
      const startTime = performance.now();
      const result = await tool.execute(params, { project: useProjectStore.getState().project });
      const duration = performance.now() - startTime;
      
      performanceManager.current.recordMetric(actionName, duration);
      await securityService.current.logAudit('user', actionName, `Executed: ${truncateForLog(JSON.stringify(params))}`);
      
      // Ensure VFS changes are persisted before returning to prevent race conditions
      // This is especially important for tools that modify files.
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to event loop

      return securityService.current.sanitizeOutput(result);
    } catch (error: any) {
      const msg = error instanceof Error ? error.message : String(error);
      performanceManager.current.recordMetric(actionName, 0);
      await securityService.current.logAudit('user', actionName, `Failed: ${msg}`);
      return `Error executing ${actionName}: ${msg}`;
    } finally {
        dispatch({ type: 'SET_ACTION', payload: null });
    }
  };

  const handleSend = useAgenticAiSend(
      state,
      dispatch,
      projectState,
      projectType,
      generateResponse,
      toolRegistry,
      reasoningEngine,
      securityService,
      memorySystem,
      performanceManager,
      abortControllerRef,
      timerRef,
      createdFiles,
      initialVfsSnapshot,
      executeAction
  );

  const clearHistory = () => {
      dispatch({ type: 'CLEAR_ACTIVITIES' });
      safeStorage.removeItem('ham_agent_state');
  };

  return {
    isLoading: state.isProcessing,
    timer: state.timer,
    progress: state.progress,
    input: state.input,
    setInput: (val: string) => dispatch({ type: 'SET_INPUT', payload: val }),
    agentActivities: state.agentActivities,
    handleSend,
    handleCancel,
    clearHistory
  };
}
