import { featureRulesRegistry, FeatureRuleset } from './FeatureRulesRegistry';
import { agentIdentityRegistry, AgentIdentity } from './AgentIdentity';

export interface BoundAgentInstance {
  instanceKey: string;
  agentId: string;
  featureId: string;
  composedSystemPrompt: string;
  memoryNamespace: string;
  ruleset: FeatureRuleset;
  agent: AgentIdentity;
}

class AgentRuleBinder {
  private activeInstances: Map<string, BoundAgentInstance> = new Map();

  bind(agentId: string, featureId: string): BoundAgentInstance {
    const agent = agentIdentityRegistry.getAgent(agentId);
    if (!agent) throw new Error(`Agent ${agentId} not found`);

    if (agent.isMeta) {
      throw new Error("meta_agent_cannot_be_bound");
    }

    const ruleset = featureRulesRegistry.get(featureId) || featureRulesRegistry.get('lisa-core');
    if (!ruleset) {
        throw new Error(`No ruleset found for feature ${featureId} and no default lisa-core ruleset exists.`);
    }

    const instanceKey = `${agentId}@${featureId}`;
    
    const instance: BoundAgentInstance = {
      instanceKey,
      agentId,
      featureId,
      composedSystemPrompt: `${agent.basePersona}\n\n[FEATURE RULES: ${ruleset.displayName}]\n${ruleset.systemPromptOverlay}`,
      memoryNamespace: ruleset.memoryNamespace,
      ruleset,
      agent
    };

    this.activeInstances.set(instanceKey, instance);
    return instance;
  }

  unbind(instanceKey: string) {
    // Runtime cleanup if necessary (e.g., event listeners)
    this.activeInstances.delete(instanceKey);
  }

  getInstance(instanceKey: string): BoundAgentInstance | undefined {
    return this.activeInstances.get(instanceKey);
  }
}

export const agentRuleBinder = new AgentRuleBinder();
