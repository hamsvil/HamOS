export type AgentIdentity = {
  id: string;
  displayName: string;
  basePersona: string;
  capabilities: string[];
  isMeta?: boolean;
};

class AgentIdentityRegistry {
  private agents: Map<string, AgentIdentity> = new Map();

  constructor() {
    // Default Lisa Meta Agent (for dev tasks)
    this.registerAgent({
      id: 'lisa-meta',
      displayName: 'Lisa (Meta)',
      basePersona: 'You are Lisa, a high-level development sub-agent. Your goal is to execute development tasks precisely.',
      capabilities: ['code-edit', 'shell-access', 'system-admin'],
      isMeta: true
    });

    // Default Lisa Feature Agent (for in-app features)
    this.registerAgent({
      id: 'lisa',
      displayName: 'Lisa',
      basePersona: 'You are Lisa, an autonomous AI assistant integrated into HAM AI Studio features.',
      capabilities: ['ui-interaction', 'data-processing', 'autonomous-decision']
    });
  }

  registerAgent(agent: AgentIdentity) {
    this.agents.set(agent.id, agent);
  }

  getAgent(id: string): AgentIdentity | undefined {
    return this.agents.get(id);
  }

  getRuntimeIdentity(instanceKey: string): string {
    return instanceKey;
  }
}

export const agentIdentityRegistry = new AgentIdentityRegistry();
