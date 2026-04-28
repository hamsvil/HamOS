/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { getGlobalInstructions, generateContent, saveState, ENGINE_CONFIG } from "./utils";
import { vfs } from "../vfsService";
import { vectorStore } from "../vectorStore";
import { useProjectStore } from "../../store/projectStore";

export async function runSupervisorPhase(
    project: ProjectData | null,
    state: EngineState,
    projectId: string,
    onStep: (step: GenerationStep) => void
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
    
    // Always include main entry points
    relevantPaths.add('/src/main.tsx');
    relevantPaths.add('/src/App.tsx');
    relevantPaths.add('/android_project/app/src/main/AndroidManifest.xml');

    for (const m of verifiedModules) {
        if (relevantPaths.has(m.path)) {
            try {
                const content = await vfs.readFile(m.path);
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
                // Prune to signatures more robustly
                // Match exports, classes, interfaces, types, and top-level functions
                const signatures = file.content.match(/^(?:export\s+)?(?:default\s+)?(?:interface|type|class|function|const|let|var)\s+([a-zA-Z0-9_]+)(?:<[^>]+>)?\s*(?:\([^)]*\))?\s*(?::\s*[^=]+)?\s*(?:=|{)/gm) || [];
                
                // Also capture import statements to preserve dependency context
                const imports = file.content.match(/^import\s+.*?;/gm) || [];
                
                let prunedContent = imports.join('\n') + '\n\n';
                prunedContent += signatures.length > 0 ? signatures.map(s => s.replace(/\s*(=|{)\s*$/, ';')).join('\n// ...\n') : '// (Content omitted for size)';
                
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

If the code is perfectly integrated and has no structural errors, output EXACTLY the word "PERFECT".
If there are integration errors, output a JSON array of tasks to fix them.
Format:
[
  {
    "name": "FixModuleName",
    "path": "path/to/file.ts",
    "description": "Detailed description of what needs to be fixed and why.",
    "action": "update"
  }
]
`;

    const supervisorSystem = `You are The Supervisor. Ruthless Integration Enforcer.
GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}`;

    try {
        const storeState = useProjectStore.getState() as any;
        const currentModel = storeState.aiConfig?.model || storeState.activeModel || ENGINE_CONFIG.DEFAULT_MODEL;
        const supervisorRes = await generateContent(currentModel, supervisorPrompt, supervisorSystem, ENGINE_CONFIG.WORKER_TIMEOUT, false, 'assembler');
        
        if (supervisorRes.trim().toUpperCase() === 'PERFECT' || supervisorRes.includes('"PERFECT"')) {
            onStep({ id: 'supervisor-check', type: 'success', label: 'Integration Passed', status: 'completed', details: ['No cross-module errors detected.'] });
            return true;
        }

        // Try to parse JSON
        let fixTasks: any[] = [];
        const jsonMatch = supervisorRes.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            try {
                fixTasks = JSON.parse(jsonMatch[0]);
            } catch (e) {
                console.warn("Supervisor returned invalid JSON", e);
            }
        }

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
        console.warn("Supervisor Phase failed:", e);
        // If supervisor fails, we just proceed to avoid blocking the build
        return true;
    }
}
