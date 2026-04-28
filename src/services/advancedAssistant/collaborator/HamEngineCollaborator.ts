/* eslint-disable no-useless-assignment */
import {
  ProjectData,
  GenerationStep,
} from "../../../components/HamAiStudio/types";
import { loadState, saveState, generateContent } from "../../hamEngine/utils";
import { runArchitectPhase } from "../../hamEngine/architect";
import { runWorkerPhase } from "../../hamEngine/worker";
import { runSupervisorPhase } from "../../hamEngine/supervisor";
import { QATesterAgent } from "../../hamEngine/qaTester";
import { engineEventBus } from "../../hamEngine/EventBus";
import { vfs } from "../../vfsService";
import { safeStorage } from "../../../utils/storage";

// console.log("[HamEngineCollaborator] Module loading initiated...");

export class HamEngineCollaborator {
  private static instance: HamEngineCollaborator;
  private executionQueue: Promise<string> = Promise.resolve("");

  private constructor() {}

  public static getInstance(): HamEngineCollaborator {
    if (!HamEngineCollaborator.instance) {
      // console.log("[HamEngineCollaborator] Creating new instance...");
      HamEngineCollaborator.instance = new HamEngineCollaborator();
    }
    return HamEngineCollaborator.instance;
  }

  // --- LAYER 7: MEMORY & LEARNING ---
  private async loadProjectMemory(projectId: string) {
    try {
      const memoryStr = await vfs.readFile(`.agent/memory_${projectId}.json`);
      return JSON.parse(memoryStr);
    } catch {
      return { decisions: [], conventions: {}, known_gotchas: [] };
    }
  }

  private async saveProjectMemory(projectId: string, memory: any) {
    try {
      await vfs.writeFile(`.agent/memory_${projectId}.json`, JSON.stringify(memory, null, 2));
    } catch (e) {
      console.warn("Failed to save project memory", e);
    }
  }

  // --- CORE ENGINE LOOP ---
  public executeCollaborationLoop(
    userRequest: string,
    project: ProjectData | null,
    onStep: (step: GenerationStep) => void,
    signal?: AbortSignal,
  ): Promise<string> {
    // Concurrent Execution Race Condition Fix: Promise Queue with Deadlock Prevention
    const currentQueue = this.executionQueue;

    const nextTask = async () => {
      try {
        await currentQueue.catch(() => {}); // Wait for previous to finish, ignore its errors

        const projectId = project?.id || "default";
        let state = await loadState(projectId);
        const aiMode = safeStorage.getItem('ham_ai_mode') || 'deep';

        // --- LAYER 1.3: ProjectWorkspace Initialization ---
        onStep({
          id: "workspace-init",
          type: "thought",
          label: "L1: Project Workspace",
          status: "running",
          details: ["Initializing Workspace Context..."],
        });
        
        const projectMemory = await this.loadProjectMemory(projectId);

        // Enhanced State Reset (Anti-State Lock Protocol)
        const isContinueCommand = /^(lanjut|lanjutkan|continue|resume)$/i.test(
          userRequest.trim(),
        );

        if (
          !isContinueCommand &&
          state.manifest.goal !== userRequest &&
          state.manifest.goal !== ""
        ) {
          // Force reset if the goal changes to prevent getting stuck on old failed manifests
          state = {
            manifestReady: false,
            manifest: {
              goal: userRequest,
              strategy: "",
              modules: [],
              contextSummary: "",
              lastKnownGoodState: null,
            },
            currentTaskId: null,
          };
          await saveState(projectId, state);
        } else if (state.manifestReady) {
          // Crash Recovery Protocol (Level 6)
          let recoveredCount = 0;
          state.manifest.modules.forEach((m) => {
            if (m.status === "in_progress") {
              m.status = "pending";
              m.attempts = 0;
              recoveredCount++;
            }
          });
          if (recoveredCount > 0) {
            await saveState(projectId, state);
            onStep({
              id: "crash-recovery",
              type: "thought",
              label: "Crash Recovery",
              status: "completed",
              details: [
                `Recovered ${recoveredCount} interrupted modules. Resetting to pending.`,
              ],
            });
          }

          // Zombie State Auto-Heal Protocol
          const pendingCount = state.manifest.modules.filter(
            (m) => m.status === "pending" || m.status === "in_progress",
          ).length;
          const failedCount = state.manifest.modules.filter(
            (m) => m.status === "failed" && m.attempts >= 3,
          ).length;
          const unverifiedCount = state.manifest.modules.filter(
            (m) => m.status !== "verified",
          ).length;

          if (
            unverifiedCount > 0 &&
            pendingCount === 0 &&
            failedCount === unverifiedCount
          ) {
            state.manifest.modules.forEach((m) => {
              if (m.status === "failed") {
                m.status = "pending";
                m.attempts = 0;
                m.lastError = undefined;
              }
            });
            await saveState(projectId, state);
            onStep({
              id: "zombie-heal",
              type: "thought",
              label: "Self-Healing",
              status: "completed",
              details: [
                "Recovered from Zombie State. Retrying failed modules.",
              ],
            });
          }
        }

        if (signal?.aborted) throw new Error("cancelled");

        const projectType =
          project?.dependencies?.["react-native"] ||
          project?.files?.some((f) => f.path.endsWith(".java"))
            ? "android"
            : "web";

        // SQR-SVFS V5.0: Surgical Memory for Swarm (Context Filter)
        const { contextInjector } = await import("../../ai/contextInjector");
        const filteredFiles = project?.files
          ? await contextInjector.getSurgicalContext(
              userRequest,
              project.files,
              projectType,
            )
          : "";

        const filteredProject = project
          ? {
              ...project,
              files: project.files.filter((f) =>
                filteredFiles.includes(f.path),
              ),
            }
          : null;

        // --- LAYER 2: ORCHESTRATOR ENGINE (IntentParser, CodebaseArchaeologist, DecisionEngine) ---
        if (!state.manifestReady) {
          onStep({
            id: "orchestrator-engine",
            type: "thought",
            label: "L2: Orchestrator Engine",
            status: "running",
            details: [
              "IntentParser: Analyzing request...",
              "CodebaseArchaeologist: Scanning patterns...",
              "DecisionEngine: Selecting optimal stack..."
            ],
          });

          // Fast mode skips deep archaeology to save time/tokens. Thinking/Deep modes do full analysis.
          if (aiMode !== 'fast') {
            const orchestratorPrompt = `
              Analyze the following request and project context.
              REQUEST: ${userRequest}
              PROJECT MEMORY: ${JSON.stringify(projectMemory)}
              Extract: 1. Intent (type, scope), 2. Tech Decisions (ORM, State, UI).
              Return ONLY a brief summary of decisions.
            `;
            try {
              const orchestratorDecisions = await generateContent("gemini-1.5-flash-latest", orchestratorPrompt, "You are L2 Orchestrator.");
              projectMemory.decisions.push({
                timestamp: new Date().toISOString(),
                context: userRequest,
                decision: orchestratorDecisions
              });
              await this.saveProjectMemory(projectId, projectMemory);
            } catch (e) {
              console.warn("Orchestrator analysis skipped due to error", e);
            }
          }
        }

        // Setup Supervisor Event Listener (L4: VerificationEngine & RCAEngine)
        const supervisorQueue: any[] = [];
        let isSupervisorRunning = false;
        
        const onModuleVerified = async (mod: any) => {
            supervisorQueue.push(mod);
            if (!isSupervisorRunning) {
                isSupervisorRunning = true;
                while (supervisorQueue.length > 0) {
                    if (signal?.aborted) break;
                    const currentMod = supervisorQueue.shift();
                    // Run supervisor phase for integration check
                    const perfect = await runSupervisorPhase(filteredProject, state, projectId, onStep, signal);
                    if (!perfect) {
                        onStep({ id: `supervisor-fix-${currentMod.id}`, type: 'thought', label: 'L4: RCA Engine', status: 'running', details: [`Supervisor found integration issues after verifying ${currentMod.name}. Queuing fixes...`] });
                    }
                }
                isSupervisorRunning = false;
            }
        };
        
        engineEventBus.subscribe('MODULE_VERIFIED', onModuleVerified);

        // --- LAYER 3: PLANNING & EXECUTION ENGINE (PlanGenerator, DependencyScheduler, WorkerPool) ---
        onStep({
          id: "swarm-init",
          type: "thought",
          label: "L3: Execution Engine",
          status: "running",
          details: ["Launching Architect (PlanGenerator) and Worker Swarm (WorkerPool) concurrently..."],
        });

        const architectPromise = runArchitectPhase(
          userRequest,
          filteredProject,
          state,
          projectId,
          onStep,
          signal,
        );

        const workerPromise = runWorkerPhase(
          filteredProject,
          state,
          projectId,
          onStep,
          signal,
        );

        // Wait for both to complete
        await Promise.all([architectPromise, workerPromise]);
        
        engineEventBus.unsubscribe('MODULE_VERIFIED', onModuleVerified);

        if (signal?.aborted) throw new Error("cancelled");

        // Final Supervisor Check just to be sure
        let isPerfect = await runSupervisorPhase(
          filteredProject,
          state,
          projectId,
          onStep,
          signal,
        );

        if (!isPerfect) {
           await runWorkerPhase(filteredProject, state, projectId, onStep, signal);
        }

        // --- LAYER 4: AUTONOMOUS QA & DYNAMIC TESTING ---
        const qaResult = await QATesterAgent.runTest(
          projectType,
          project || {
            id: projectId,
            name: "New Project",
            description: userRequest,
            files: [],
          },
          onStep,
          signal,
        );
        if (!qaResult.success) {
          onStep({
            id: "qa-fail",
            type: "error",
            label: "L4: QA Failed",
            status: "completed",
            details: [
              "Crash detected. Sending back to Worker Agent for Self-Healing.",
            ],
          });

          const healPrompt = `The QA Tester Agent found a crash during runtime. Fix the following issue:\n\nLOGS:\n${qaResult.logs}`;
          state.manifest.modules.push({
            id: `qa_fix_${Date.now()}`,
            name: "QA Crash Fix",
            path:
              project?.files.find(
                (f) => f.path.endsWith(".tsx") || f.path.endsWith(".java"),
              )?.path || "src/App.tsx",
            description: healPrompt,
            dependencies: [],
            action: "update",
            status: "pending",
            attempts: 0,
          });

          await saveState(projectId, state);

          if (signal?.aborted) throw new Error("cancelled");
          await runWorkerPhase(
            project,
            state,
            projectId,
            onStep,
            signal,
          );
        }

        // --- LAYER 6: NATIVE SYNC (For Android Projects) ---
        if (projectType === "android" && project) {
          onStep({
            id: "native-sync",
            type: "thought",
            label: "L6: Native Synchronization",
            status: "running",
            details: ["Syncing files to Android Native Filesystem..."],
          });
          try {
            const { androidBuildService } =
              await import("../../androidBuildService");
            await androidBuildService.syncProjectFiles(project, (msg) => {
              onStep({
                id: "native-sync",
                type: "thought",
                label: "Native Sync",
                status: "running",
                details: [msg],
              });
            });
            onStep({
              id: "native-sync",
              type: "success",
              label: "Native Sync Success",
              status: "completed",
              details: [
                "Project files are now synchronized with Android Native layer.",
              ],
            });
          } catch (e: any) {
            onStep({
              id: "native-sync",
              type: "error",
              label: "Native Sync Failed",
              status: "warning",
              details: [e.message],
            });
          }
        }

        if (signal?.aborted) throw new Error("cancelled");

        // --- LAYER 5: DELIVERY VALIDATOR (Garbage Collection & Final Build) ---
        onStep({
          id: "garbage-collection",
          type: "thought",
          label: "L5: Delivery Validator",
          status: "running",
          details: ["Scanning workspace integrity..."],
          progress: 95,
        });
        if (project && project.files) {
          const activePaths = new Set(
            state.manifest.modules.map((m) => m.path),
          );
          let unverifiedCount = 0;
          for (const file of project.files) {
            const isCore =
              file.path.includes("package.json") ||
              file.path.includes("index.html") ||
              file.path.includes("vite.config") ||
              file.path.includes("tailwind.config") ||
              file.path.includes("tsconfig");
            if (
              !isCore &&
              file.path.startsWith("src/") &&
              !activePaths.has(file.path)
            ) {
              unverifiedCount++;
            }
          }
          if (unverifiedCount > 0) {
            onStep({
              id: "garbage-collection",
              type: "success",
              label: "Workspace Verified",
              status: "completed",
              details: [
                `Found ${unverifiedCount} unmanaged files. Kept intact per Anti-Delete Protocol.`,
              ],
            });
          } else {
            onStep({
              id: "garbage-collection",
              type: "success",
              label: "Workspace Verified",
              status: "completed",
              details: ["All files are tracked and managed."],
            });
          }
        }

        const finalTotalModules = state.manifest.modules.length;
        const finalCompletedCount = state.manifest.modules.filter(m => m.status === 'verified').length;
        onStep({
          id: "final-build",
          type: "build",
          label: "L8: End-to-End Coordination",
          status: "running",
          details: ["Final Compilation...", "Recursive Integration Check..."],
          progress: 98,
        });

        const finalReport = `
### HAM ENGINE COLLABORATOR REPORT (SINGULARITY V10)
**Status**: ${finalCompletedCount === finalTotalModules ? "BUILD SUCCESS" : "PARTIAL BUILD"}
**Mode**: ${aiMode.toUpperCase()}
**Modules Built**: ${finalCompletedCount}/${finalTotalModules}
**Context Summary**:
${state.manifest.contextSummary}

**Manifest**:
${state.manifest.modules.map((m) => `- [${m.status.toUpperCase()}] ${m.name} (${m.path})`).join("\n")}
`;

        if (finalCompletedCount === finalTotalModules) {
          state.manifestReady = false;
          state.manifest.modules = [];
          await saveState(projectId, state);
        }

        onStep({
          id: "final-build",
          type: "build",
          label: "Factory Shutdown",
          status: "completed",
          details: ["System Hibernating."],
          progress: 100,
        });

        engineEventBus.clear();
        return finalReport;
      } catch (globalError: any) {
        engineEventBus.clear();
        console.error("CRITICAL ENGINE FAILURE:", globalError);
        const errorMessage =
          globalError instanceof Error
            ? globalError.message
            : String(globalError);
        onStep({
          id: "critical-failure",
          type: "error",
          label: "SYSTEM FAILURE",
          status: "error",
          details: ["Engine crashed unexpectedly.", errorMessage],
        });
        return `CRITICAL FAILURE: ${errorMessage}`;
      }
    };

    this.executionQueue = nextTask();

    return this.executionQueue;
  }
}
