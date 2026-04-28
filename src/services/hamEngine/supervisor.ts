/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { getGlobalInstructions, generateContent, saveState, ENGINE_CONFIG, healAndParseJSON, extractSkeleton } from "./utils";
import { vfs } from "../vfsService";
import { shadowVFS } from "./kernel/ShadowVFS";
import { vectorStore } from "../vectorStore";
import { Type } from "@google/genai";

export async function runSupervisorPhase(
    project: ProjectData | null,
    state: EngineState,
    projectId: string,
    onStep: (step: GenerationStep) => void,
    signal?: AbortSignal
): Promise<boolean> {
    onStep({ id: 'supervisor-check', type: 'thought', label: 'The Supervisor', status: 'running', details: ['Running Cross-Module Integration Check...', 'Analyzing imports/exports...'], progress: 95 });

    const globalRules = await getGlobalInstructions('supervisor');
    
    // Gather all verified modules' content
    const verifiedModules = state.manifest.modules.filter(m => m.status === 'verified');
    if (verifiedModules.length === 0) return true; // Nothing to check

    let combinedCode = '';
    let totalSize = 0;
    const fileContents: { path: string, content: string }[] = [];

    // TAHAP 2: On-Device Semantic RAG (Memori Tanpa Batas)
    // Instead of loading all files, we use VectorStore to find the most relevant files
    // based on the project description or recent changes.
    onStep({ id: 'supervisor-rag', type: 'thought', label: 'Semantic RAG', status: 'running', details: ['Querying Local Vector Database for context...'] });
    
    // Sync VFS to VectorStore first to ensure it's up to date
    await vectorStore.syncFromVFS();

    // Query the vector store using the project description as the semantic anchor
    const query = project?.description || "main application logic and architecture";
    const relevantFiles = await vectorStore.search(query, 10); // Get top 10 most relevant files

    const relevantPaths = new Set(relevantFiles.map(f => f.path));
    
    onStep({ id: 'supervisor-rag', type: 'success', label: 'RAG Context Loaded', status: 'completed', details: [`Found ${relevantFiles.length} relevant files for context.`] });

    // Always include main entry points
    relevantPaths.add('/src/main.tsx');
    relevantPaths.add('/src/App.tsx');
    relevantPaths.add('/android_project/app/src/main/AndroidManifest.xml');

    for (const m of verifiedModules) {
        if (relevantPaths.has(m.path)) {
            try {
                let content = '';
                try {
                    content = await shadowVFS.read(m.path);
                } catch (e) {
                    content = await vfs.readFile(m.path);
                }
                fileContents.push({ path: m.path, content });
                totalSize += content.length;
            } catch (e) {
                // Ignore missing files
            }
        }
    }

    // Smart Context Pruning (Anti-Truncation Protocol Level 7)
    // If combined code is too large, we prune older files to just their signatures
    // to preserve semantic context without blowing up the token limit.
    if (totalSize > 60000) {
        onStep({ id: 'supervisor-prune', type: 'thought', label: 'Context Pruning', status: 'running', details: ['Codebase too large. Pruning older modules to signatures...'] });
        
        // Keep the last 5 files full, prune the rest
        const fullFilesCount = 5;
        const startIndexForFull = Math.max(0, fileContents.length - fullFilesCount);
        
        for (let i = 0; i < fileContents.length; i++) {
            const file = fileContents[i];
            if (i < startIndexForFull) {
                // Prune to signatures more robustly using AST worker
                const prunedContent = await extractSkeleton(file.content, file.path);
                
                combinedCode += `\n--- FILE: ${file.path} (PRUNED SIGNATURES ONLY) ---\n${prunedContent}\n`;
            } else {
                // Keep full
                combinedCode += `\n--- FILE: ${file.path} ---\n${file.content}\n`;
            }
        }
        
        // Final safety check
        if (combinedCode.length > 80000) {
            combinedCode = combinedCode.substring(0, 80000) + '\n... (CRITICAL TRUNCATION REACHED)';
        }
        onStep({ id: 'supervisor-prune', type: 'success', label: 'Context Pruned', status: 'completed', details: ['Codebase pruned to fit context window.'] });
    } else {
        for (const file of fileContents) {
            combinedCode += `\n--- FILE: ${file.path} ---\n${file.content}\n`;
        }
    }

    // Loop detection state
    const supervisorLoopCount = state.manifest.modules.filter(m => m.description.includes('[SUPERVISOR FIX]')).length;
    if (supervisorLoopCount > 10) {
        onStep({ id: 'supervisor-check', type: 'warning', label: 'Supervisor Loop Detected', status: 'completed', details: ['Too many supervisor fixes. Breaking loop to prevent infinite execution.'] });
        return true; // Force pass to break loop
    }

    const supervisorPrompt = `
You are The Supervisor (Layer 3).
Your job is to perform a strict Cross-Module Integration Check.
Look for:
1. Import/Export mismatches (e.g., importing a function that wasn't exported).
2. Missing dependencies or files that were referenced but not created.
3. Type mismatches across files.
4. Unhandled edge cases in the integration logic.

Here is the codebase generated so far:
${combinedCode}

If the code is perfectly integrated and has no structural errors, set status to "PERFECT" and leave tasks empty.
If there are integration errors, set status to "ERRORS" and provide a list of tasks to fix them.
`;

    const supervisorSystem = `You are The Supervisor. Ruthless Integration Enforcer.
GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}`;

    const supervisorSchema = {
        type: Type.OBJECT,
        properties: {
            status: { type: Type.STRING, enum: ["PERFECT", "ERRORS"] },
            tasks: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        path: { type: Type.STRING },
                        description: { type: Type.STRING },
                        action: { type: Type.STRING }
                    },
                    required: ["name", "path", "description", "action"]
                }
            }
        },
        required: ["status", "tasks"]
    };

    let apiLimitRetries = 0;
    while (true) {
        if (signal?.aborted) throw new Error('cancelled');
        try {
            const supervisorRes = await generateContent('gemini-2.0-flash', supervisorPrompt, supervisorSystem, ENGINE_CONFIG.WORKER_TIMEOUT, true, signal, supervisorSchema);
            
            let parsedRes;
            try {
                parsedRes = healAndParseJSON(supervisorRes) as { 
                    status: string, 
                    tasks: { name: string, path: string, description: string, action: string }[] 
                };
            } catch (e) {
                console.warn("Supervisor returned invalid JSON", e);
                return true;
            }

            if (parsedRes.status === 'PERFECT' || parsedRes.tasks.length === 0) {
                onStep({ id: 'supervisor-check', type: 'success', label: 'Integration Passed', status: 'completed', details: ['No cross-module errors detected.'] });
                return true;
            }

            const fixTasks = parsedRes.tasks;

            if (fixTasks.length > 0) {
                onStep({ id: 'supervisor-check', type: 'warning', label: 'Integration Errors Found', status: 'completed', details: [`Supervisor detected ${fixTasks.length} integration issues. Spawning fix tasks...`] });
                
                let addedTasks = 0;
                for (const task of fixTasks) {
                    // Ensure we don't infinitely loop on the same fix
                    const existingFixes = state.manifest.modules.filter(m => m.path === task.path && m.action === 'update' && m.description.includes('[SUPERVISOR FIX]'));
                    if (existingFixes.length < 2) { // Max 2 supervisor fixes per file to prevent infinite loops
                        const newModuleId = `mod_fix_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                        state.manifest.modules.push({
                            id: newModuleId,
                            name: task.name || `Fix ${task.path.split('/').pop()}`,
                            path: task.path,
                            description: `[SUPERVISOR FIX] ${task.description}`,
                            dependencies: [], // It can read the file itself
                            action: 'update',
                            status: 'pending',
                            attempts: 0
                        });
                        addedTasks++;
                    }
                }

                if (addedTasks > 0) {
                    await saveState(projectId, state);
                    return false; // Not perfect, need to run worker phase again
                }
            }

            return true; // Fallback to true if we couldn't parse tasks or no tasks were added

        } catch (e: any) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            const isApiLimit = errorMsg.toLowerCase().includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit');
            
            if (isApiLimit) {
                apiLimitRetries++;
                if (apiLimitRetries > 10) {
                    console.warn(`Supervisor API Limit exceeded maximum retries (10). Skipping phase.`);
                    return true;
                }
                
                // Smart Exponential Backoff with Jitter
                const backoffDelay = (10000 * Math.pow(2, apiLimitRetries - 1)) + Math.random() * 2000;
                
                onStep({ id: 'supervisor-check', type: 'error', label: 'API Limit Reached', status: 'warning', details: [`API limit exceeded. Waiting ${Math.round(backoffDelay/1000)}s before retrying...`] });
                await new Promise(resolve => setTimeout(resolve, backoffDelay));
                continue; // Retry automatically
            }
            
            console.warn("Supervisor Phase failed:", e);
            // If supervisor fails for other reasons, we just proceed to avoid blocking the build
            return true;
        }
    }
}
