/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { getGlobalInstructions, saveState } from "./utils";
import { vfs } from "../vfsService";
import { processTask } from "./taskProcessor";

export async function runWorkerPhase(
    project: ProjectData | null,
    state: EngineState,
    projectId: string,
    onStep: (step: GenerationStep) => void
): Promise<number> {
    let completedCount = state.manifest.modules.filter(m => m.status === 'verified').length;
    const globalRules = await getGlobalInstructions('worker');
    
    // Circuit Breaker (Anti-Infinite Loop Protocol)
    let iterationCount = 0;
    const MAX_ITERATIONS = 1000; // Increased limit to allow larger projects

    while (completedCount < state.manifest.modules.length) {
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
            onStep({ id: 'circuit-breaker', type: 'error', label: 'Circuit Breaker Tripped', status: 'failed', details: ['Maximum module iterations reached. Halting to prevent infinite loop.'] });
            break;
        }

        const totalModules = state.manifest.modules.length;
        if (completedCount > 0 && completedCount % 5 === 0) {
             onStep({ id: 'heartbeat', type: 'thought', label: 'System Check', status: 'running', details: ['Syncing State...', 'Cooling Down...'], progress: 10 + ((completedCount / totalModules) * 80) });
             await new Promise(r => setTimeout(r, 500));
        }

        const pendingModules = state.manifest.modules.filter(m => m.status === 'pending' || m.status === 'failed');
        
        let nextTask = pendingModules.find(m => {
            if (m.status === 'failed' && m.attempts >= 3) return false;
            return m.dependencies.every(depId => {
                const dep = state.manifest.modules.find(d => d.id === depId);
                return dep?.status === 'verified';
            });
        });

        if (!nextTask) {
             const validFallbacks = pendingModules.filter(m => m.status !== 'failed' || m.attempts < 3);
             if (validFallbacks.length > 0) {
                 nextTask = validFallbacks[0];
             }
        }

        if (!nextTask) {
            if (pendingModules.length > 0) {
                 const failedModules = pendingModules.filter(m => m.status === 'failed' && m.attempts >= 3);
                 if (failedModules.length === pendingModules.length) {
                      onStep({ id: 'deadlock', type: 'error', label: 'Production Halted', status: 'failed', details: ['All remaining modules exceeded max retry attempts.'] });
                      break;
                 }
            }
            break;
        }

        state.currentTaskId = nextTask.id;
        nextTask.status = 'in_progress';
        await saveState(projectId, state);

        const progressBase = 10 + ((completedCount / totalModules) * 80);
        const stepId = `task-${nextTask.id}`;
        onStep({ id: stepId, type: 'action', label: `Worker: ${nextTask.name}`, status: 'running', details: [`Context: ${state.manifest.contextSummary}`], progress: progressBase });

        if (nextTask.action === 'delete') {
            try {
                await vfs.unlink(nextTask.path);
                nextTask.status = 'verified';
                completedCount++;
                state.manifest.contextSummary += `\n- Deleted ${nextTask.name}: ${nextTask.path}`;
                await saveState(projectId, state);
                onStep({ id: stepId, type: 'action', label: `Module Deleted: ${nextTask.name}`, status: 'completed', details: ['File successfully removed.'], progress: progressBase + 5 });
                continue;
            } catch (e: any) {
                nextTask.status = 'verified';
                completedCount++;
                state.manifest.contextSummary += `\n- Deleted ${nextTask.name} (already absent)`;
                await saveState(projectId, state);
                onStep({ id: stepId, type: 'action', label: `Module Deleted: ${nextTask.name}`, status: 'completed', details: ['File already absent.'], progress: progressBase + 5 });
                continue;
            }
        }

        const result = await processTask(
            nextTask,
            state,
            project,
            projectId,
            globalRules,
            onStep,
            progressBase,
            completedCount
        );

        if (!result.success) {
            iterationCount--; // Don't count this iteration towards MAX_ITERATIONS (likely API limit)
            continue;
        }

        completedCount = result.completedCount;
    }
    return completedCount;
}
