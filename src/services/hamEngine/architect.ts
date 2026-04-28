/* eslint-disable no-useless-assignment */
import {
  ProjectData,
  GenerationStep,
} from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import {
  getGlobalInstructions,
  generateContentStream,
  saveState,
  sanitizePath,
  ENGINE_CONFIG,
} from "./utils";
import { vfs } from "../vfsService";
import { engineEventBus } from "./EventBus";

export async function runArchitectPhase(
  userRequest: string,
  project: ProjectData | null,
  state: EngineState,
  projectId: string,
  onStep: (step: GenerationStep) => void,
  signal?: AbortSignal,
): Promise<void> {
  if (state.manifestReady) return;

  onStep({
    id: "architect",
    type: "thought",
    label: "The Architect",
    status: "running",
    details: [
      "Loading Global Instructions...",
      "Mapping Global Dependency Graph...",
    ],
    progress: 5,
  });

  const globalRules = await getGlobalInstructions("architect");

  const snapshot = await vfs.getProjectSnapshot();

  // SQR-SVFS V5.0: Surgical Memory for Architect
  const { contextInjector } = await import("../ai/contextInjector");
  const fileList = await contextInjector.getSurgicalContext(
    userRequest,
    snapshot.files,
  );

  const packageJson =
    snapshot.files.find((f) => f.path === "package.json")?.content || "{}";

  const architectPrompt = `
TASK: ARCHITECTURE_DECOMPOSITION
VISION: "${userRequest}"
FILES: ${fileList}
PACKAGE_JSON: ${packageJson}
RULES:
- NO_DELETION
- ROOT_CONFIGS_ONLY (package.json, vite.config.ts in root)
OUTPUT_FORMAT: JSONL (JSON Lines)
Each line MUST be a valid JSON object.
First line MUST be strategy: {"type": "strategy", "content": "..."}
Subsequent lines MUST be modules: {"type": "module", "id": "...", "name": "...", "path": "...", "description": "...", "dependencies": ["..."], "action": "create|update"}
Last line MUST be contextSummary: {"type": "contextSummary", "content": "..."}
`;
  const architectSystem = `You are The Architect (Ham AI-Studio Layer 1).
Your goal is Structural Mapping.
Output ONLY valid JSONL (JSON Lines). Do not wrap in markdown blocks.

GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}
`;

  let retryCount = 0;
  let apiLimitRetries = 0;

  while (true) {
    if (signal?.aborted) throw new Error("cancelled");
    try {
      let buffer = "";
      state.manifest.modules = [];
      
      await generateContentStream(
        'gemini-2.0-flash',
        architectPrompt,
        architectSystem,
        (chunk) => {
          buffer += chunk;
          let newlineIndex;
          while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
            const line = buffer.slice(0, newlineIndex).trim();
            buffer = buffer.slice(newlineIndex + 1);
            if (!line) continue;
            
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'strategy') {
                state.manifest.strategy = parsed.content || "Standard Execution";
              } else if (parsed.type === 'module') {
                const mod = {
                  id: parsed.id,
                  name: parsed.name,
                  path: sanitizePath(String(parsed.path || "")),
                  description: parsed.description,
                  dependencies: parsed.dependencies || [],
                  action: parsed.action,
                  status: "pending" as const,
                  attempts: 0
                };
                state.manifest.modules.push(mod);
                engineEventBus.publish('MODULE_GENERATED', mod);
              } else if (parsed.type === 'contextSummary') {
                state.manifest.contextSummary = parsed.content;
              }
            } catch (e) {
              console.warn("Architect JSONL Parse Error on line:", line, e);
            }
          }
        },
        ENGINE_CONFIG.ARCHITECT_TIMEOUT,
        signal
      );
      
      // Process any remaining buffer
      if (buffer.trim()) {
        try {
          const parsed = JSON.parse(buffer.trim());
          if (parsed.type === 'contextSummary') {
            state.manifest.contextSummary = parsed.content;
          }
        } catch (e) {
          // ignore
        }
      }

      if (state.manifest.modules.length > 0) {
        // DAG Cycle Detection & Dangling Pointer Cleanup (Level 8 Protocol)
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        function breakCycles(moduleId: string) {
          visited.add(moduleId);
          recursionStack.add(moduleId);

          const mod = state.manifest.modules.find(m => m.id === moduleId);
          if (mod && mod.dependencies) {
            for (let i = mod.dependencies.length - 1; i >= 0; i--) {
              const depId = mod.dependencies[i];

              // Remove dangling pointers (dependency doesn't exist in manifest)
              if (!state.manifest.modules.some(m => m.id === depId)) {
                mod.dependencies.splice(i, 1);
                continue;
              }

              if (!visited.has(depId)) {
                breakCycles(depId);
              } else if (recursionStack.has(depId)) {
                // Cycle detected! Break it.
                console.warn(`[HamEngine] Circular dependency broken: ${moduleId} -> ${depId}`);
                mod.dependencies.splice(i, 1);
              }
            }
          }
          recursionStack.delete(moduleId);
        }

        for (const mod of state.manifest.modules) {
          if (!visited.has(mod.id)) breakCycles(mod.id);
        }

        state.manifestReady = true;
        await saveState(projectId, state);
        engineEventBus.publish('MANIFEST_COMPLETE');
        
        onStep({
          id: "architect",
          type: "thought",
          label: "Manifest Generated",
          status: "completed",
          details: [`${state.manifest.modules.length} modules queued.`],
          progress: 10,
        });
        break; // Success, exit loop
      } else {
        throw new Error("Invalid Architect JSONL: No modules generated");
      }
    } catch (e: any) {
      const errorMsg = e instanceof Error ? e.message : String(e);
      const isApiLimit =
        errorMsg.toLowerCase().includes("429") ||
        errorMsg.toLowerCase().includes("quota") ||
        errorMsg.toLowerCase().includes("rate limit");

      if (isApiLimit) {
        apiLimitRetries++;
        if (apiLimitRetries > 10) {
          throw new Error(`API Limit exceeded maximum retries (10, { cause: e }).`, { cause: e });
        }

        // Smart Exponential Backoff with Jitter
        const backoffDelay =
          10000 * Math.pow(2, apiLimitRetries - 1) + Math.random() * 2000;

        onStep({
          id: "architect",
          type: "error",
          label: "API Limit Reached",
          status: "warning",
          details: [
            `API limit exceeded. Waiting ${Math.round(backoffDelay / 1000)}s before retrying...`,
          ],
        });
        await new Promise((resolve) => setTimeout(resolve, backoffDelay));
        continue; // Retry automatically
      }

      onStep({
        id: "architect",
        type: "error",
        label: "Architect Failed",
        status: "error",
        details: [errorMsg],
      });
      throw new Error(`Architect Error: ${errorMsg}`, { cause: e });
    }
  }
}
