 
import { MultiProviderRouter } from './MultiProviderRouter';

type Specialization = 'CSS' | 'API' | 'STATE' | 'BUILD' | 'SECURITY' | 'PERFORMANCE' | 'DATABASE' | 'GENERAL';

interface AgentSpec {
    specialization: Specialization;
    patterns: RegExp[];
    systemPrompt: string;
}

const AGENT_SPECS: AgentSpec[] = [
    {
        specialization: 'SECURITY',
        patterns: [/XSS/i, /CSRF/i, /injection/i, /auth/i, /unauthorized/i, /403/, /CORS policy/],
        systemPrompt: 'You are a security expert. Prioritize: eliminating vulnerabilities, proper authentication, input validation, output encoding. Never introduce new attack surfaces.',
    },
    {
        specialization: 'CSS',
        patterns: [/CSS/i, /className/i, /style/i, /layout/i, /overflow/i, /z-index/i, /flex/i, /grid/i],
        systemPrompt: 'You are a CSS and visual rendering expert. Focus on specificity conflicts, cascade issues, responsive breakpoints, and visual consistency.',
    },
    {
        specialization: 'API',
        patterns: [/fetch/i, /axios/i, /network/i, /timeout/i, /404/, /500/, /503/, /CORS/, /endpoint/i],
        systemPrompt: 'You are an API integration expert. Focus on HTTP semantics, error handling, retry logic, authentication headers, and response parsing.',
    },
    {
        specialization: 'STATE',
        patterns: [/useState/i, /useEffect/i, /undefined/, /null\s+reference/i, /Redux/i, /Zustand/i, /context/i],
        systemPrompt: 'You are a React state management expert. Focus on hook rules, effect dependency arrays, state mutation patterns, and data flow.',
    },
    {
        specialization: 'BUILD',
        patterns: [/Cannot find module/, /import error/i, /TypeScript/i, /webpack/i, /vite/i, /esbuild/i, /resolve/i],
        systemPrompt: 'You are a build system expert. Focus on module resolution, TypeScript compilation, bundler configuration, and dependency management.',
    },
    {
        specialization: 'PERFORMANCE',
        patterns: [/memory leak/i, /slow render/i, /performance/i, /frame drop/i, /heap/i, /OOM/i],
        systemPrompt: 'You are a performance optimization expert. Focus on memory leaks, render optimization, bundle size, and runtime efficiency.',
    },
];

export class SwarmConductor {
    static selectAgent(error: string): AgentSpec {
        // Security takes highest priority
        for (const spec of AGENT_SPECS) {
            if (spec.patterns.some(p => p.test(error))) return spec;
        }
        // Default general agent
        return {
            specialization: 'GENERAL',
            patterns: [],
            systemPrompt: 'You are a senior full-stack engineer. Analyze the error thoroughly, find the root cause, and provide a minimal, targeted fix.',
        };
    }

    static async analyze(error: string, codeContext: string): Promise<string> {
        const agent = this.selectAgent(error);
        return MultiProviderRouter.route(
            `[${agent.specialization} SPECIALIST AGENT]\n${agent.systemPrompt}\n\nError to analyze and fix:\n${error}\n\nCode context:\n${codeContext}`,
            'code'
        );
    }
}
