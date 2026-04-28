/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { geminiKeyManager } from "../geminiKeyManager";
import { safeStorage } from "../../utils/storage";
import { EngineState } from "./types";
import { AiWorkerService } from "../aiWorkerService";

export function healAndParseJSON(raw: string): any {
    // Strip markdown wrappers
    let cleaned = raw.replace(/^```(?:json)?\n?/im, '').replace(/\n?```$/im, '').trim();
    
    // Find the first { or [
    const firstBrace = cleaned.indexOf('{');
    const firstBracket = cleaned.indexOf('[');
    
    let isObject = false;
    if (firstBrace !== -1 && firstBracket !== -1) {
        isObject = firstBrace < firstBracket;
    } else if (firstBrace !== -1) {
        isObject = true;
    } else if (firstBracket !== -1) {
        isObject = false;
    } else {
        throw new Error("No JSON object or array found in response.");
    }

    const startIdx = isObject ? firstBrace : firstBracket;
    const endIdx = isObject ? cleaned.lastIndexOf('}') : cleaned.lastIndexOf(']');

    if (startIdx !== -1 && endIdx !== -1 && endIdx >= startIdx) {
        cleaned = cleaned.substring(startIdx, endIdx + 1);
    }

    // Advanced JSON healing
    try {
        return JSON.parse(cleaned);
    } catch (e) {
        // Step 0: Check for multiple separate objects and wrap them in an array
        if (isObject && cleaned.match(/\}\s*\{/)) {
            cleaned = `[${cleaned.replace(/\}\s*\{/g, '},{')}]`;
            try { return JSON.parse(cleaned); } catch (e) {}
        }

        // Step 1: Remove trailing commas
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        // Step 2: Fix unquoted keys
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        
        // Step 3: Replace single quotes with double quotes (carefully, avoiding those inside words)
        cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');
        
        // Step 4: Remove comments (// and /* */) safely, avoiding those inside strings
        // This is a complex regex to match strings OR comments, and only replace comments
        cleaned = cleaned.replace(/("(?:\\[\s\S]|[^"])*"|'(?:\\[\s\S]|[^'])*')|(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match, stringLiteral, comment) => {
            if (comment) return ''; // Remove comment
            return stringLiteral; // Keep string
        });
        
        // Step 5: Fix missing quotes around string values
        cleaned = cleaned.replace(/:\s*([^"'{[0-9truefalse\s,\]}][^,\]}]*)/g, (match, val) => {
            const trimmed = val.trim();
            if (trimmed === 'true' || trimmed === 'false' || trimmed === 'null' || !isNaN(Number(trimmed))) {
                return match;
            }
            return `: "${trimmed}"`;
        });

        // Step 6: Escape unescaped newlines in strings
        cleaned = cleaned.replace(/"((?:[^"\\]|\\.)*)"/g, (match, inner) => {
            return `"${inner.replace(/\n/g, '\\n').replace(/\r/g, '\\r')}"`;
        });

        try {
            return JSON.parse(cleaned);
        } catch (e2: any) {
            // Last resort: extract all possible JSON objects using a regex
            const objectMatches = cleaned.match(/\{[^{}]*\}/g);
            if (objectMatches && objectMatches.length > 0) {
                try {
                    const parsedObjects = objectMatches.map(obj => JSON.parse(obj));
                    return parsedObjects.length === 1 ? parsedObjects[0] : parsedObjects;
                } catch (e3) {}
            }
            const errorMessage = e2 instanceof Error ? e2.message : String(e2);
            throw new Error(`JSON Auto-Heal failed: ${errorMessage}\nRaw snippet: ${cleaned.substring(0, 100)}...`, { cause: e2 });
        }
    }
}

export function sanitizePath(p: string): string {
    let clean = p.replace(/\0/g, '').replace(/\\/g, '/');
    clean = clean.replace(/^\/+/, '');
    
    // Remove leading ./ or / for path checking
    let checkPath = clean;
    if (checkPath.startsWith('./')) {
        checkPath = checkPath.substring(2);
    } else if (checkPath.startsWith('/')) {
        checkPath = checkPath.substring(1);
    }
    
    // Auto-fix common path mistakes (missing src/)
    if (!checkPath.startsWith('src/') && 
        (checkPath.startsWith('components/') || checkPath.startsWith('pages/') || 
         checkPath.startsWith('hooks/') || checkPath.startsWith('utils/') || 
         checkPath.startsWith('services/') || checkPath.startsWith('store/') ||
         checkPath.startsWith('types/') || checkPath.startsWith('assets/') ||
         checkPath.startsWith('constants/') || checkPath.startsWith('contexts/') ||
         checkPath.startsWith('styles/') || 
         checkPath === 'App.tsx' || checkPath === 'App.jsx' || 
         checkPath === 'main.tsx' || checkPath === 'main.jsx' || 
         checkPath === 'index.css' || checkPath === 'App.css' || 
         checkPath === 'vite-env.d.ts')) {
        clean = 'src/' + checkPath;
    }

    const parts = clean.split('/');
    const safeParts = [];
    for (const part of parts) {
        if (part === '..') {
            safeParts.pop();
        } else if (part !== '.' && part !== '') {
            safeParts.push(part);
        }
    }

    // Anti-Duplicate Root Files Protocol
    const rootFiles = ['package.json', 'vite.config.ts', 'vite.config.js', 'index.html', 'tailwind.config.js', 'tailwind.config.ts', 'postcss.config.js', 'postcss.config.ts', 'tsconfig.json', 'tsconfig.node.json', '.gitignore', '.env', 'eslint.config.js', 'README.md'];
    const fileName = safeParts[safeParts.length - 1];
    if (safeParts.length > 1 && safeParts[0] === 'src' && rootFiles.includes(fileName)) {
        return fileName; // Force root files to stay in root
    }

    return safeParts.join('/');
}

export function extractCodeBlock(raw: string): string {
    let extracted = '';
    
    // Robust index-based scanner for <code> tags
    const codeStartIdx = raw.indexOf('<code');
    if (codeStartIdx !== -1) {
        const closeBracketIdx = raw.indexOf('>', codeStartIdx);
        if (closeBracketIdx !== -1) {
            const codeEndIdx = raw.indexOf('</code>', closeBracketIdx);
            if (codeEndIdx !== -1) {
                extracted = raw.substring(closeBracketIdx + 1, codeEndIdx).trim();
            } else {
                // Auto-heal: If missing closing tag, take everything until the end
                extracted = raw.substring(closeBracketIdx + 1).trim();
            }
        }
    }
    
    if (!extracted) {
        // Fallback to markdown blocks if <code> is missing
        const mdStartIdx = raw.indexOf('```');
        if (mdStartIdx !== -1) {
            const newlineIdx = raw.indexOf('\n', mdStartIdx);
            if (newlineIdx !== -1) {
                const mdEndIdx = raw.indexOf('```', newlineIdx);
                if (mdEndIdx !== -1) {
                    extracted = raw.substring(newlineIdx + 1, mdEndIdx).trim();
                } else {
                    // Auto-heal: If missing closing markdown, take everything
                    extracted = raw.substring(newlineIdx + 1).trim();
                }
            }
        } else {
            extracted = raw.trim();
        }
    }
    
    // Remove any lingering markdown fences just in case
    return extracted.replace(/^```[a-z]*\n?/im, '').replace(/\n?```$/im, '').trim();
}

const globalInstructionsCache: Record<string, string> = {};
export async function getGlobalInstructions(phase: string = 'default'): Promise<string> {
    if (!globalInstructionsCache[phase]) {
        globalInstructionsCache[phase] = "CORE PROTOCOL: OBEY USER COMMANDS. ANTI-PANGKAS. SELF-HEALING.";
    }
    return globalInstructionsCache[phase];
}

export const ENGINE_CONFIG = {
    DEFAULT_MODEL: 'gemini-2.0-flash',
    ARCHITECT_TIMEOUT: 1800000, // 30 minutes
    WORKER_TIMEOUT: 1800000,    // 30 minutes
    HEAL_TIMEOUT: 1800000,      // 30 minutes
    CRITIC_TIMEOUT: 1800000     // 30 minutes
};

export async function generateContent(model: string = ENGINE_CONFIG.DEFAULT_MODEL, prompt: string, systemInstruction: string, timeoutMs: number = 600000, isJson: boolean = false, signal?: AbortSignal, responseSchema?: Record<string, unknown>): Promise<string> {
    const aiMode = safeStorage.getItem('ham_ai_mode') || 'deep';
    let targetModel = model;
    
    // Ensure SUPREME PROTOCOL is included
    let finalSystemInstruction = systemInstruction;
    if (!finalSystemInstruction.includes("SUPREME PROTOCOL")) {
        finalSystemInstruction += "\n\n[SYSTEM REMINDER: SUPREME PROTOCOL v22.0 & HAM ENGINE APEX V6.0 ACTIVE. ZERO-GUESSWORK. ANTI-PANGKAS. ANTI-SIMULASI. ANTI-BLANK-SCREEN. SELF-HEALING. NO PLACEHOLDERS. COMPLETE FIXES ONLY. READ STRUKTUR.]";
    }

    // Only override if the requested model is the default one
    if (model === ENGINE_CONFIG.DEFAULT_MODEL) {
        if (aiMode === 'thinking') targetModel = 'gemini-2.0-flash-thinking-exp-01-21';
        else if (aiMode === 'fast') targetModel = 'gemini-2.0-flash';
        else if (aiMode === 'deep') targetModel = 'gemini-2.0-pro-exp-02-05';
    }

    if (signal?.aborted) throw new Error('cancelled');
    
    // ZERO-DEGRADATION PROTOCOL: No fallback to weaker models. 
    // We rely on geminiKeyManager's exponential backoff for resilience.
    try {
        if (signal?.aborted) throw new Error('cancelled');
        const config: Record<string, unknown> = {
            systemInstruction: finalSystemInstruction,
            temperature: 0.2,
        };
        if (isJson) {
            config.responseMimeType = "application/json";
            if (responseSchema) {
                config.responseSchema = responseSchema;
            }
        }
        
        // Use AiWorkerService for zero-copy SharedArrayBuffer context
        const result = await AiWorkerService.generateContent({
            model: targetModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config
        });
        
        return result.text || '';
    } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Generation failed with model ${targetModel}: ${errorMessage}`, { cause: e });
    }
}

export async function generateContentStream(model: string = ENGINE_CONFIG.DEFAULT_MODEL, prompt: string, systemInstruction: string, onChunk: (chunk: string) => void, timeoutMs: number = 600000, signal?: AbortSignal): Promise<string> {
    const aiMode = safeStorage.getItem('ham_ai_mode') || 'deep';
    let targetModel = model;
    
    let finalSystemInstruction = systemInstruction;
    if (!finalSystemInstruction.includes("SUPREME PROTOCOL")) {
        finalSystemInstruction += "\n\n[SYSTEM REMINDER: SUPREME PROTOCOL v22.0 & HAM ENGINE APEX V6.0 ACTIVE. ZERO-GUESSWORK. ANTI-PANGKAS. ANTI-SIMULASI. ANTI-BLANK-SCREEN. SELF-HEALING. NO PLACEHOLDERS. COMPLETE FIXES ONLY. READ STRUKTUR.]";
    }

    if (model === ENGINE_CONFIG.DEFAULT_MODEL) {
        if (aiMode === 'thinking') targetModel = 'gemini-2.0-flash-thinking-exp-01-21';
        else if (aiMode === 'fast') targetModel = 'gemini-2.0-flash';
        else if (aiMode === 'deep') targetModel = 'gemini-2.0-pro-exp-02-05';
    }

    if (signal?.aborted) throw new Error('cancelled');
    
    try {
        if (signal?.aborted) throw new Error('cancelled');
        const config: Record<string, unknown> = {
            systemInstruction: finalSystemInstruction,
            temperature: 0.2,
        };
        
        const result = await AiWorkerService.generateStream({
            model: targetModel,
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            config
        }, onChunk);
        
        return result.text || '';
    } catch (e: any) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        throw new Error(`Generation failed with model ${targetModel}: ${errorMessage}`, { cause: e });
    }
}

// Simple async lock for state operations with timeout to prevent deadlocks
let stateLock = Promise.resolve();

export async function loadState(projectId: string): Promise<EngineState> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn(`[HamEngine] stateLock timeout on loadState for ${projectId}`);
            resolve({
              manifestReady: false,
              manifest: { goal: '', strategy: '', modules: [], contextSummary: '', lastKnownGoodState: null },
              currentTaskId: null
            });
        }, 5000);

        stateLock = stateLock.then(() => {
            try {
                const raw = safeStorage.getItem(`ham_engine_state_${projectId}`);
                if (raw) {
                  resolve(JSON.parse(raw));
                  return;
                }
            } catch (e) {
                console.error(`[HamEngine] Error parsing state:`, e);
            }
            resolve({
              manifestReady: false,
              manifest: { goal: '', strategy: '', modules: [], contextSummary: '', lastKnownGoodState: null },
              currentTaskId: null
            });
        }).catch((e) => {
            console.error(`[HamEngine] stateLock error on loadState:`, e);
            resolve({
              manifestReady: false,
              manifest: { goal: '', strategy: '', modules: [], contextSummary: '', lastKnownGoodState: null },
              currentTaskId: null
            });
        }).finally(() => {
            clearTimeout(timeout);
        });
    });
}

let sharedAstWorker: Worker | null = null;
let astWorkerCallbacks: Map<string, { resolve: (val: string) => void, reject: (err: any) => void, timeoutId: any }> = new Map();

function getSharedAstWorker(): Worker {
    if (!sharedAstWorker) {
        sharedAstWorker = new Worker(new URL('../../workers/ast.worker.ts', import.meta.url), { type: 'module' });
        
        sharedAstWorker.onmessage = (e) => {
            const callback = astWorkerCallbacks.get(e.data.id);
            if (callback) {
                clearTimeout(callback.timeoutId);
                astWorkerCallbacks.delete(e.data.id);
                if (e.data.type === 'EXTRACT_SKELETON_RESULT') {
                    callback.resolve(e.data.payload || '');
                } else {
                    callback.resolve(''); // Fallback handled by caller
                }
            }
        };
        
        sharedAstWorker.onerror = (err) => {
            console.error('[HamEngine] Shared AST Worker error:', err);
            // Resolve all pending callbacks with empty string to trigger fallback
            astWorkerCallbacks.forEach(cb => {
                clearTimeout(cb.timeoutId);
                cb.resolve('');
            });
            astWorkerCallbacks.clear();
            // Recreate worker on next call
            sharedAstWorker?.terminate();
            sharedAstWorker = null;
        };
    }
    return sharedAstWorker;
}

export async function extractSkeleton(content: string, path: string): Promise<string> {
    return new Promise((resolve) => {
        try {
            const worker = getSharedAstWorker();
            const id = Math.random().toString(36).substring(7);
            
            const timeoutId = setTimeout(() => {
                astWorkerCallbacks.delete(id);
                resolve(content.substring(0, 3000) + '\n// ... (Fallback truncation)');
            }, 10000);
            
            astWorkerCallbacks.set(id, {
                resolve: (res) => {
                    if (res) resolve(res);
                    else resolve(content.substring(0, 3000) + '\n// ... (Fallback truncation)');
                },
                reject: () => resolve(content.substring(0, 3000) + '\n// ... (Fallback truncation)'),
                timeoutId
            });
            
            worker.postMessage({
                type: 'EXTRACT_SKELETON',
                payload: { source: content, path },
                id
            });
        } catch (e) {
            resolve(content.substring(0, 3000) + '\n// ... (Fallback truncation)');
        }
    });
}

export async function saveState(projectId: string, state: EngineState): Promise<void> {
    return new Promise((resolve) => {
        const timeout = setTimeout(() => {
            console.warn(`[HamEngine] stateLock timeout on saveState for ${projectId}`);
            resolve();
        }, 5000);

        stateLock = stateLock.then(() => {
            try {
                safeStorage.setItem(`ham_engine_state_${projectId}`, JSON.stringify(state));
            } catch (e) {
                console.error(`[HamEngine] Error saving state:`, e);
            }
            resolve();
        }).catch((e) => {
            console.error(`[HamEngine] stateLock error on saveState:`, e);
            resolve();
        }).finally(() => {
            clearTimeout(timeout);
        });
    });
}
