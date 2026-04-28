 
import { MultiProviderRouter } from './MultiProviderRouter';
import { SecureVault } from './SecureVault';
import { SwarmOrchestrator } from '../sAgent/coreAgents/SwarmOrchestrator';

// Safe env getter for both Node and Browser
const getApiKey = () => {
    if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_GEMINI_API_KEY) {
        return import.meta.env.VITE_GEMINI_API_KEY;
    }
    if (typeof process !== 'undefined' && process.env && process.env.GEMINI_API_KEY) {
        return process.env.GEMINI_API_KEY;
    }
    return '';
};

export class _OmniPromptEngine {
    private static swarm: SwarmOrchestrator | null = null;
    private static swarmBooted = false;

    static async analyzeAndFix(err: string, ctx: string) {
        if (!this.swarm) {
            this.swarm = new SwarmOrchestrator();
        }
        if (!this.swarmBooted) {
            const apiKey = getApiKey();
            await this.swarm.bootSwarm({
                agent1: apiKey,
                agent2: apiKey,
                agent3: apiKey,
                agent4: apiKey,
                agent5: apiKey,
                agent6: apiKey,
                agent7: apiKey,
                agent8: apiKey
            });
            this.swarmBooted = true;
        }
        const coreDirectives = await SecureVault.getKey('CORE_DIRECTIVES') || '';
        const prompt = `
[CORE DIRECTIVES]
${coreDirectives}

[SYSTEM AWARENESS: THE UNIVERSAL BRIDGE]
You are SAERE (Sovereign Autonomous Error Resolution Engine). You are no longer confined to a browser sandbox.
You have been upgraded with the Universal File System Bridge. When you use your file tools (readFile, writeFile, listDir, etc.), you are interacting directly with the REAL project files on the host container/machine.
You have full autonomy. You have access to the entire arsenal of 67 tools across all pillars (Perception, Execution, Infrastructure, Validation, Evolution, Meta-Cognition, Advanced Diagnostics, and SubAgent FileSystemBridge).
Do not assume you are restricted. You are God-Tier.

[ERROR CONTEXT]
${ctx}

[ERROR TO FIX]
${err}

RESPONSE FORMAT: JSON { "rootCause": string, "proposedFix": string, "confidence": number, "rippleEffects": string[], "targetFile": string }
        `.trim();
        
        // ISSUE #3 FIX: Delegate to specialized agents
        let specialistId = 'agent2';
        if (err.includes('UI') || err.includes('CSS')) specialistId = 'agent1';
        if (err.includes('Security') || err.includes('Auth')) specialistId = 'agent3';
        
        let res;
        try {
            res = await this.swarm.delegateTask(specialistId, prompt);
        } catch (delegateErr) {
            console.error('[OmniPromptEngine] Swarm delegation failed:', delegateErr);
            res = '{}';
        }

        try {
            if (!res || typeof res !== 'string') {
                throw new Error("Invalid response format from delegateTask");
            }
            return JSON.parse(res);
        } catch (_e) {
            const fallback = await MultiProviderRouter.route(prompt, 'reasoning');
            try { 
                return JSON.parse(fallback || '{}'); 
            } catch {
                return { rootCause: "Unknown", proposedFix: String(res), confidence: 50, rippleEffects: [] };
            }
        }
    }
}
