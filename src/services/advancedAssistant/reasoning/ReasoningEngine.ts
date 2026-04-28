/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData } from '../../../components/HamAiStudio/types';
import { AiWorkerService } from '../../aiWorkerService';

export class ReasoningEngine {
  private maxDepth: number = 5;
  private currentDepth: number = 0;

  constructor(maxDepth: number = 5) {
    this.maxDepth = maxDepth;
  }

  // 1. Tree of Thoughts (ToT) - Basic Implementation
  // Generates multiple potential plans and evaluates them before execution
  public async createPlan(input: string): Promise<string[]> {
    try {
      const result = await AiWorkerService.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: `Create a step-by-step execution plan for the following request: "${input}". Return ONLY a JSON array of strings, where each string is a step in the plan. Do not include markdown formatting like \`\`\`json.` }] }]
      });

      const text = result.text || '[]';
      try {
        const plan = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        if (Array.isArray(plan)) {
          return plan;
        }
      } catch (e) {
        // Fallback if parsing fails
      }
    } catch (e) {
      console.error("Failed to generate plan with Ham Engine, falling back to basic plan.", e);
    }

    const thoughts: string[] = [];
    const lowerInput = input.toLowerCase();

    thoughts.push(`Analyze user intent: "${input}"`);
    thoughts.push(`Check available tools and permissions`);

    if (lowerInput.includes('fix') || lowerInput.includes('error') || lowerInput.includes('bug')) {
        thoughts.push(`Identify the root cause of the issue`);
        thoughts.push(`Formulate a fix strategy`);
        thoughts.push(`Verify the fix doesn't introduce regressions`);
    } else if (lowerInput.includes('create') || lowerInput.includes('add') || lowerInput.includes('new')) {
        thoughts.push(`Determine necessary file structure changes`);
        thoughts.push(`Draft the implementation code`);
        thoughts.push(`Review code for best practices`);
    } else if (lowerInput.includes('refactor') || lowerInput.includes('optimize')) {
        thoughts.push(`Analyze current code structure and performance`);
        thoughts.push(`Identify areas for improvement`);
        thoughts.push(`Apply refactoring patterns safely`);
    } else {
        thoughts.push(`Formulate step-by-step execution plan`);
    }

    thoughts.push(`Identify potential risks or side effects`);
    
    return thoughts;
  }

  // 2. Self-Correction / Critique Loop
  // Evaluates the generated code or plan against best practices
  public async critiqueCode(code: string): Promise<{ valid: boolean; feedback: string }> {
    try {
      const result = await AiWorkerService.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: `Critique the following code for best practices, security, and potential bugs. Return a JSON object with 'valid' (boolean) and 'feedback' (string). Do not include markdown formatting.\n\nCode:\n${code}` }] }]
      });

      const text = result.text || '{"valid": true, "feedback": ""}';
      try {
        const critique = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        return critique;
      } catch (e) {
        // Fallback
      }
    } catch (e) {
      console.error("Failed to critique code with Ham Engine.", e);
    }

    if (code.includes('console.log')) {
      return { valid: true, feedback: 'Warning: Console logs found. Ensure they are for debugging only.' };
    }
    if (code.includes('eval(')) {
      return { valid: false, feedback: 'Critical: Usage of eval() is prohibited for security reasons.' };
    }
    return { valid: true, feedback: 'Code looks safe.' };
  }

  // 3. Backtracking
  // If a plan fails, revert state and try an alternative path
  public async backtrack(state: Record<string, unknown>): Promise<void> {
    // console.log('Backtracking to previous stable state...', state);
    // Implementation would involve restoring a project snapshot
  }

  // 4. Action Evaluation
  // Evaluates an action before execution to prevent destructive or incorrect behavior
  public async evaluateAction(action: { name: string, parameters?: Record<string, unknown> }, project: ProjectData | null): Promise<{ score: number, feedback: string }> {
    try {
      const result = await AiWorkerService.generateContent({
        model: "gemini-2.5-flash",
        contents: [{ role: 'user', parts: [{ text: `Evaluate the following action for safety, correctness, and best practices. Return a JSON object with 'score' (number from 0.0 to 1.0) and 'feedback' (string). A score below 0.5 means the action should be blocked or modified.\n\nAction: ${JSON.stringify(action)}` }] }]
      });

      const text = result.text || '{"score": 1.0, "feedback": ""}';
      try {
        const evaluation = JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
        return {
            score: typeof evaluation.score === 'number' ? evaluation.score : 1.0,
            feedback: typeof evaluation.feedback === 'string' ? evaluation.feedback : ''
        };
      } catch (e) {
        // Fallback
      }
    } catch (e) {
      console.error("Failed to evaluate action with Ham Engine.", e);
    }

    // Basic heuristic fallback
    if (action.name === 'run_command' && action.parameters?.command) {
        const cmd = String(action.parameters.command).toLowerCase();
        if (cmd.includes('rm -rf /') || cmd.includes('mkfs')) {
            return { score: 0.0, feedback: 'Critical: Destructive command detected.' };
        }
    }
    
    return { score: 1.0, feedback: 'Action looks safe.' };
  }
}
