/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { getGlobalInstructions, generateContent, saveState, sanitizePath, healAndParseJSON, ENGINE_CONFIG } from "./utils";
import { useProjectStore } from "../../store/projectStore";

export async function runArchitectPhase(
    userRequest: string,
    project: ProjectData | null,
    state: EngineState,
    projectId: string,
    onStep: (step: GenerationStep) => void
): Promise<void> {
    if (state.manifestReady) return;

    onStep({ id: 'architect', type: 'thought', label: 'The Architect', status: 'running', details: ['Loading Global Instructions...', 'Mapping Global Dependency Graph...'], progress: 5 });
    
    const globalRules = await getGlobalInstructions('architect');
    
    const fileList = project?.files
        .map(f => f.path)
        .filter(p => !p.includes('node_modules/') && !p.includes('.git/') && !p.includes('dist/') && !p.includes('build/'))
        .join('\n') || '';
        
    let packageJsonStr = '{}';
    try {
        const rawPkg = project?.files.find(f => f.path === 'package.json')?.content || '{}';
        const parsedPkg = JSON.parse(rawPkg);
        packageJsonStr = JSON.stringify({
            dependencies: parsedPkg.dependencies || {},
            devDependencies: parsedPkg.devDependencies || {}
        }, null, 2);
    } catch (e) {
        packageJsonStr = project?.files.find(f => f.path === 'package.json')?.content || '{}';
    }
    
    const architectPrompt = `
MEGA-VISION: ${userRequest}

EXISTING FILE STRUCTURE:
${fileList}

EXISTING PACKAGE.JSON:
${packageJsonStr}

LEVEL 4 PROTOCOL ACTIVATED: AUTONOMOUS INNOVATOR
You are a Strategic Goal Decomposer. Do not just write code; engineer a superior ecosystem.
1. Analyze the MEGA-VISION.
2. Formulate a highly innovative, optimized STRATEGY to achieve it.
3. Break down the strategy into Atomic Modules.
4. You MAY create custom utility scripts (action: "create_tool") in a 'scripts/' folder if it accelerates the vision (e.g., data generators, custom bundlers).
5. ANTI-DELETE PROTOCOL: You are STRICTLY FORBIDDEN from deleting any existing files. Do not use the "delete" action.

Format:
{
  "strategy": "Your brilliant, multi-step technical strategy to dominate this vision...",
  "modules": [
    { "id": "mod_1", "name": "AuthUtils", "path": "src/utils/auth.ts", "description": "JWT handling...", "dependencies": [], "action": "create" },
    { "id": "mod_2", "name": "DataGen", "path": "scripts/generate.js", "description": "Custom tool to generate 1M rows...", "dependencies": [], "action": "create_tool" },
    { "id": "mod_3", "name": "UpdateFile", "path": "src/old.ts", "description": "Update this file with new logic", "dependencies": [], "action": "update" }
  ],
  "contextSummary": "Initial setup for ${userRequest}"
}
`;
    const architectSystem = `You are The Architect (Ham AI-Studio Layer 1).
Your goal is Structural Mapping.
Output ONLY valid JSON.

GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}
`;

    let retryCount = 0;
    while (true) {
        try {
            const storeState = useProjectStore.getState() as any;
            const currentModel = storeState.aiConfig?.model || storeState.activeModel || ENGINE_CONFIG.DEFAULT_MODEL;
            const response = await generateContent(currentModel, architectPrompt, architectSystem, ENGINE_CONFIG.ARCHITECT_TIMEOUT, true, 'architect');
            let parsed;
            
            try {
                parsed = healAndParseJSON(response) as { strategy?: string, modules?: Array<{ id: string, name?: string, path?: string, description?: string, dependencies?: string[], action?: string }>, contextSummary?: string };
            } catch (e: any) {
                const msg = e instanceof Error ? e.message : String(e);
                throw new Error(`Architect JSON Error: ${msg}`, { cause: e });
            }
            
            if (parsed && parsed.modules) {
                state.manifest.strategy = parsed.strategy || 'Standard Execution';
                
                const rawModules = parsed.modules.map((m) => ({ 
                    ...m, 
                    path: sanitizePath(m.path || ''),
                    status: 'pending', 
                    attempts: 0,
                    dependencies: m.dependencies || []
                }));

                // DAG Cycle Detection & Dangling Pointer Cleanup (Level 8 Protocol)
                const visited = new Set<string>();
                const recursionStack = new Set<string>();

                function breakCycles(moduleId: string) {
                    visited.add(moduleId);
                    recursionStack.add(moduleId);

                    const mod = rawModules.find((m) => m.id === moduleId);
                    if (mod && mod.dependencies) {
                        for (let i = mod.dependencies.length - 1; i >= 0; i--) {
                            const depId = mod.dependencies[i];
                            
                            // Remove dangling pointers (dependency doesn't exist in manifest)
                            if (!rawModules.some((m) => m.id === depId)) {
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

                for (const mod of rawModules) {
                    if (!visited.has(mod.id)) {
                        breakCycles(mod.id);
                    }
                }

                state.manifest.modules = rawModules as any; // Type assertion needed due to EngineState type
                state.manifest.contextSummary = parsed.contextSummary || '';
                state.manifestReady = true;
                await saveState(projectId, state);
                onStep({ id: 'architect', type: 'thought', label: 'Manifest Generated', status: 'completed', details: [`${state.manifest.modules.length} modules queued.`], progress: 10 });
                break; // Success, exit loop
            } else {
                throw new Error("Invalid Architect JSON");
            }
        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            const isApiLimit = errorMsg.toLowerCase().includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit');
            
            if (isApiLimit) {
                retryCount++;
                if (retryCount > 10) {
                    throw new Error(`API Limit exceeded maximum retries (10, { cause: e }).`, { cause: e });
                }
                onStep({ id: 'architect', type: 'error', label: 'API Limit Reached', status: 'warning', details: [`API limit exceeded. Waiting 30 seconds before retrying (Attempt ${retryCount}/10)...`] });
                await new Promise(resolve => setTimeout(resolve, 30000));
                continue; // Retry automatically
            }
            
            onStep({ id: 'architect', type: 'error', label: 'Architect Failed', status: 'error', details: [errorMsg] });
            throw new Error(`Architect Error: ${errorMsg}`, { cause: e });
        }
    }
}
