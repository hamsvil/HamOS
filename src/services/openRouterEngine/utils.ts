/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { safeStorage } from "../../utils/storage";
import { EngineState } from "./types";
import { AiWorkerService } from '../aiWorkerService';

export type CollaboratorRole = 'architect' | 'worker' | 'validator' | 'assembler' | 'tester';

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
        // Step 1: Remove trailing commas
        cleaned = cleaned.replace(/,\s*([\]}])/g, '$1');
        
        // Step 2: Fix unquoted keys
        cleaned = cleaned.replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
        
        // Step 3: Replace single quotes with double quotes (carefully, avoiding those inside words)
        cleaned = cleaned.replace(/'([^']*)'/g, '"$1"');
        
        // Step 4: Remove comments (// and /* */) safely, avoiding those inside strings
        // This is a complex regex to match strings OR comments, and only replace comments
        cleaned = cleaned.replace(/(".*?"|'.*?')|(\/\/.*$|\/\*[\s\S]*?\*\/)/gm, (match, stringLiteral, comment) => {
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

        try {
            return JSON.parse(cleaned);
        } catch (e2: any) {
            const msg = e2 instanceof Error ? e2.message : String(e2);
            throw new Error(`JSON Auto-Heal failed: ${msg}\nRaw snippet: ${cleaned.substring(0, 100)}...`, { cause: e2 });
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
    // More robust regex that handles attributes and newlines better
    const codeMatch = raw.match(/<code[^>]*>([\s\S]*?)<\/code>/i);
    if (codeMatch) {
        extracted = codeMatch[1].trim();
    } else {
        // Fallback to markdown blocks if <code> is missing
        const mdMatch = raw.match(/```[a-z]*\n([\s\S]*?)```/i);
        if (mdMatch) {
            extracted = mdMatch[1].trim();
        } else {
            extracted = raw.trim();
        }
    }
    // Remove any lingering markdown fences
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
    DEFAULT_MODEL: 'openrouter',
    ARCHITECT_TIMEOUT: 600000, // 10 minutes
    WORKER_TIMEOUT: 600000,    // 10 minutes
    HEAL_TIMEOUT: 600000,      // 10 minutes
    CRITIC_TIMEOUT: 600000     // 10 minutes
};

export async function generateContent(model: string = 'gemini-2.0-flash', prompt: string, systemInstruction: string, timeoutMs: number = 600000, isJson: boolean = false, role: CollaboratorRole = 'worker'): Promise<string> {
    // Ensure SUPREME PROTOCOL is included
    let finalSystemInstruction = systemInstruction;
    if (!finalSystemInstruction.includes("SUPREME PROTOCOL")) {
        finalSystemInstruction += "\n\n[SYSTEM REMINDER: SUPREME PROTOCOL v21.0 & HAM ENGINE APEX V5.0 ACTIVE. ZERO-GUESSWORK. ANTI-PANGKAS. SELF-HEALING. NO PLACEHOLDERS. COMPLETE FIXES ONLY. READ STRUKTUR.]";
    }

    // Use Gemini models exclusively
    const geminiModelsToTry = [model, 'gemini-2.0-pro-exp-02-05', 'gemini-2.0-flash-thinking-exp-01-21', 'gemini-2.0-flash'];
    let geminiLastError: any = null;

    for (const currentModel of geminiModelsToTry) {
        try {
            const config: Record<string, unknown> = {
                systemInstruction: finalSystemInstruction,
                temperature: 0.2,
            };
            if (isJson) {
                config.responseMimeType = "application/json";
            }
            
            const result = await AiWorkerService.generateContent({
                model: currentModel,
                contents: prompt,
                config
            });
            return result.text || '';
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            console.warn(`[GeminiSwarmEngine] Model ${currentModel} failed: ${errorMessage}. Trying next fallback...`);
            geminiLastError = e;
        }
    }

    throw new Error(`All Gemini models failed. Last error: ${geminiLastError?.message}`);
}

// Simple async lock for state operations
let stateLock = Promise.resolve();

export async function loadState(projectId: string): Promise<EngineState> {
    return new Promise((resolve) => {
        stateLock = stateLock.then(() => {
            const raw = safeStorage.getItem(`ham_op_engine_state_${projectId}`);
            if (raw) {
              resolve(JSON.parse(raw));
              return;
            }
            resolve({
              manifestReady: false,
              manifest: { goal: '', strategy: '', modules: [], contextSummary: '', lastKnownGoodState: null },
              currentTaskId: null
            });
        });
    });
}

export async function saveState(projectId: string, state: EngineState): Promise<void> {
    return new Promise((resolve) => {
        stateLock = stateLock.then(() => {
            safeStorage.setItem(`ham_op_engine_state_${projectId}`, JSON.stringify(state));
            resolve();
        });
    });
}
