/* eslint-disable no-useless-assignment */
import {
  ProjectData,
  GenerationStep,
} from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { getGlobalInstructions, saveState } from "./utils";
import { processWorkerTask } from "./workerTaskProcessor";
import { engineEventBus } from "./EventBus";

export async function runWorkerPhase(
  project: ProjectData | null,
  state: EngineState,
  projectId: string,
  onStep: (step: GenerationStep) => void,
  signal?: AbortSignal,
): Promise<number> {
  let completedCount = state.manifest.modules.filter(
    (m) => m.status === "verified",
  ).length;
  const globalRules = await getGlobalInstructions("worker");

  // Circuit Breaker (Anti-Infinite Loop Protocol)
  let iterationCount = 0;
  let apiLimitRetries = 0;
  const MAX_ITERATIONS = 10000; // Increased limit to allow larger projects
  
  let manifestComplete = state.manifestReady;
  
  const onManifestComplete = () => { manifestComplete = true; };
  engineEventBus.subscribe('MANIFEST_COMPLETE', onManifestComplete);

  // Condition variable to wake up the loop
  let wakeUp: (() => void) | null = null;
  const onWakeUpEvent = () => {
      if (wakeUp) {
          wakeUp();
          wakeUp = null;
      }
  };
  
  engineEventBus.subscribe('MODULE_GENERATED', onWakeUpEvent);
  engineEventBus.subscribe('MODULE_VERIFIED', onWakeUpEvent);

  try {
      while (true) {
        if (signal?.aborted) throw new Error("cancelled");
        iterationCount++;
        if (iterationCount > MAX_ITERATIONS) {
          onStep({
            id: "circuit-breaker",
            type: "error",
            label: "Circuit Breaker Tripped",
            status: "failed",
            details: [
              "Maximum module iterations reached. Halting to prevent infinite loop.",
            ],
          });
          break;
        }
    
        const totalModules = state.manifest.modules.length;
        if (completedCount > 0 && completedCount % 5 === 0) {
          onStep({
            id: "heartbeat",
            type: "thought",
            label: "System Check",
            status: "running",
            details: ["Syncing State...", "Cooling Down..."],
            progress: 10 + (completedCount / totalModules) * 80,
          });
          await new Promise((r) => setTimeout(r, 500));
        }
    
        const pendingModules = state.manifest.modules.filter(
          (m) => m.status === "pending" || m.status === "failed",
        );
        const verifiedModules = state.manifest.modules.filter(m => m.status === 'verified');
        
        if (manifestComplete && pendingModules.length === 0) {
            break; // All done
        }
    
        let readyTasks = pendingModules.filter((m) => {
          if (m.status === "failed" && m.attempts >= 3) return false;
          if (!m.dependencies || m.dependencies.length === 0) return true;
          return m.dependencies.every((depId) => {
            const dep = state.manifest.modules.find((d) => d.id === depId);
            return dep?.status === "verified";
          });
        });
    
        if (readyTasks.length === 0) {
          if (!manifestComplete) {
              // Wait for new modules or manifest completion
              await new Promise<void>(resolve => {
                  wakeUp = resolve;
                  // Timeout just in case
                  setTimeout(() => { if (wakeUp) { wakeUp(); wakeUp = null; } }, 2000);
              });
              continue;
          }
            
          const validFallbacks = pendingModules.filter(
            (m) => m.status !== "failed" || m.attempts < 3,
          );
          if (validFallbacks.length > 0) {
            readyTasks = [validFallbacks[0]];
          }
        }
    
        if (readyTasks.length === 0) {
          if (pendingModules.length > 0) {
            const failedModules = pendingModules.filter(
              (m) => m.status === "failed" && m.attempts >= 3,
            );
            if (failedModules.length === pendingModules.length) {
              onStep({
                id: "deadlock",
                type: "error",
                label: "Production Halted",
                status: "failed",
                details: ["All remaining modules exceeded max retry attempts."],
              });
              break;
            }
          }
          break;
        }
    
        // Dynamic Concurrency: Adjust limit based on API limit retries and success rate
        let CONCURRENCY_LIMIT = 3;
        if (state.apiLimitRetries > 0) {
          CONCURRENCY_LIMIT = 1; // Scale down on rate limits
        } else if (readyTasks.length > 10) {
          CONCURRENCY_LIMIT = 5; // Scale up for large batches if healthy
        }
    
        const tasksToRun = readyTasks.slice(0, CONCURRENCY_LIMIT);
    
        // Mark tasks as in_progress
        tasksToRun.forEach((task) => {
          task.status = "in_progress";
        });
        await saveState(projectId, state);
    
        const taskPromises = tasksToRun.map(async (nextTask) => {
          const result = await processWorkerTask(
            nextTask,
            project,
            state,
            projectId,
            onStep,
            globalRules,
            completedCount,
            totalModules,
            signal,
          );
    
          if (result.isApiLimit) {
            apiLimitRetries++;
            if (apiLimitRetries > 10) {
              onStep({
                id: `task-${nextTask.id}`,
                type: "error",
                label: `API Limit Reached`,
                status: "failed",
                details: ["API limit exceeded maximum retries. Halting."],
              });
              throw new Error(`API Limit exceeded maximum retries (10).`);
            }
            iterationCount -= result.iterationCountDecrement;
            const delay = result.backoffDelay || 30000;
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
    
          completedCount += result.completedCountIncrement;
          
          if (result.success) {
              engineEventBus.publish('MODULE_VERIFIED', nextTask);
          }
        });
    
        const results = await Promise.allSettled(taskPromises);
    
        // Check for critical errors that should halt the entire worker phase
        for (const res of results) {
          if (res.status === "rejected") {
            if (
              res.reason instanceof Error &&
              res.reason.message.includes("API Limit exceeded")
            ) {
              throw res.reason;
            }
          }
        }
      }
  } finally {
      engineEventBus.unsubscribe('MANIFEST_COMPLETE', onManifestComplete);
      engineEventBus.unsubscribe('MODULE_GENERATED', onWakeUpEvent);
      engineEventBus.unsubscribe('MODULE_VERIFIED', onWakeUpEvent);
  }
  return completedCount;
}
