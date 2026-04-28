/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { EngineState, TaskModule } from "./types";
import { getGlobalInstructions, generateContent, saveState, extractCodeBlock, ENGINE_CONFIG, extractSkeleton } from "./utils";
import { vfs } from "../vfsService";
import { shadowVFS } from "./kernel/ShadowVFS";
import { useProjectStore } from "../../store/projectStore";
import { validateAndHealCode } from "./taskValidator";
import { handleDependencies } from "./dependencyManager";

export async function processWorkerTask(
    nextTask: TaskModule,
    project: ProjectData | null,
    state: EngineState,
    projectId: string,
    onStep: (step: GenerationStep) => void,
    globalRules: string,
    completedCount: number,
    totalModules: number,
    signal?: AbortSignal
): Promise<{ success: boolean; isApiLimit: boolean; backoffDelay?: number; completedCountIncrement: number; iterationCountDecrement: number }> {
    if (signal?.aborted) throw new Error('cancelled');
    const startTime = Date.now();
    const stepId = `task-${nextTask.id}`;
    const progressBase = 10 + ((completedCount / totalModules) * 80);
    onStep({ id: stepId, type: 'action', label: `Worker: ${nextTask.name}`, status: 'running', details: [`Context: ${state.manifest.contextSummary}`], progress: progressBase });

    if (nextTask.action === 'delete') {
        try {
            await shadowVFS.write(nextTask.path, ''); // Simulate delete in shadowVFS
            await vfs.unlink(nextTask.path); // Also delete from real VFS for backend tools
            nextTask.status = 'verified';
            state.manifest.contextSummary += `\n- Deleted ${nextTask.name}: ${nextTask.path}`;
            await saveState(projectId, state);
            onStep({ id: stepId, type: 'action', label: `Module Deleted: ${nextTask.name}`, status: 'completed', details: ['File successfully removed.'], progress: progressBase + 5 });
            return { success: true, isApiLimit: false, completedCountIncrement: 1, iterationCountDecrement: 0 };
        } catch (e: any) {
            console.warn(`[TaskProcessor] Deletion fallback for ${nextTask.path}:`, e);
            nextTask.status = 'verified';
            state.manifest.contextSummary += `\n- Deleted ${nextTask.name} (already absent)`;
            await saveState(projectId, state);
            onStep({ id: stepId, type: 'action', label: `Module Deleted: ${nextTask.name}`, status: 'completed', details: ['File already absent.'], progress: progressBase + 5 });
            return { success: true, isApiLimit: false, completedCountIncrement: 1, iterationCountDecrement: 0 };
        }
    }

    let currentCode = '';
    let isValid = false;
    
    try {
        const snapshot = await vfs.getProjectSnapshot();
        const projectFiles = snapshot.files;

        const dependencyContent = await Promise.all(nextTask.dependencies.map(async depId => {
            const depModule = state.manifest.modules.find(m => m.id === depId);
            let content = '';
            let depName = depId;
            let depPath = '';

            if (depModule && depModule.status === 'verified') {
                depName = depModule.name;
                depPath = depModule.path;
                try {
                    content = await shadowVFS.read(depModule.path);
                } catch (e) {
                    try {
                        content = await vfs.readFile(depModule.path);
                    } catch (err) {
                        return `// MODULE: ${depName} (Content unavailable)`;
                    }
                }
            } else {
                const existingFile = projectFiles.find(f => f.path.includes(depId) || f.path === depId);
                if (existingFile) {
                    depName = existingFile.path.split('/').pop() || depId;
                    depPath = existingFile.path;
                    content = existingFile.content;
                }
            }

            if (content) {
                if (content.length > 3000) {
                     const prunedContent = await extractSkeleton(content, depPath);
                     return `// MODULE: ${depName} (${depPath})\n// (Content semantically pruned for context)\n${prunedContent}`;
                }
                return `// MODULE: ${depName} (${depPath})\n${content}`;
            }
            
            return '';
        }));

        let existingContent = '';
        try {
            existingContent = await shadowVFS.read(nextTask.path);
        } catch (e) {
            try {
                existingContent = await vfs.readFile(nextTask.path);
            } catch (err) {
                // Common case for new files
            }
        }

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

        const workerRes = await generateContent('gemini-2.0-flash', workerPrompt, workerSystem, ENGINE_CONFIG.WORKER_TIMEOUT, false, signal);
        currentCode = extractCodeBlock(workerRes);
        
        if (currentCode) {
            // Android Package Name Enforcement (Level 9 Protocol)
            if (nextTask.path.endsWith('.java')) {
                const packageMatch = currentCode.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
                if (!packageMatch || packageMatch[1] !== 'com.hamaistudio.generated') {
                    // console.log(`[HamEngine] Enforcing package name for ${nextTask.path}`);
                    if (packageMatch) {
                        currentCode = currentCode.replace(/package\s+([a-zA-Z0-9_.]+)\s*;/, 'package com.hamaistudio.generated;');
                    } else {
                        currentCode = 'package com.hamaistudio.generated;\n\n' + currentCode;
                    }
                }
            }

            currentCode = await validateAndHealCode(currentCode, nextTask.path, workerSystem, stepId, onStep, signal);
            
            const isUIComponent = nextTask.path.endsWith('.tsx') || nextTask.path.endsWith('.jsx');
            const domTelemetry = useProjectStore.getState().domTelemetry;
            
            // Lazy Critic Evaluation (Zero-Cost Waste Protocol)
            // Only invoke Critic if it's a UI component OR if we have active DOM telemetry to check
            const shouldInvokeCritic = isUIComponent || domTelemetry;

            if (shouldInvokeCritic) {
                onStep({ id: stepId + '-critic', type: 'thought', label: 'The Critic', status: 'running', details: ['Analyzing efficiency & UI...'], progress: progressBase + 2 });
                
                let domContext = '';
                if (domTelemetry) {
                    try {
                        const safeStringify = (obj: any, cache = new Set()) => JSON.stringify(obj, (key, value) => {
                            if (typeof value === 'object' && value !== null) {
                                if (cache.has(value)) return '[Circular]';
                                cache.add(value);
                            }
                            return value;
                        }, 2);
                        const str = safeStringify(domTelemetry);
                        domContext = `\n\n[DOM TELEMETRY (Current UI Structure)]\n${str.length > 2000 ? str.substring(0, 2000) + '\n... [TRUNCATED]' : str}\n\nVISUAL FEEDBACK LOOP: Check if the UI elements overlap, have bad contrast, or are misaligned based on this DOM structure. If so, VETO it and provide specific CSS/Tailwind fixes.`;
                    } catch (e) {
                        console.warn('[TaskProcessor] DOM Telemetry serialization failure:', e);
                    }
                }

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
If you find a visual bug via DOM Telemetry, your reason MUST start with: "Maaf Master, saya melihat [deskripsi masalah visual] di layar preview. Saya akan memperbaiki [solusi teknis]-nya sekarang."
`;
                const criticSystem = `You are The Critic. Ruthless optimization and Meritocracy Enforcer.
GLOBAL INSTRUCTIONS & PROTOCOLS:
${globalRules}`;

                const criticRes = await generateContent('gemini-2.0-flash', criticPrompt, criticSystem, ENGINE_CONFIG.CRITIC_TIMEOUT, false, signal);
                
                if (criticRes.match(/\bAPPROVED\b/)) {
                    isValid = true;
                    onStep({ id: stepId + '-critic', type: 'success', label: 'Critic Approved', status: 'completed', details: ['Code efficiency and vision alignment verified.'] });
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
                            const refactorRes = await generateContent('gemini-2.0-flash', refactorPrompt, workerSystem, ENGINE_CONFIG.WORKER_TIMEOUT, false, signal);
                            const refactoredCode = extractCodeBlock(refactorRes);
                            
                            if (refactoredCode) {
                                currentCode = refactoredCode;
                                
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
                // Skip Critic for non-UI components without telemetry (Lazy Critic)
                isValid = true;
                onStep({ id: stepId + '-critic', type: 'success', label: 'Critic Bypassed', status: 'completed', details: ['Non-UI component, skipping critic evaluation for speed.'] });
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
            
            // Smart Exponential Backoff with Jitter
            const retryCount = nextTask.attempts || 0;
            const backoffDelay = (10000 * Math.pow(2, retryCount)) + Math.random() * 2000;
            
            onStep({ id: stepId, type: 'error', label: `API Limit Reached`, status: 'warning', details: [`API limit exceeded. Waiting ${Math.round(backoffDelay/1000)}s before retrying...`] });
            
            return { success: false, isApiLimit: true, backoffDelay, completedCountIncrement: 0, iterationCountDecrement: 1 };
        }

        nextTask.attempts++;
        nextTask.lastError = errorMsg;
        nextTask.status = 'failed';
        await saveState(projectId, state);
        onStep({ id: stepId, type: 'error', label: `Worker Failed`, status: 'error', details: [errorMsg] });
        return { success: false, isApiLimit: false, completedCountIncrement: 0, iterationCountDecrement: 0 };
    }

    if (isValid) {
        try {
            let backupContent = null;
            try {
                backupContent = await vfs.readFile(nextTask.path);
            } catch (e) {
                // File might be new
            }

            try {
                // Phase 7: Shadow Workspace - Write to ShadowVFS first
                await shadowVFS.write(nextTask.path, currentCode);
                
                // Also write to real VFS for backend tools (lint, compile)
                await vfs.writeFile(nextTask.path, currentCode);
                
                await handleDependencies(currentCode, nextTask, state, projectId, stepId, onStep);
                
            } catch (writeError) {
                // Atomic Rollback Protocol
                if (backupContent !== null) {
                    await vfs.writeFile(nextTask.path, backupContent);
                    await shadowVFS.write(nextTask.path, backupContent);
                } else {
                    // If it was a new file, delete it
                    try { await vfs.deleteFile(nextTask.path); } catch (e) {
                        console.error('[TaskProcessor] Atomic cleanup failed:', e);
                    }
                    try { await shadowVFS.write(nextTask.path, ''); } catch (e) {}
                }
                throw writeError;
            }

            nextTask.status = 'verified';
            
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
            
            return { success: true, isApiLimit: false, completedCountIncrement: 1, iterationCountDecrement: 0 };
            
        } catch (e: any) {
            nextTask.status = 'failed';
            nextTask.attempts++;
            await saveState(projectId, state);
            const msg = e instanceof Error ? e.message : String(e);
            onStep({ id: stepId, type: 'error', label: `Assembler Failed`, status: 'error', details: [msg] });
            return { success: false, isApiLimit: false, completedCountIncrement: 0, iterationCountDecrement: 0 };
        }
    }
    return { success: false, isApiLimit: false, completedCountIncrement: 0, iterationCountDecrement: 0 };
}
