
import { FeatureRuleset } from '../../services/featureRules/FeatureRulesRegistry';

export interface BoundAgentInstance {
  agent: {
    id: string;
    displayName: string;
  };
  ruleset: FeatureRuleset;
  instanceKey: string;
}

export const agentRuleBinder = {
  bind: (agentId: string, featureId: string): BoundAgentInstance => {
    return {
      agent: { id: agentId, displayName: agentId },
      ruleset: {} as any,
      instanceKey: `${agentId}:${featureId}`
    };
  }
};
