/* eslint-disable no-useless-assignment */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { FunctionDeclaration } from '@google/genai';
import { HamToolName, HamMode, ToolkitType } from './types';
import { BaseToolkit } from './toolkits/BaseToolkit';
import { CoderToolkit } from './toolkits/CoderToolkit';
import { QAVisionToolkit } from './toolkits/QAVisionToolkit';
import { DevOpsToolkit } from './toolkits/DevOpsToolkit';
import { MetaToolkit } from './toolkits/MetaToolkit';
import { AdvancedDiagnosticsToolkit } from './toolkits/AdvancedDiagnosticsToolkit';
import { SubAgentToolkit } from './toolkits/SubAgentToolkit';

export { BaseToolkit, CoderToolkit, QAVisionToolkit, DevOpsToolkit, MetaToolkit, AdvancedDiagnosticsToolkit, SubAgentToolkit };

// Helper to get all tools
function getAllTools(): FunctionDeclaration[] {
  return [
    ...BaseToolkit,
    ...CoderToolkit,
    ...QAVisionToolkit,
    ...DevOpsToolkit,
    ...MetaToolkit,
    ...AdvancedDiagnosticsToolkit,
    ...SubAgentToolkit
  ];
}

// Helper to get tools based on HamMode, active toolkit, and sandbox state
export function getToolsForMode(mode: HamMode, activeToolkit: ToolkitType, isSandboxed: boolean = true): FunctionDeclaration[] {
  // 0. SINGULARITY MODE (Full Access) - All tools available
  if (!isSandboxed) {
    return getAllTools();
  }

  // 1. FAST MODE (The Tactical Sniper) - Max 5 tools
  if (mode === 'fast') {
    const fastToolNames = [
      HamToolName.CREATE_FILE,
      HamToolName.VIEW_FILE,
      HamToolName.EDIT_FILE,
      HamToolName.MULTI_EDIT_FILE,
      HamToolName.LIST_DIR,
      HamToolName.SHELL_EXEC,
      HamToolName.LINT_APPLET,
      HamToolName.FINISH_TASK
    ];
    return getAllTools().filter(t => fastToolNames.includes(t.name as HamToolName));
  }

  // 2. THINKING MODE (The Deep Debugger) - 10 tools
  if (mode === 'thinking') {
    const thinkingToolNames = [
      HamToolName.CREATE_FILE,
      HamToolName.VIEW_FILE,
      HamToolName.EDIT_FILE,
      HamToolName.MULTI_EDIT_FILE,
      HamToolName.SHELL_EXEC,
      HamToolName.LINT_APPLET,
      HamToolName.COMPILE_APPLET,
      HamToolName.RUN_MENTAL_SANDBOX,
      HamToolName.RUN_HS_CODE,
      HamToolName.LIST_DIR,
      HamToolName.READ_URL_CONTENT,
      HamToolName.FINISH_TASK
    ];
    return getAllTools().filter(t => thinkingToolNames.includes(t.name as HamToolName));
  }

  // 3. DEEP MODE (The Ham-God) - All tools accessible via contextual switching
  switch (activeToolkit) {
    case 'coder': return [...BaseToolkit, ...CoderToolkit];
    case 'qa_vision': return [...BaseToolkit, ...QAVisionToolkit];
    case 'devops': return [...BaseToolkit, ...DevOpsToolkit];
    case 'meta': return [...BaseToolkit, ...MetaToolkit];
    case 'advanced_diagnostics': return [...BaseToolkit, ...AdvancedDiagnosticsToolkit];
    case 'subagent': return [...BaseToolkit, ...SubAgentToolkit];
    case 'base':
    default: return BaseToolkit;
  }
}
