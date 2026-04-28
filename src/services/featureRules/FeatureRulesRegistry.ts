export type FeatureRule = {
  id: string;
  description: string;
  severity: 'must' | 'should' | 'may';
  check?: (ctx: any) => boolean;
};

export interface AgentPersona {
  name: string;
  role: string;
  personality: string;
  tone: 'formal' | 'casual' | 'technical' | 'creative';
  prohibitions: string[];
  mandatories: string[];
}

export type FeatureRuleset = {
  featureId: string;
  displayName: string;
  version: string;
  systemPromptOverlay: string;
  rules: FeatureRule[];
  allowedTools?: string[];
  deniedTools?: string[];
  memoryNamespace: string;
  agentPersona?: AgentPersona;
  memoryIsolation?: boolean;
  logFile?: string;
  escalationPolicy?: string;
  contextBoundary?: string[];
};

class FeatureRulesRegistry {
  private rulesets: Map<string, FeatureRuleset> = new Map();

  register(ruleset: FeatureRuleset) {
    this.rulesets.set(ruleset.featureId, ruleset);
  }

  get(featureId: string): FeatureRuleset | undefined {
    return this.rulesets.get(featureId);
  }

  list(): FeatureRuleset[] {
    return Array.from(this.rulesets.values());
  }

  validateAction(featureId: string, action: any): { valid: boolean; violations: FeatureRule[] } {
    const ruleset = this.rulesets.get(featureId);
    if (!ruleset) return { valid: true, violations: [] };

    const violations = ruleset.rules.filter(rule => {
      if (rule.check) {
        return !rule.check(action);
      }
      return false;
    });

    const mustViolations = violations.filter(v => v.severity === 'must');
    return {
      valid: mustViolations.length === 0,
      violations
    };
  }
}

export const featureRulesRegistry = new FeatureRulesRegistry();
