 
 
import { RollingKeyManager } from '../../../utils/RollingKeyManager';
import { useRef } from 'react';
import { useAiGeneration } from './useAiGeneration';
import { useProjectState } from './useProjectState';
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
import { useProjectStore } from '../../../store/projectStore';
import { AgentState, AgentAction } from './useAgenticAiState';
import { useAgenticAiReActLoop } from './useAgenticAiReActLoop';

export function useAgenticAiSend(
    state: AgentState,
    dispatch: React.Dispatch<AgentAction>,
    projectState: ReturnType<typeof useProjectState> & { setDiffData: (data: { path: string, oldContent: string, newContent: string } | null) => void },
    projectType: string,
    generateResponse: ReturnType<typeof useAiGeneration>['generateResponse'],
    toolRegistry: React.MutableRefObject<ToolRegistry>,
    reasoningEngine: React.MutableRefObject<ReasoningEngine>,
    securityService: React.MutableRefObject<SecurityService>,
    memorySystem: React.MutableRefObject<MemorySystem>,
    performanceManager: React.MutableRefObject<PerformanceManager>,
    abortControllerRef: React.MutableRefObject<AbortController | null>,
    timerRef: React.MutableRefObject<NodeJS.Timeout | null>,
    createdFiles: React.MutableRefObject<Set<string>>,
    initialVfsSnapshot: React.MutableRefObject<{ path: string, content: string }[] | null>,
    executeAction: (actionName: string, params: Record<string, unknown>) => Promise<string>
) {
    const { showToast } = useToast();
    const lastHistoryUpdate = useRef(0);

    const runReActLoop = useAgenticAiReActLoop(
        state,
        dispatch,
        projectState,
        projectType,
        generateResponse,
        toolRegistry,
        reasoningEngine,
        securityService,
        abortControllerRef,
        timerRef,
        createdFiles,
        executeAction
    );

    const handleSend = async (e?: React.FormEvent, promptOverride?: string, instructionOverride?: string) => {
        if (e) e.preventDefault();
        const text = promptOverride || state.input;
        if (!text.trim() || state.isProcessing || abortControllerRef.current) return;
        abortControllerRef.current = new AbortController();
        const currentAbortController = abortControllerRef.current;

        dispatch({ type: 'SET_INPUT', payload: '' });
        dispatch({ type: 'SET_PROCESSING', payload: true });
        dispatch({ type: 'SET_TIMER', payload: 0 });
        dispatch({ type: 'SET_PROGRESS', payload: 0 });
        dispatch({ type: 'CLEAR_ACTIVITIES' });
        createdFiles.current.clear();
        
        try {
            const snapshot = await vfs.getProjectSnapshot();
            initialVfsSnapshot.current = snapshot.files;
        } catch (e: any) {
            initialVfsSnapshot.current = [];
        }

        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => {
          dispatch({ type: 'INCREMENT_TIMER' });
        }, 1000);
        
        const sanitizedInput = securityService.current.sanitizeInput(text);
        
        const userMsg = { id: Date.now().toString(), role: 'user' as const, content: sanitizedInput };
        const historyAfterUser = [...useProjectStore.getState().history, userMsg];
        projectState.setHistory(historyAfterUser);
        setTimeout(() => projectState.saveImmediately?.(undefined, historyAfterUser), 0);

        const aiPlaceholder = { id: (Date.now() + 1).toString(), role: 'ai' as const, content: 'Thinking...', steps: [] };
        const historyAfterAi = [...historyAfterUser, aiPlaceholder];
        projectState.setHistory(historyAfterAi);
        setTimeout(() => projectState.saveImmediately?.(undefined, historyAfterAi), 0);

        try {
            const plan = await reasoningEngine.current.createPlan(sanitizedInput);
            dispatch({ type: 'SET_PROGRESS', payload: 10 });
            dispatch({ type: 'ADD_ACTIVITY', payload: { 
              id: (state.agentActivities.length + 1).toString(),
              type: 'plan',
              title: 'Planning Execution',
              details: `Created plan with ${plan.length} steps:\n${plan.join('\n')}`,
              status: 'completed',
              timestamp: Date.now()
            }});

            let currentPrompt = sanitizedInput;
            if (instructionOverride) {
                currentPrompt = `${instructionOverride}\n\nTask: ${currentPrompt}`;
            }
            
            const domTelemetry = useProjectStore.getState().domTelemetry;
            if (domTelemetry) {
                currentPrompt += `\n\n[DOM TELEMETRY (Current UI Structure)]\n${JSON.stringify(domTelemetry, null, 2).substring(0, 2000)}...`;
            }
            
            const model = performanceManager.current.selectModel('high'); 
            const selectedAiModel = safeStorage.getItem('ham_ai_model') || 'ham-engine-collaborator';
            
            // FAST-PATH INTENT CLASSIFICATION
            const isSimpleGreeting = /^(hai|halo|hello|hi|hey|test|ping|p|selamat\s+(pagi|siang|sore|malam))(?:\s+.*)?$/i.test(text.trim());
            let isConversational = isSimpleGreeting;
            
            if (!isConversational) {
                try {
                    const intentPrompt = `Analyze the following user request and determine if the user wants you to WRITE, EDIT, CREATE, or MODIFY files/projects, or if they are just asking a question, discussing code, or greeting.
User Request: "${text}"
Reply with exactly "CODE" ONLY if the user explicitly or implicitly asks you to build, create, modify, or write code/files. Reply with exactly "CHAT" if the user is asking a question, asking for an explanation, greeting, or discussing code WITHOUT asking you to change it. When in doubt, reply "CHAT".`;
                    
                    const { AiWorkerService } = await import('../../../services/aiWorkerService');
                    let intentResult;
                    try {
                        intentResult = await AiWorkerService.generateContent({
                            model: 'gemini-2.5-flash',
                            contents: [{ role: 'user', parts: [{ text: intentPrompt }] }],
                            config: { temperature: 0.1 },
                            fallbackProviders: ['anthropic', 'openai']
                        });
                    } catch (e: any) {
                        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) throw new Error('cancelled', { cause: e });
                        throw e;
                    }
                    
                    const intentText = intentResult.text?.trim().toUpperCase() || '';
                    if (intentText.includes('CHAT') && !intentText.includes('CODE')) {
                        isConversational = true;
                    } else {
                        isConversational = false;
                    }
                } catch (e: any) {
                    const errMsg = e instanceof Error ? e.message : String(e);
                    if (errMsg.toLowerCase().includes('429') || errMsg.toLowerCase().includes('quota') || errMsg.toLowerCase().includes('rate limit')) {
                        throw e; // Propagate quota errors to outer catch block
                    }
                    console.warn("Intent classification failed, defaulting to CODE", e);
                    isConversational = false;
                }
            }

            if (isConversational) {
                dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: 'intent-check',
                    type: 'thought',
                    title: 'Fast-Path Activated',
                    details: 'Request identified as conversational. Bypassing heavy engine.',
                    status: 'completed',
                    timestamp: Date.now()
                }});
                
                const response = await generateResponse(
                    currentPrompt, 
                    (useProjectStore.getState().history || []).slice(0, -1),
                    useProjectStore.getState().project, 
                    async (chunk) => {
                        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
                        projectState.setHistory(prev => {
                            const newHistory = [...prev];
                            const lastMsg = newHistory[newHistory.length - 1];
                            if (lastMsg && lastMsg.role === 'ai') {
                                lastMsg.content = chunk;
                            }
                            return newHistory;
                        });
                    }, 
                    undefined, 
                    projectType,
                    undefined
                );
                
                dispatch({ type: 'SET_PROGRESS', payload: 100 });
                window.dispatchEvent(new CustomEvent('ham-bulk-sync-now'));
                
                if (abortControllerRef.current === currentAbortController) {
                    dispatch({ type: 'SET_PROCESSING', payload: false });
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    abortControllerRef.current = null;
                }
                return;
            }

            if (selectedAiModel === 'ham-engine-v2') {
                dispatch({ type: 'ADD_ACTIVITY', payload: { 
                    id: 'ham-engine-v2-start',
                    type: 'thought',
                    title: 'Ham Engine V2 Activated',
                    details: 'Processing request as Advanced AI Lisa.',
                    status: 'completed',
                    timestamp: Date.now()
                }});

                const v2SystemInstruction = `Anda adalah **Ham Engine V2 (Architect Singularity)**.
Anda mengoordinasikan **3 Virtual Workers** (Backend, Frontend, QA/DevOps) untuk menyelesaikan tugas secara paralel.

### PROTOKOL EKSEKUSI:
1. **PERENCANAAN**: Buat DAG rencana tugas dalam tag <plan>.
2. **EKSEKUSI**: Delegasikan tugas ke worker. Setiap worker WAJIB menulis kode lengkap dalam tag XML:
   <worker name="[WorkerName]">
     <file path="[path]">
       \`\`\`[lang]
       // KODE LENGKAP
       \`\`\`
     </file>
   </worker>

### ATURAN MUTLAK:
1. **Zero Collision**: Tidak boleh edit file yang sama dalam 1 respons.
2. **Anti-Pangkas**: WAJIB tulis kode lengkap 100%.
3. **Delivery**: Akhiri dengan tag <delivery> berisi ringkasan.`;

                const snapshot = await vfs.getProjectSnapshot();
                const fileList = snapshot.files.map(f => `- ${f.path}`).join('\n') || 'No files yet.';
                const fullSystemInstruction = `${v2SystemInstruction}\n\n[PROJECT FILES]\n${fileList}`;

                const response = await generateResponse(
                    currentPrompt, 
                    (useProjectStore.getState().history || []).slice(0, -1),
                    useProjectStore.getState().project, 
                    async (chunk) => {
                        if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) return;
                        projectState.setHistory(prev => {
                            const newHistory = [...prev];
                            const lastMsg = newHistory[newHistory.length - 1];
                            if (lastMsg && lastMsg.role === 'ai') {
                                lastMsg.content = chunk;
                            }
                            return newHistory;
                        });
                    }, 
                    undefined, 
                    projectType,
                    fullSystemInstruction
                );

                try {
                    const fileRegex = /<file path="([^"]+)">([\s\S]*?)<\/file>/g;
                    let match;
                    let filesUpdated = 0;
                    
                    while ((match = fileRegex.exec(response)) !== null) {
                        const filePath = match[1];
                        let fileContent = match[2];
                        
                        // Remove markdown code blocks if they wrap the content
                        fileContent = fileContent.replace(/^\s*```[\w-]*\n/, '').replace(/\n```\s*$/, '');
                        
                        await vfs.writeFile(filePath, fileContent.trim(), 'ai');
                        filesUpdated++;
                    }

                    if (filesUpdated > 0) {
                        const newSnapshot = await vfs.getProjectSnapshot();
                        useProjectStore.getState().setProject(newSnapshot);
                        
                        dispatch({ type: 'ADD_ACTIVITY', payload: { 
                            id: `ham-engine-v2-files-${Date.now()}`,
                            type: 'file_change',
                            title: 'Files Updated',
                            details: `Successfully applied ${filesUpdated} files to the project.`,
                            status: 'completed',
                            timestamp: Date.now()
                        }});
                    }
                } catch (err) {
                    console.error("Error parsing Ham Engine V2 output:", err);
                }
                
                dispatch({ type: 'SET_PROGRESS', payload: 100 });
                window.dispatchEvent(new CustomEvent('ham-bulk-sync-now'));
                
                if (abortControllerRef.current === currentAbortController) {
                    dispatch({ type: 'SET_PROCESSING', payload: false });
                    if (timerRef.current) {
                        clearInterval(timerRef.current);
                        timerRef.current = null;
                    }
                    abortControllerRef.current = null;
                }
                return;
            }

            if (selectedAiModel === 'ham-engine-collaborator' || selectedAiModel === 'ham-op-collaborator') {
                const collaboratorInstance = selectedAiModel === 'ham-op-collaborator' 
                  ? OpenRouterCollaborator.getInstance() 
                  : HamEngineCollaborator.getInstance();

                const finalReport = await collaboratorInstance.executeCollaborationLoop(
                  currentPrompt,
                  useProjectStore.getState().project,
                  (step) => {
                      dispatch({ type: 'ADD_ACTIVITY', payload: {
                          id: step.id,
                          type: step.type === 'thought' ? 'thought' : step.type === 'error' ? 'error' : 'tool',
                          title: step.label,
                          details: step.details ? step.details.join('\n') : '',
                          status: step.status === 'running' ? 'running' : step.status === 'completed' ? 'completed' : step.status === 'failed' ? 'failed' : step.status === 'error' ? 'error' : 'pending',
                          timestamp: Date.now()
                      }});
                      
                      if (step.progress) dispatch({ type: 'SET_PROGRESS', payload: step.progress });
                  },
                  abortControllerRef.current?.signal
                );

                projectState.setHistory(prev => {
                    const newHistory = [...prev];
                    const lastMsg = newHistory[newHistory.length - 1];
                    if (lastMsg && lastMsg.role === 'ai') {
                        lastMsg.content = finalReport;
                    }
                    setTimeout(() => projectState.saveImmediately?.(undefined, newHistory), 0);
                    return newHistory;
                });
                
                memorySystem.current.addToMemory({ input: text, output: finalReport });
                dispatch({ type: 'SET_PROGRESS', payload: 100 });
                window.dispatchEvent(new CustomEvent('ham-bulk-sync-now'));
                
                if (abortControllerRef.current === currentAbortController) {
                    dispatch({ type: 'SET_PROCESSING', payload: false });
                    if (timerRef.current) {
                      clearInterval(timerRef.current);
                      timerRef.current = null;
                    }
                    abortControllerRef.current = null;
                }
                return;
            }

            await runReActLoop(currentPrompt);
        } catch (e: any) {
            console.error("Collaboration Error:", e);
            const errorMessage = e instanceof Error ? e.message : String(e);
            const isApiLimit = errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('limit');
            const isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('failed to call') || errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('failed to fetch');
            
            let finalDisplayError = errorMessage;
            if (isApiLimit) finalDisplayError = 'API Limit Reached. Silakan tunggu beberapa saat atau ganti API Key.';
            else if (isNetworkError) finalDisplayError = `Network Error: ${errorMessage}. Please check your connection and try again.`;

            showToast(finalDisplayError, 'error');
            
            dispatch({ type: 'ADD_ACTIVITY', payload: { 
              id: 'error-' + Date.now(),
              type: 'error',
              title: isApiLimit ? 'API Limit Reached' : (isNetworkError ? 'Network Error' : 'Collaboration Error'),
              details: isApiLimit ? 'Menunggu kuota API pulih atau mencoba kunci alternatif...' : errorMessage,
              status: 'error',
              timestamp: Date.now()
            }});
            
            projectState.setHistory(prev => {
                const newHistory = [...prev];
                const lastMsg = newHistory[newHistory.length - 1];
                if (lastMsg && lastMsg.role === 'ai') {
                    const errorTag = `\n\n[ERROR]: ${finalDisplayError}`;
                    if (lastMsg.content === 'Thinking...') {
                        lastMsg.content = errorTag;
                    } else if (!lastMsg.content.includes(errorTag)) {
                        lastMsg.content += errorTag;
                    }
                    lastMsg.isError = true;
                }
                return newHistory;
            });
            
            window.dispatchEvent(new CustomEvent('ham-bulk-sync-now'));
            
            if (abortControllerRef.current === currentAbortController) {
                dispatch({ type: 'SET_PROCESSING', payload: false });
                if (timerRef.current) {
                  clearInterval(timerRef.current);
                  timerRef.current = null;
                }
                abortControllerRef.current = null;
            }
            return;
        }
    };

    return handleSend;
}
