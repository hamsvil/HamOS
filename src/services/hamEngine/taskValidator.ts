/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { SyntaxValidator } from "../syntaxValidator";
import { GenerationStep } from "../../components/HamAiStudio/types";
import { generateContent, extractCodeBlock, ENGINE_CONFIG } from "./utils";

export async function validateAndHealCode(
    code: string,
    path: string,
    workerSystem: string,
    stepId: string,
    onStep: (step: GenerationStep) => void,
    signal?: AbortSignal
): Promise<string> {
    let currentCode = code;

    // Phantom Generation Shield (Anti-Zero-Byte Protocol)
    if (currentCode.trim().length < 25 && !currentCode.includes('export')) {
        throw new Error("Phantom Generation Detected: LLM returned empty or meaningless code block.");
    }

    // Export Validator (Anti-Import Crash Protocol)
    if (path.match(/\.(ts|tsx|js|jsx)$/) && !/\bexport\b/.test(currentCode) && !/module\.exports/.test(currentCode)) {
        if (!path.endsWith('main.tsx') && !path.endsWith('index.tsx') && !path.endsWith('index.ts') && !path.endsWith('vite-env.d.ts')) {
            throw new Error("Export Validator Failed: Module does not export any functions or variables. Other modules will fail to import it.");
        }
    }

    // Phase 4: AST/Syntax Validation (Pre-Compilation)
    const lang = path.endsWith('.java') ? 'java' : 
                 path.endsWith('.tsx') ? 'tsx' :
                 path.endsWith('.jsx') ? 'jsx' :
                 path.endsWith('.js') ? 'js' : 'ts';
    
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
        const healPrompt = `The following code has a syntax error: ${syntaxError}\n\nCODE:\n${currentCode}\n\nTASK: Fix the syntax errors and return the FULL corrected code. Wrap in <code path="${path}">...</code>`;
        const healRes = await generateContent('gemini-2.0-flash', healPrompt, workerSystem, ENGINE_CONFIG.HEAL_TIMEOUT, false, signal);
        const healedCode = extractCodeBlock(healRes);
        if (healedCode) {
            currentCode = healedCode;
            const ob2 = (currentCode.match(/\{/g) || []).length;
            const cb2 = (currentCode.match(/\}/g) || []).length;
            if (Math.abs(ob2 - cb2) > 1) {
                onStep({ id: stepId + '-syntax-heal', type: 'error', label: 'Syntax Heal Failed', status: 'error', details: ['Syntax error persists after Auto-Heal.'] });
                throw new Error(`Syntax Error persists after Auto-Heal: ${syntaxError}`);
            }
            onStep({ id: stepId + '-syntax-heal', type: 'success', label: 'Syntax Healed', status: 'completed', details: ['Code syntax automatically repaired.'] });
        } else {
            onStep({ id: stepId + '-syntax-heal', type: 'error', label: 'Syntax Heal Failed', status: 'error', details: ['Could not repair syntax.'] });
            throw new Error(`Syntax Error: ${syntaxError}`);
        }
    }

    return currentCode;
}
