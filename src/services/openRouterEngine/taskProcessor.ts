/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState } from "./types";
import { generateContent, saveState, sanitizePath, extractCodeBlock, healAndParseJSON, ENGINE_CONFIG } from "./utils";
import { vfs } from "../vfsService";
import { SyntaxValidator } from "../syntaxValidator";
import { EnvironmentChecker } from "../environmentChecker";
import { useProjectStore } from "../../store/projectStore";
import { LoggerService } from "../LoggerService";

export async function processTask(
    nextTask: any,
    state: EngineState,
    project: ProjectData | null,
    projectId: string,
    globalRules: string,
    onStep: (step: GenerationStep) => void,
    progressBase: number,
    completedCount: number
): Promise<{ success: boolean, completedCount: number }> {
    const startTime = Date.now();
    const stepId = `task-${nextTask.id}`;
    let currentCode = '';
    let isValid = false;
    let newCompletedCount = completedCount;

    try {
        const dependencyContent = await Promise.all(nextTask.dependencies.map(async (depId: string) => {
            const depModule = state.manifest.modules.find(m => m.id === depId);
            let content = '';
            let depName = depId;
            let depPath = '';

            if (depModule && depModule.status === 'verified') {
                depName = depModule.name;
                depPath = depModule.path;
                try {
                    content = await vfs.readFile(depModule.path);
                } catch (e) {
                    return `// MODULE: ${depName} (Content unavailable)`;
                }
            } else {
                const existingFile = project?.files.find(f => f.path.includes(depId) || f.path === depId);
                if (existingFile) {
                    depName = existingFile.path.split('/').pop() || depId;
                    depPath = existingFile.path;
                    content = existingFile.content;
                }
            }

            if (content) {
                if (content.length > 3000) {
                    const signatures = content.match(/^(?:export\s+)?(?:interface|type|class|function|const|let|var)\s+\w+[\s\S]*?(?:\{|;|=)/gm) || [];
                    const prunedContent = signatures.length > 0 ? signatures.join('\n// ...\n') : content.substring(0, 3000) + '\n// ... (Fallback truncation)';
                    return `// MODULE: ${depName} (${depPath})\n// (Content semantically pruned for context)\n${prunedContent}`;
                }
                return `// MODULE: ${depName} (${depPath})\n${content}`;
            }
            
            return '';
        }));

        let existingContent = '';
        try {
            existingContent = await vfs.readFile(nextTask.path);
        } catch (e) {}

        const workerPrompt = `
MODULE: ${nextTask.name} (${nextTask.path})
ACTION: ${nextTask.action || 'create'}
VISION STRATEGY: ${state.manifest.strategy || 'Standard Execution'}
DESCRIPTION: ${nextTask.description}
CONTEXT SUMMARY: ${state.manifest.contextSummary}

DEPENDENCIES (Reference Only):
${dependencyContent.join('\n\n')}

${existingContent ? `EXISTING FILE CONTENT (Modify this instead of starting from scratch):\n\`\`\`\n${existingContent}\n\`\`\`\n` : ''}
TASK: Write the full code for this module.
REQUIREMENTS:
1. Use TypeScript/React best practices.
2. Handle errors gracefully.
3. Wrap code in <code path="${nextTask.path}">...</code>
`;
        const workerSystem = `You are The Worker Swarm (Layer 2).
Context-Aware Coding. Anti-Pangkas Protocol Active.
Output FULL code.

GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}`;

        // Dynamic Model Resolution (Fixes the Model Switching Bug)
        const storeState = useProjectStore.getState() as any;
        const currentModel = storeState.aiConfig?.model || storeState.activeModel || ENGINE_CONFIG.DEFAULT_MODEL;

        const workerRes = await generateContent(currentModel, workerPrompt, workerSystem, ENGINE_CONFIG.WORKER_TIMEOUT);
        currentCode = extractCodeBlock(workerRes);
        
        if (currentCode) {
            // Phantom Generation Shield (Anti-Zero-Byte Protocol)
            if (currentCode.trim().length < 25 && !currentCode.includes('export')) {
                throw new Error("Phantom Generation Detected: LLM returned empty or meaningless code block.");
            }

            // Export Validator (Anti-Import Crash Protocol)
            if (nextTask.path.match(/\.(ts|tsx|js|jsx)$/) && !currentCode.includes('export ')) {
                if (!nextTask.path.endsWith('main.tsx') && !nextTask.path.endsWith('index.tsx') && !nextTask.path.endsWith('index.ts') && !nextTask.path.endsWith('vite-env.d.ts')) {
                    throw new Error("Export Validator Failed: Module does not export any functions or variables. Other modules will fail to import it.");
                }
            }

            // Phase 4: AST/Syntax Validation (Pre-Compilation)
            const lang = nextTask.path.endsWith('.java') ? 'java' : 
                         nextTask.path.endsWith('.tsx') ? 'tsx' :
                         nextTask.path.endsWith('.jsx') ? 'jsx' :
                         nextTask.path.endsWith('.js') ? 'js' : 'ts';
            const validationError = SyntaxValidator.validate(currentCode, lang);
            
            let syntaxError = '';

            if (validationError) {
                 syntaxError = `Syntax Validation Failed: ${validationError}`;
            } else {
                const openBraces = (currentCode.match(/\{/g) || []).length;
                const closeBraces = (currentCode.match(/\}/g) || []).length;
                const openParens = (currentCode.match(/\(/g) || []).length;
                const closeParens = (currentCode.match(/\)/g) || []).length;
                
                if (Math.abs(openBraces - closeBraces) > 1) syntaxError = `Severe brace mismatch. Found ${openBraces} '{' and ${closeBraces} '}'.`;
                else if (Math.abs(openParens - closeParens) > 1) syntaxError = `Severe parenthesis mismatch. Found ${openParens} '(' and ${closeParens} ')'.`;
            }

            if (syntaxError) {
                onStep({ id: stepId + '-syntax-heal', type: 'warning', label: 'Syntax Auto-Heal', status: 'running', details: [syntaxError, 'Initiating micro-healer...'] });
                const healPrompt = `The following code has a syntax error: ${syntaxError}\n\nCODE:\n${currentCode}\n\nTASK: Fix the syntax errors and return the FULL corrected code. Wrap in <code path="${nextTask.path}">...</code>`;
                const healRes = await generateContent(currentModel, healPrompt, workerSystem, ENGINE_CONFIG.HEAL_TIMEOUT);
                const healedCode = extractCodeBlock(healRes);
                if (healedCode) {
                    currentCode = healedCode;
                    const ob2 = (currentCode.match(/\{/g) || []).length;
                    const cb2 = (currentCode.match(/\}/g) || []).length;
                    if (Math.abs(ob2 - cb2) > 1) throw new Error(`Syntax Error persists after Auto-Heal: ${syntaxError}`);
                    onStep({ id: stepId + '-syntax-heal', type: 'success', label: 'Syntax Healed', status: 'completed', details: ['Code syntax automatically repaired.'] });
                } else {
                    throw new Error(`Syntax Error: ${syntaxError}`);
                }
            }
            
            onStep({ id: stepId + '-critic', type: 'thought', label: 'The Critic', status: 'running', details: ['Analyzing efficiency...'], progress: progressBase + 2 });
            
            const domTelemetry = useProjectStore.getState().domTelemetry;
            const domContext = domTelemetry ? `\n\n[DOM TELEMETRY (Current UI Structure)]\n${JSON.stringify(domTelemetry, null, 2).substring(0, 2000)}...\n\nVISUAL FEEDBACK LOOP: Check if the UI elements overlap, have bad contrast, or are misaligned based on this DOM structure. If so, VETO it and provide specific CSS/Tailwind fixes.` : '';

            const criticPrompt = `
VISION STRATEGY: ${state.manifest.strategy || 'Standard Execution'}
CODE TO REVIEW (${nextTask.path}):
${currentCode}${domContext}

LEVEL 4 PROTOCOL: DIGITAL MERITOCRACY
TASK: Analyze for Memory Leaks, Inefficiency, Security Risks, AND Vision Alignment.
1. Is this code highly optimized and innovative?
2. Does it perfectly serve the VISION STRATEGY?
3. (If DOM Telemetry is present) Are there any visual bugs, overlapping elements, or layout issues?
If it is generic, slow, misaligned, or visually broken, you MUST VETO IT.
Output "APPROVED" if efficiency > 90% AND it aligns with the strategy AND has no visual bugs.
Output "REFACTOR: <reason>" if issues found or if it lacks innovation.
`;
            const criticSystem = `You are The Critic. Ruthless optimization and Meritocracy Enforcer.
GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}`;

            const criticRes = await generateContent(currentModel, criticPrompt, criticSystem, ENGINE_CONFIG.CRITIC_TIMEOUT, false, 'validator');
            
            if (criticRes.includes("APPROVED")) {
                isValid = true;
            } else {
                const retryCount = (nextTask.attempts || 0);
                if (retryCount < 2) {
                    onStep({ id: stepId + '-refactor', type: 'warning', label: 'Refactoring...', status: 'running', details: [`Critic Feedback: ${criticRes}`, `Attempt ${retryCount + 1}/2`] });
                    
                    const refactorPrompt = `
PREVIOUS CODE:
${currentCode}

CRITIC FEEDBACK:
${criticRes}

TASK: Rewrite the code to address the feedback. Ensure efficiency > 90%.
Wrap code in <code path="${nextTask.path}">...</code>
`;
                    try {
                        const refactorRes = await generateContent(currentModel, refactorPrompt, workerSystem, ENGINE_CONFIG.WORKER_TIMEOUT);
                        const refactoredCode = extractCodeBlock(refactorRes);
                        
                        if (refactoredCode) {
                            currentCode = refactoredCode;
                            
                            const ob = (currentCode.match(/\{/g) || []).length;
                            const cb = (currentCode.match(/\}/g) || []).length;
                            if (Math.abs(ob - cb) > 1) throw new Error(`Refactor Syntax Error: Severe brace mismatch (${ob} vs ${cb}).`);
                            
                            isValid = true;
                            onStep({ id: stepId + '-refactor', type: 'success', label: 'Refactored', status: 'completed', details: ['Code updated based on feedback.'] });
                        } else {
                            throw new Error("Refactoring failed to generate code block.");
                        }
                    } catch (refactorError) {
                        const msg = refactorError instanceof Error ? refactorError.message : String(refactorError);
                        onStep({ id: stepId + '-refactor', type: 'warning', label: 'Refactor Failed', status: 'warning', details: [`Attempt ${retryCount + 1} failed: ${msg}. Retrying...`] });
                        throw new Error(`Critic Refactor failed: ${msg}`, { cause: refactorError });
                    }
                } else {
                    onStep({ id: stepId + '-critic', type: 'warning', label: 'Critic Warning (Ignored)', status: 'warning', details: [`Max retries reached. Proceeding with: ${criticRes}`] });
                    isValid = true;
                }
            }

        } else {
            throw new Error("No code block generated");
        }

    } catch (e: any) {
        const errorMsg = e instanceof Error ? e.message : String(e);
        const isApiLimit = errorMsg.toLowerCase().includes('429') || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('rate limit');
        
        if (isApiLimit) {
            // Anti-Reset Protocol: Do not increment attempts on API limit, just pause
            nextTask.status = 'pending';
            await saveState(projectId, state);
            onStep({ id: stepId, type: 'error', label: `API Limit Reached`, status: 'error', details: ['API limit exceeded. Waiting 30 seconds before retrying...'] });
            return { success: false, completedCount: newCompletedCount }; // Caller handles retry logic
        }

        nextTask.attempts++;
        nextTask.lastError = errorMsg;
        nextTask.status = 'failed';
        await saveState(projectId, state);
        onStep({ id: stepId, type: 'error', label: `Worker Failed`, status: 'error', details: [errorMsg] });
        return { success: true, completedCount: newCompletedCount }; // Task failed but iteration can continue
    }

    if (isValid) {
        try {
            let backupContent = null;
            try {
                backupContent = await vfs.readFile(nextTask.path);
            } catch (e) {}

            try {
                // Memory Checkpointing (Time Travel Protocol)
                if (backupContent !== null) {
                    try {
                        const historyDir = `.history/${nextTask.path}`;
                        await vfs.mkdir(historyDir);
                        await vfs.writeFile(`${historyDir}/${Date.now()}_backup.txt`, backupContent);
                    } catch (historyError) {
                        console.warn("Failed to create memory checkpoint", historyError);
                    }
                }

                // Phase 7: Shadow Workspace - Write to shadow buffer for source files
                if (nextTask.path.endsWith('.ts') || nextTask.path.endsWith('.tsx') || nextTask.path.endsWith('.js') || nextTask.path.endsWith('.jsx') || nextTask.path.endsWith('.css') || nextTask.path.endsWith('.html')) {
                    useProjectStore.getState().setShadowBuffer(nextTask.path, currentCode);
                } else {
                    await vfs.writeFile(nextTask.path, currentCode);
                }
                
                const cleanCode = currentCode.replace(/\/\*[\s\S]*?\*\/|\/\/.*/g, '');
                const importRegex = /import\s+.*?from\s+['"]([^'"]+)['"]/g;
                let match;
                const newDependencies: Set<string> = new Set();
                const NODE_BUILTINS = new Set(['fs', 'path', 'crypto', 'os', 'http', 'https', 'net', 'tls', 'events', 'stream', 'util', 'child_process', 'cluster', 'zlib', 'buffer', 'querystring', 'readline', 'dns', 'dgram', 'url', 'v8', 'vm', 'worker_threads', 'perf_hooks', 'async_hooks', 'punycode', 'string_decoder', 'tty', 'assert', 'module']);
                
                while ((match = importRegex.exec(cleanCode)) !== null) {
                    const pkgName = match[1];
                    if (!pkgName.startsWith('.') && !pkgName.startsWith('/') && !pkgName.startsWith('node:')) {
                        const basePkg = pkgName.startsWith('@') ? pkgName.split('/').slice(0, 2).join('/') : pkgName.split('/')[0];
                        if (!NODE_BUILTINS.has(basePkg)) {
                            newDependencies.add(basePkg);
                        }
                    }
                }

                if (newDependencies.size > 0) {
                    let pkgJsonStr = '{}';
                    try {
                        pkgJsonStr = await vfs.readFile('package.json');
                    } catch (e) {
                        pkgJsonStr = '{\n  "name": "ham-project",\n  "private": true,\n  "dependencies": {}\n}'; // Auto-Heal missing package.json
                    }

                    try {
                        // Use healAndParseJSON for crash-proof parsing
                        const pkgJson = healAndParseJSON(pkgJsonStr) as Record<string, any>;
                        let pkgUpdated = false;
                        
                        if (!pkgJson.dependencies) pkgJson.dependencies = {};
                        
                        for (const dep of newDependencies) {
                            if (['react', 'react-dom', 'lucide-react'].includes(dep)) continue;
                            
                            if (!pkgJson.dependencies[dep]) {
                                // Anti-Hallucination Protocol: Check NPM registry
                                try {
                                    const response = await fetch(`https://registry.npmjs.org/${dep}`);
                                    if (response.ok) {
                                        pkgJson.dependencies[dep] = 'latest';
                                        pkgUpdated = true;
                                        // console.log(`[HamEngine] Auto-adding verified dependency: ${dep}`);
                                    } else {
                                        // console.warn(`[HamEngine] Rejected hallucinated dependency: ${dep}`);
                                    }
                                } catch (e) {
                                    // If network fails, assume it's valid to not block development, but log warning
                                    pkgJson.dependencies[dep] = 'latest';
                                    pkgUpdated = true;
                                    // console.warn(`[HamEngine] Network error checking ${dep}, adding anyway.`);
                                }
                            }
                        }
                        
                        if (pkgUpdated) {
                            const indentMatch = pkgJsonStr.match(/^[ \t]+/m);
                            const indent = indentMatch ? indentMatch[0] : 2;
                            const newPkgStr = JSON.stringify(pkgJson, null, indent);
                            // Safe Write Protocol
                            healAndParseJSON(newPkgStr); // Verify it's valid before writing
                            await vfs.writeFile('package.json', newPkgStr);
                            
                            // Check environment before suggesting npm install
                            const envMsg = EnvironmentChecker.isNativeAndroid() 
                                ? "Native Android detected. NPM install bypassed." 
                                : "Auto-installed missing packages.";
                                
                            onStep({ id: stepId + '-deps', type: 'action', label: 'Dependencies Updated', status: 'completed', details: [envMsg] });
                        }
                    } catch (e) {
                        console.warn("Failed to auto-update package.json for dependencies. JSON might be corrupted.", e);
                    }
                }

                const localImportRegex = /import\s+.*?from\s+['"](\.[^'"]+)['"]/g;
                let localMatch;
                let spawnedCount = 0;
                while ((localMatch = localImportRegex.exec(cleanCode)) !== null) {
                    const importPath = localMatch[1];
                    const currentDir = nextTask.path.substring(0, nextTask.path.lastIndexOf('/'));
                    let resolvedPath = sanitizePath(`${currentDir}/${importPath}`);
                    
                    if (!resolvedPath.match(/\.(ts|tsx|js|jsx|css|scss)$/)) {
                        resolvedPath += '.ts';
                    }

                    const existsInManifest = state.manifest.modules.some(m => m.path.replace(/\.[^/.]+$/, "") === resolvedPath.replace(/\.[^/.]+$/, ""));
                    
                    if (!existsInManifest) {
                        let existsInVfs = false;
                        try { await vfs.stat(resolvedPath); existsInVfs = true; } catch (e) {
                            try { await vfs.stat(resolvedPath + 'x'); existsInVfs = true; } catch (e2) {}
                        }

                        if (!existsInVfs) {
                            const newModuleId = `mod_spawned_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
                            state.manifest.modules.push({
                                id: newModuleId,
                                name: resolvedPath.split('/').pop() || 'AutoSpawnedModule',
                                path: resolvedPath,
                                description: `Auto-spawned dependency required by ${nextTask.name}`,
                                dependencies: [],
                                action: 'create',
                                status: 'pending',
                                attempts: 0
                            });
                            spawnedCount++;
                        }
                    }
                }
                if (spawnedCount > 0) {
                    onStep({ id: stepId + '-spawn', type: 'action', label: 'Dynamic Spawning', status: 'completed', details: [`Auto-spawned ${spawnedCount} missing local dependencies.`] });
                    await saveState(projectId, state);
                }
                
            } catch (writeError) {
                if (backupContent !== null) {
                    await vfs.writeFile(nextTask.path, backupContent);
                    console.warn(`[VFS Rollback] Restored ${nextTask.path} due to write failure.`);
                }
                throw writeError;
            }

            nextTask.status = 'verified';
            newCompletedCount++;
            
            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            const newLog = `- Completed ${nextTask.name} [${duration}s]: ${nextTask.description.substring(0, 50)}...`;
            const summaryLines = state.manifest.contextSummary.split('\n').filter(line => line.trim() !== '');
            summaryLines.push(newLog);
            
            // Semantic Memory Compression (Anti-Amnesia Protocol)
            if (summaryLines.length > 20) {
                const coreVision = summaryLines.slice(0, 3).join('\n');
                const recentActions = summaryLines.slice(-12).join('\n');
                const compressedCount = summaryLines.length - 15;
                state.manifest.contextSummary = `${coreVision}\n... [${compressedCount} intermediate steps compressed to save cognitive load] ...\n${recentActions}`;
            } else {
                state.manifest.contextSummary = summaryLines.join('\n');
            }
            
            await saveState(projectId, state);
            
            onStep({ id: stepId, type: 'action', label: `Module Verified: ${nextTask.name}`, status: 'completed', details: ['Syntax Check: PASSED', 'Integration: PASSED'], progress: progressBase + 5 });
            
            // Adaptive Cognitive Cooldown (Anti-429 Rate Limit Protocol)
            const codeLength = currentCode.length;
            const cooldownMs = Math.min(Math.max(Math.floor(codeLength / 15), 500), 4000);
            await new Promise(resolve => setTimeout(resolve, cooldownMs));
            
        } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            nextTask.status = 'failed';
            nextTask.attempts++;
            await saveState(projectId, state);
            onStep({ id: stepId, type: 'error', label: `Assembler Failed`, status: 'error', details: [msg] });
        }
    }

    return { success: true, completedCount: newCompletedCount };
}
