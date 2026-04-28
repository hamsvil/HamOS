import { LisaBaseAgent, LisaAgentConfig } from '../../../sAgent/coreAgents/LisaBaseAgent';
import { agentPersonaRegistry } from '../../../sAgent/AgentPersonaRegistry';

export interface BugReport {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  location: string;
  description: string;
  suggestion: string;
  confidence: number;
}

export class BugHunterAgent extends LisaBaseAgent {
  constructor(config: Partial<LisaAgentConfig> = {}) {
    const persona = agentPersonaRegistry.getPersona('bug-hunter');
    super({
      id: 'bug-hunter-agent',
      featureId: 'bug-hunter',
      name: persona?.name || 'Bug Hunter',
      role: persona?.role || 'Vulnerability Tracer',
      systemInstruction: persona?.systemPromptOverlay || 'You are an expert bug hunter and security researcher. Analyze code for bugs, vulnerabilities, and performance issues.',
      apiKeys: (globalThis as any).GEMINI_API_KEY ? [(globalThis as any).GEMINI_API_KEY] : [],
      logFile: 'logs/agent_bug_hunter.log',
      ...config
    });
  }

  public async analyze(codeSnippet: string): Promise<BugReport> {
    const response = await this.executeWithAudit(`Analyze the following code for bugs:\n\n${codeSnippet}`);
    try {
      // Assuming the agent returns a JSON string, if not we'd need more parsing logic
      return JSON.parse(response);
    } catch (e) {
      return {
        severity: 'MEDIUM',
        location: 'unknown',
        description: response,
        suggestion: 'Manually review the response',
        confidence: 0.5
      };
    }
  }

  public async scanFile(filePath: string): Promise<BugReport[]> {
    const response = await this.executeWithAudit(`Scan file ${filePath} for bugs and vulnerabilities.`);
    try {
      return JSON.parse(response);
    } catch (e) {
      return [];
    }
  }
}
