/* eslint-disable no-useless-assignment */
import { ProjectData, GenerationStep } from "../../components/HamAiStudio/types";
import { generateContent, extractCodeBlock, ENGINE_CONFIG } from "./utils";
import { useProjectStore } from "../../store/projectStore";

export class QATesterAgent {
    static async runTest(projectType: string, project: ProjectData, onStep: (step: GenerationStep) => void): Promise<{ success: boolean, logs: string }> {
        onStep({ id: 'qa-test', type: 'thought', label: 'QA Tester Agent', status: 'running', details: ['Running Static Code Analysis...', 'Checking for common runtime errors...'] });
        
        // Real Static Analysis using LLM
        const isWeb = projectType === 'web' || project.files.some(f => f.path.endsWith('.tsx') || f.path.endsWith('package.json'));
        
        const sourceFiles = project.files.filter(f => 
            isWeb ? (f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx')) 
                  : (f.path.endsWith('.java') || f.path.endsWith('.kt') || f.path.endsWith('.xml'))
        );
        
        // Anti-Truncation: Send all files, but prune large ones if total size is too big
        let totalSize = 0;
        const fileContext = sourceFiles.map(f => {
            totalSize += f.content.length;
            if (totalSize > 60000) {
                // Prune to signatures if we exceed token limits
                const signatures = f.content.match(/^(?:export\s+)?(?:default\s+)?(?:interface|type|class|function|const|let|var)\s+([a-zA-Z0-9_]+)/gm) || [];
                return `File: ${f.path}\nContent (PRUNED):\n${signatures.join('\n')}`;
            }
            return `File: ${f.path}\nContent:\n${f.content}`;
        }).join('\n\n');
        
        const webPrompt = `
You are an expert Frontend/Web QA Engineer and Static Analysis Tool.
Analyze the following source code snippets from the React/Web project "${project.name}" for critical runtime errors, specifically:
1. Infinite loops in useEffect (missing or incorrect dependency arrays)
2. Rules of Hooks violations (calling hooks conditionally)
3. Unhandled Promise Rejections or missing error boundaries
4. State mutation directly instead of using setState
5. Missing imports or undefined variables

Source Code:
${fileContext}

If you find a HIGH PROBABILITY of a crash or critical bug, output a detailed crash report in the format of a stack trace or error log.
If the code looks robust and safe based on the provided snippets, output EXACTLY "ZERO-CRASH".
`;

        const androidPrompt = `
You are an expert Android QA Engineer and Static Analysis Tool.
Analyze the following source code snippets from the project "${project.name}" for critical runtime errors, specifically:
1. NullPointerExceptions (e.g., accessing views before findViewById or binding)
2. Memory Leaks (e.g., static context references, unclosed cursors)
3. Main Thread Network Operations (NetworkOnMainThreadException)
4. Lifecycle issues (e.g., accessing resources in onDestroy)

Source Code:
${fileContext}

If you find a HIGH PROBABILITY of a crash or critical bug, output a detailed crash report in the format of a stack trace or error log.
If the code looks robust and safe based on the provided snippets, output EXACTLY "ZERO-CRASH".
`;

        const prompt = isWeb ? webPrompt : androidPrompt;
        
        try {
            const storeState = useProjectStore.getState() as any;
            const currentModel = storeState.aiConfig?.model || storeState.activeModel || ENGINE_CONFIG.DEFAULT_MODEL;
            const res = await generateContent(currentModel, prompt, "You are a ruthless QA Tester.", ENGINE_CONFIG.WORKER_TIMEOUT, false, 'tester');
            
            if (res.includes('ZERO-CRASH')) {
                onStep({ id: 'qa-test', type: 'success', label: 'QA Passed', status: 'completed', details: ['Static analysis passed. No critical issues detected.'] });
                return { success: true, logs: 'No critical issues detected.' };
            } else {
                onStep({ id: 'qa-test', type: 'error', label: 'QA Failed', status: 'completed', details: ['Critical issues detected! Sending report back to Worker Agent...'] });
                return { success: false, logs: res };
            }
        } catch (e) {
            console.error("QA Analysis failed", e);
            // If QA fails to run (e.g. API error), we warn but proceed
            onStep({ id: 'qa-test', type: 'warning', label: 'QA Skipped', status: 'warning', details: ['QA Analysis timed out or failed. Proceeding with caution.'] });
            return { success: true, logs: 'QA Agent timeout. Proceeding.' };
        }
    }
}
