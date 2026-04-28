// [AUTO-GENERATED-IMPORTS-START]
import { ActiveAgentMatrix } from './components/ActiveAgentMatrix';
import { AuditLogPanel } from './components/AuditLogPanel';
import { CloneRulesetButton } from './components/CloneRulesetButton';
import { ConflictResolverPanel } from './components/ConflictResolverPanel';
import { DevModeToggle } from './components/DevModeToggle';
import { EnableDisableRuleToggle } from './components/EnableDisableRuleToggle';
import { ExportRulesetButton } from './components/ExportRulesetButton';
import { FeatureBindingConfig } from './components/FeatureBindingConfig';
import { GlobalRuleDefaults } from './components/GlobalRuleDefaults';
import { ImportRulesetButton } from './components/ImportRulesetButton';
import { RuleAssignmentManager } from './components/RuleAssignmentManager';
import { RuleCategoryManager } from './components/RuleCategoryManager';
import { RuleCoverageStats } from './components/RuleCoverageStats';
import { RuleDescriptionEditor } from './components/RuleDescriptionEditor';
import { RuleDisplayNameInput } from './components/RuleDisplayNameInput';
import { RuleExportButton } from './components/RuleExportButton';
import { RuleImportButton } from './components/RuleImportButton';
import { RuleQuickAction } from './components/RuleQuickAction';
import { RuleSeverityPicker } from './components/RuleSeverityPicker';
import { RuleTemplateLibrary } from './components/RuleTemplateLibrary';
import { RuleTestPanel } from './components/RuleTestPanel';
import { RuleTypeSelector } from './components/RuleTypeSelector';
import { RuleViolationHistory } from './components/RuleViolationHistory';
import { RulesetHierarchyTree } from './components/RulesetHierarchyTree';
import { RulesetVersionHistory } from './components/RulesetVersionHistory';
// [AUTO-GENERATED-IMPORTS-END]
import React, { Suspense } from 'react';
import { useFeatureAgentStore } from '../../store/featureAgentStore';
import { featureRulesRegistry } from '../../services/featureRules/FeatureRulesRegistry';
import { agentIdentityRegistry } from '../../services/featureRules/AgentIdentity';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Shield, Bot, AlertCircle, Loader2 } from 'lucide-react';
import { ErrorBoundary } from '../../components/ErrorBoundary';

const FeatureRulesPanelContent = () => {
  const assignments = useFeatureAgentStore(state => state.assignments);
  const rulesets = featureRulesRegistry.list();

  return (
    <div className="p-6 space-y-6 h-full overflow-y-auto bg-slate-950 text-slate-50">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Shield className="text-blue-500" />
          Feature Rules Management
        </h1>
        <Badge variant="outline" className="border-blue-500/50 text-blue-400">Security Governance</Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rulesets.map(ruleset => {
          const assignedAgentId = assignments[ruleset.featureId];
          const agent = agentIdentityRegistry.getAgent(assignedAgentId || 'lisa');

          return (
            <Card key={ruleset.featureId} className="bg-slate-900 border-slate-800 hover:border-blue-500/30 transition-all">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg font-bold">{ruleset.displayName}</CardTitle>
                  <Badge variant="secondary" className="text-[10px]">{ruleset.version}</Badge>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Bot size={14} className="text-slate-400" />
                  <span className="text-xs text-slate-400">Assigned: {agent?.displayName || 'None'}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Active Rules</h4>
                  <div className="space-y-1">
                    {ruleset.rules.map(rule => (
                      <div key={rule.id} className="flex items-start gap-2 text-xs bg-slate-800/50 p-2 rounded">
                        <AlertCircle size={12} className={rule.severity === 'must' ? 'text-red-500' : 'text-yellow-500'} />
                        <span>{rule.description}</span>
                      </div>
                    ))}
                    {ruleset.rules.length === 0 && <p className="text-xs text-slate-600 italic">No specific rules</p>}
                  </div>
                </div>
                
                <div className="space-y-1">
                   <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">System Prompt Overlay</h4>
                   <pre className="text-[10px] bg-black/40 p-2 rounded overflow-x-auto text-slate-400 max-h-32">
                     {ruleset.systemPromptOverlay.trim()}
                   </pre>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-2 mt-8 opacity-50 border-t border-slate-800 pt-4">
          // [AUTO-GENERATED-COMPONENTS-START]
          <ActiveAgentMatrix />
          <AuditLogPanel />
          <CloneRulesetButton />
          <ConflictResolverPanel />
          <DevModeToggle />
          <EnableDisableRuleToggle />
          <ExportRulesetButton />
          <FeatureBindingConfig />
          <GlobalRuleDefaults />
          <ImportRulesetButton />
          <RuleAssignmentManager />
          <RuleCategoryManager />
          <RuleCoverageStats />
          <RuleDescriptionEditor />
          <RuleDisplayNameInput />
          <RuleExportButton />
          <RuleImportButton />
          <RuleQuickAction />
          <RuleSeverityPicker />
          <RuleTemplateLibrary />
          <RuleTestPanel />
          <RuleTypeSelector />
          <RuleViolationHistory />
          <RulesetHierarchyTree />
          <RulesetVersionHistory />
          // [AUTO-GENERATED-COMPONENTS-END]
        </div>
</div>
  );
};

export const FeatureRulesPanel = () => (
  <ErrorBoundary>
    <Suspense fallback={<div className="flex items-center justify-center h-full bg-slate-950"><Loader2 className="w-10 h-10 animate-spin text-blue-500" /></div>}>
      <FeatureRulesPanelContent />
    </Suspense>
  </ErrorBoundary>
);

export default FeatureRulesPanel;
