import { useMemo, useEffect } from 'react';
import { useFeatureAgentStore } from '../../../store/featureAgentStore';

export interface BoundAgentInstance {
  agent: {
    id: string;
    displayName: string;
  };
  ruleset: any;
  instanceKey: string;
}

const agentRuleBinder = {
  bind: (agentId: string, featureId: string): BoundAgentInstance => ({
    agent: { id: agentId, displayName: agentId },
    ruleset: {},
    instanceKey: `${agentId}:${featureId}`
  })
};

const featureRulesRegistry = {
  register: (ruleset: any) => {},
  validateAction: (featureId: string, action: any) => ({ valid: true, violations: [] })
};

export function useFeatureAgent(featureId: string) {
  const assignments = useFeatureAgentStore(state => state.assignments);
  const assignedAgentId = assignments[featureId] || 'lisa';

  const boundInstance = useMemo(() => {
    try {
      return agentRuleBinder.bind(assignedAgentId, featureId);
    } catch (e) {
      console.error(`[useFeatureAgent] Binding failed for ${featureId}:`, e);
      return null;
    }
  }, [assignedAgentId, featureId]);

  const runAction = async (action: any) => {
    if (!boundInstance) return;
    
    const validation = featureRulesRegistry.validateAction(featureId, action);
    if (!validation.valid) {
      const mustViolation = validation.violations.find(v => v.severity === 'must');
      if (mustViolation) {
        throw new Error(`rule_violation: ${mustViolation.id} - ${mustViolation.description}`);
      }
    }
    
    // In a real implementation, this would call the agent with the composed prompt
    console.log(`[${boundInstance.instanceKey}] Running action:`, action);
    return { success: true, result: "Action executed with ruleset overlay" };
  };

  return {
    agent: boundInstance?.agent,
    ruleset: boundInstance?.ruleset,
    boundInstance,
    runAction
  };
}
