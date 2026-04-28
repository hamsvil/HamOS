/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../../components/HamAiStudio/types";
import { loadState, saveState } from "../../openRouterEngine/utils";
import { runArchitectPhase } from "../../openRouterEngine/architect";
import { runWorkerPhase } from "../../openRouterEngine/worker";
import { runSupervisorPhase } from "../../openRouterEngine/supervisor";
import { QATesterAgent } from "../../openRouterEngine/qaTester";

export class OpenRouterCollaborator {
  private static instance: OpenRouterCollaborator;
  private executionQueue: Promise<string> = Promise.resolve('');

  private constructor() {}

  public static getInstance(): OpenRouterCollaborator {
    if (!OpenRouterCollaborator.instance) {
      OpenRouterCollaborator.instance = new OpenRouterCollaborator();
    }
    return OpenRouterCollaborator.instance;
  }

  // --- CORE ENGINE LOOP ---
  public executeCollaborationLoop(
    userRequest: string,
    project: ProjectData | null,
    onStep: (step: GenerationStep) => void
  ): Promise<string> {
    
    // Concurrent Execution Race Condition Fix: Promise Queue with Deadlock Prevention
    const currentQueue = this.executionQueue;
    
    const nextTask = async () => {
        try {
            await currentQueue.catch(() => {}); // Wait for previous to finish, ignore its errors
            
            const projectId = project?.id || 'default';
            let state = await loadState(projectId);
            
            // Enhanced State Reset (Anti-State Lock Protocol)
            const isContinueCommand = /^(lanjut|lanjutkan|continue|resume)$/i.test(userRequest.trim());
            
            if (!isContinueCommand && state.manifest.goal !== userRequest && state.manifest.goal !== '') {
                // Force reset if the goal changes to prevent getting stuck on old failed manifests
                state = {
                    manifestReady: false,
                    manifest: { goal: userRequest, strategy: '', modules: [], contextSummary: '', lastKnownGoodState: null },
                    currentTaskId: null
                };
                await saveState(projectId, state);
            } else if (state.manifestReady) {
                // Crash Recovery Protocol (Level 6)
                // If the engine crashed or the tab was closed while a task was running, it will be stuck in 'in_progress'.
                let recoveredCount = 0;
                state.manifest.modules.forEach(m => {
                    if (m.status === 'in_progress') {
                        m.status = 'pending';
                        m.attempts = 0;
                        recoveredCount++;
                    }
                });
                if (recoveredCount > 0) {
                    await saveState(projectId, state);
                    onStep({ id: 'crash-recovery', type: 'thought', label: 'Crash Recovery', status: 'completed', details: [`Recovered ${recoveredCount} interrupted modules. Resetting to pending.`] });
                }

                // Zombie State Auto-Heal Protocol
                const pendingCount = state.manifest.modules.filter(m => m.status === 'pending' || m.status === 'in_progress').length;
                const failedCount = state.manifest.modules.filter(m => m.status === 'failed' && m.attempts >= 3).length;
                const unverifiedCount = state.manifest.modules.filter(m => m.status !== 'verified').length;
                
                if (unverifiedCount > 0 && pendingCount === 0 && failedCount === unverifiedCount) {
                    // Auto-heal: Reset failed modules to give them another chance without wiping verified modules
                    state.manifest.modules.forEach(m => {
                        if (m.status === 'failed') {
                            m.status = 'pending';
                            m.attempts = 0;
                            m.lastError = undefined;
                        }
                    });
                    await saveState(projectId, state);
                    onStep({ id: 'zombie-heal', type: 'thought', label: 'Self-Healing', status: 'completed', details: ['Recovered from Zombie State. Retrying failed modules.'] });
                }
            }

            // 1. ARCHITECT PHASE
            await runArchitectPhase(userRequest, project, state, projectId, onStep);

            // 2 & 3. WORKER SWARM & SUPERVISOR LOOP
            let isPerfect = false;
            let loopCount = 0;
            let completedCount = 0;
            
            while (!isPerfect && loopCount < 3) {
                loopCount++;
                completedCount = await runWorkerPhase(project, state, projectId, onStep);
                
                // 3. SUPERVISOR PHASE (Integration Check)
                isPerfect = await runSupervisorPhase(project, state, projectId, onStep);
                
                if (!isPerfect) {
                    onStep({ id: `supervisor-loop-${loopCount}`, type: 'thought', label: 'Swarm Reboot', status: 'running', details: ['Restarting Worker Swarm to apply Supervisor fixes...'] });
                }
            }

            // 4. AUTONOMOUS QA & DYNAMIC TESTING
            const qaResult = await QATesterAgent.runTest('auto', project || { id: projectId, name: 'New Project', description: userRequest, files: [] }, onStep);
            if (!qaResult.success) {
                onStep({ id: 'qa-fail', type: 'error', label: 'QA Failed', status: 'completed', details: ['Crash detected. Sending back to Worker Agent for Self-Healing.'] });
                
                // Re-run worker phase with QA logs
                const healPrompt = `The QA Tester Agent found a crash during runtime. Fix the following issue:\n\nLOGS:\n${qaResult.logs}`;
                // Add a temporary module to fix the crash
                state.manifest.modules.push({
                    id: `qa_fix_${Date.now()}`,
                    name: 'QA Crash Fix',
                    path: project?.files.find(f => f.path.endsWith('.tsx') || f.path.endsWith('.java'))?.path || 'src/App.tsx', // Better default target
                    description: healPrompt,
                    dependencies: [],
                    action: 'update',
                    status: 'pending',
                    attempts: 0
                });
                
                await saveState(projectId, state);
                
                // Re-run worker phase
                completedCount = await runWorkerPhase(project, state, projectId, onStep);
            }

            // 5. GARBAGE COLLECTION (Verification Scan Only - Anti-Delete Protocol)
            onStep({ id: 'garbage-collection', type: 'thought', label: 'Verification Scan', status: 'running', details: ['Scanning workspace integrity...'], progress: 95 });
            if (project && project.files) {
                const activePaths = new Set(state.manifest.modules.map(m => m.path));
                let unverifiedCount = 0;
                for (const file of project.files) {
                    const isCore = file.path.includes('package.json') || file.path.includes('index.html') || file.path.includes('vite.config') || file.path.includes('tailwind.config') || file.path.includes('tsconfig');
                    if (!isCore && file.path.startsWith('src/') && !activePaths.has(file.path)) {
                        unverifiedCount++;
                    }
                }
                if (unverifiedCount > 0) {
                    onStep({ id: 'garbage-collection', type: 'success', label: 'Workspace Verified', status: 'completed', details: [`Found ${unverifiedCount} unmanaged files. Kept intact per Anti-Delete Protocol.`] });
                } else {
                    onStep({ id: 'garbage-collection', type: 'success', label: 'Workspace Verified', status: 'completed', details: ['All files are tracked and managed.'] });
                }
            }

            // 6. FINAL BUILD & REPORT
            const finalTotalModules = state.manifest.modules.length;
            onStep({ id: 'final-build', type: 'build', label: 'The Assembler', status: 'running', details: ['Final Compilation...', 'Recursive Integration Check...'], progress: 98 });
            
            const finalReport = `
### HAM OP COLLABORATOR REPORT (OPENROUTER)
**Status**: ${completedCount === finalTotalModules ? 'BUILD SUCCESS' : 'PARTIAL BUILD'}
**Modules Built**: ${completedCount}/${finalTotalModules}
**Context Summary**:
${state.manifest.contextSummary}

**Manifest**:
${state.manifest.modules.map(m => `- [${m.status.toUpperCase()}] ${m.name} (${m.path})`).join('\n')}
`;

            // Clear state on full success to allow new projects
            if (completedCount === finalTotalModules) {
                state.manifestReady = false;
                state.manifest.modules = [];
                await saveState(projectId, state);
            }

            onStep({ id: 'final-build', type: 'build', label: 'Factory Shutdown', status: 'completed', details: ['System Hibernating.'], progress: 100 });

            return finalReport;

        } catch (globalError: any) {
            console.error("CRITICAL ENGINE FAILURE:", globalError);
            const errorMessage = globalError instanceof Error ? globalError.message : String(globalError);
            onStep({ id: 'critical-failure', type: 'error', label: 'SYSTEM FAILURE', status: 'error', details: ['Engine crashed unexpectedly.', errorMessage] });
            return `CRITICAL FAILURE: ${errorMessage}`;
        }
    };

    this.executionQueue = nextTask();
    
    return this.executionQueue;
  }
}
