# CMIS (Comprehensive Master Inspection & Strategy)

## 1. TypeScript Compiler Errors
```
src/App.tsx(205,33): error TS2339: Property '__HAM_AI_READY__' does not exist on type 'unknown'.
src/App.tsx(269,54): error TS2339: Property 'message' does not exist on type 'unknown'.
src/App.tsx(390,33): error TS2339: Property 'detail' does not exist on type 'unknown'.
src/chams-lang/compiler/deparser.ts(66,147): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(69,44): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(69,75): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(72,93): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(75,92): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(75,124): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(78,141): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(84,49): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(85,76): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(99,96): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(115,102): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(123,108): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(123,153): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(123,198): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(156,75): error TS2339: Property 'param' does not exist on type 'unknown'.
src/chams-lang/compiler/deparser.ts(156,96): error TS2339: Property 'param' does not exist on type 'unknown'.
src/chams-lang/compiler/deparser.ts(158,52): error TS2339: Property 'body' does not exist on type 'unknown'.
src/chams-lang/compiler/deparser.ts(173,44): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(176,44): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(176,86): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(179,61): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(184,64): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(205,44): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/deparser.ts(205,100): error TS2345: Argument of type 'unknown' is not assignable to parameter of type 'OmniASTNode'.
src/chams-lang/compiler/transpiler_part1.ts(66,21): error TS2339: Property 'type' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(67,32): error TS2339: Property 'elements' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(68,24): error TS2339: Property 'type' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(68,57): error TS2339: Property 'name' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(72,21): error TS2339: Property 'type' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(73,32): error TS2339: Property 'properties' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(74,26): error TS2339: Property 'type' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(74,61): error TS2339: Property 'name' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(75,26): error TS2339: Property 'key' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(75,39): error TS2339: Property 'value' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(75,58): error TS2339: Property 'key' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(76,32): error TS2339: Property 'key' does not exist on type 'unknown'.
src/chams-lang/compiler/transpiler_part1.ts(76,67): error TS2 ... (truncated)
```

## 2. Codebase Scan Findings
### File: `src/App.tsx`
- [ARCHITECTURE] File is too large (565 lines). Split into smaller modules.
  - **Action**: Refactor src/App.tsx into smaller components/services.

### File: `src/chams-lang/compiler/parser_expressions_Part1.ts`
- [TYPE SAFETY] Line 38: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part1.ts at line 38 to remove 'any'.
- [TYPE SAFETY] Line 39: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part1.ts at line 39 to remove 'any'.
- [TYPE SAFETY] Line 187: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part1.ts at line 187 to remove 'any'.
- [TYPE SAFETY] Line 191: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part1.ts at line 191 to remove 'any'.

### File: `src/chams-lang/compiler/parser_expressions_Part2.ts`
- [TYPE SAFETY] Line 60: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 60 to remove 'any'.
- [TYPE SAFETY] Line 61: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 61 to remove 'any'.
- [TYPE SAFETY] Line 97: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 97 to remove 'any'.
- [TYPE SAFETY] Line 98: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 98 to remove 'any'.
- [TYPE SAFETY] Line 118: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 118 to remove 'any'.
- [TYPE SAFETY] Line 129: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 129 to remove 'any'.
- [TYPE SAFETY] Line 151: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 151 to remove 'any'.
- [TYPE SAFETY] Line 152: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 152 to remove 'any'.
- [TYPE SAFETY] Line 188: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 188 to remove 'any'.
- [TYPE SAFETY] Line 225: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 225 to remove 'any'.
- [TYPE SAFETY] Line 307: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/compiler/parser_expressions_Part2.ts at line 307 to remove 'any'.

### File: `src/chams-lang/engine/evaluator.ts`
- [TYPE SAFETY] Line 203: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/engine/evaluator.ts at line 203 to remove 'any'.

### File: `src/chams-lang/engine/evaluator_core.ts`
- [TYPE SAFETY] Line 9: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/engine/evaluator_core.ts at line 9 to remove 'any'.

### File: `src/chams-lang/engine/evaluator_expressions.ts`
- [TYPE SAFETY] Line 290: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/engine/evaluator_expressions.ts at line 290 to remove 'any'.

### File: `src/chams-lang/index.ts`
- [TYPE SAFETY] Line 27: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/chams-lang/index.ts at line 27 to remove 'any'.

### File: `src/components/AIHub/hooks/useAIHubSession.ts`
- [TYPE SAFETY] Line 36: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/AIHub/hooks/useAIHubSession.ts at line 36 to remove 'any'.

### File: `src/components/AIHubChat/ChatInput.tsx`
- [TYPE SAFETY] Line 118: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/AIHubChat/ChatInput.tsx at line 118 to remove 'any'.

### File: `src/components/GlobalRecoverySystem.tsx`
- [TYPE SAFETY] Line 75: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/GlobalRecoverySystem.tsx at line 75 to remove 'any'.

### File: `src/components/HamAiStudio/AnalyticsDashboardModal.tsx`
- [TYPE SAFETY] Line 16: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/AnalyticsDashboardModal.tsx at line 16 to remove 'any'.

### File: `src/components/HamAiStudio/Dashboard.tsx`
- [TYPE SAFETY] Line 63: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Dashboard.tsx at line 63 to remove 'any'.
- [TYPE SAFETY] Line 64: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Dashboard.tsx at line 64 to remove 'any'.

### File: `src/components/HamAiStudio/DeveloperHealthDashboard.tsx`
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/DeveloperHealthDashboard.tsx at line 20 to remove 'any'.

### File: `src/components/HamAiStudio/Device/DeviceMonitor.tsx`
- [TYPE SAFETY] Line 38: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/DeviceMonitor.tsx at line 38 to remove 'any'.
- [TYPE SAFETY] Line 43: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/DeviceMonitor.tsx at line 43 to remove 'any'.
- [TYPE SAFETY] Line 48: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/DeviceMonitor.tsx at line 48 to remove 'any'.
- [TYPE SAFETY] Line 73: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/DeviceMonitor.tsx at line 73 to remove 'any'.
- [TYPE SAFETY] Line 75: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/DeviceMonitor.tsx at line 75 to remove 'any'.

### File: `src/components/HamAiStudio/Device/PerformanceOverlay.tsx`
- [TYPE SAFETY] Line 29: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/Device/PerformanceOverlay.tsx at line 29 to remove 'any'.

### File: `src/components/HamAiStudio/GlobalErrorBoundary.tsx`
- [TYPE SAFETY] Line 83: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/GlobalErrorBoundary.tsx at line 83 to remove 'any'.

### File: `src/components/HamAiStudio/ManualPlanningModal.tsx`
- [TYPE SAFETY] Line 75: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/ManualPlanningModal.tsx at line 75 to remove 'any'.

### File: `src/components/HamAiStudio/ProjectExportModal.tsx`
- [TYPE SAFETY] Line 67: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/ProjectExportModal.tsx at line 67 to remove 'any'.

### File: `src/components/HamAiStudio/ProjectPreview.tsx`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/ProjectPreview.tsx at line 8 to remove 'any'.

### File: `src/components/HamAiStudio/TerminalEmulator/TerminalEmulator_Part1.tsx`
- [TYPE SAFETY] Line 66: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/TerminalEmulator/TerminalEmulator_Part1.tsx at line 66 to remove 'any'.
- [TYPE SAFETY] Line 71: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/TerminalEmulator/TerminalEmulator_Part1.tsx at line 71 to remove 'any'.

### File: `src/components/HamAiStudio/TerminalEmulator/useTerminalLogic.ts`
- [TYPE SAFETY] Line 17: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/TerminalEmulator/useTerminalLogic.ts at line 17 to remove 'any'.
- [TYPE SAFETY] Line 18: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/TerminalEmulator/useTerminalLogic.ts at line 18 to remove 'any'.
- [TYPE SAFETY] Line 140: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/TerminalEmulator/useTerminalLogic.ts at line 140 to remove 'any'.

### File: `src/components/HamAiStudio/WebProjectRenderer/PreviewGenerator.ts`
- [UI LAYER] Line 233: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/components/HamAiStudio/WebProjectRenderer/PreviewGenerator.ts at line 233 to use useRef.
- [UI LAYER] Line 234: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/components/HamAiStudio/WebProjectRenderer/PreviewGenerator.ts at line 234 to use useRef.
- [UI LAYER] Line 243: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/components/HamAiStudio/WebProjectRenderer/PreviewGenerator.ts at line 243 to use useRef.
- [UI LAYER] Line 244: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/components/HamAiStudio/WebProjectRenderer/PreviewGenerator.ts at line 244 to use useRef.

### File: `src/components/HamAiStudio/hooks/useAgentExecution.ts`
- [TYPE SAFETY] Line 84: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/hooks/useAgentExecution.ts at line 84 to remove 'any'.

### File: `src/components/HamAiStudio/hooks/useAgenticAiReActLoop.ts`
- [ARCHITECTURE] File is too large (574 lines). Split into smaller modules.
  - **Action**: Refactor src/components/HamAiStudio/hooks/useAgenticAiReActLoop.ts into smaller components/services.

### File: `src/components/HamAiStudio/hooks/useAiGeneration/HamEngineGenerator.ts`
- [TYPE SAFETY] Line 63: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/hooks/useAiGeneration/HamEngineGenerator.ts at line 63 to remove 'any'.

### File: `src/components/HamAiStudio/hooks/useAiGeneration_Part1.ts`
- [TYPE SAFETY] Line 176: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/hooks/useAiGeneration_Part1.ts at line 176 to remove 'any'.
- [TYPE SAFETY] Line 243: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/hooks/useAiGeneration_Part1.ts at line 243 to remove 'any'.
- [TYPE SAFETY] Line 345: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamAiStudio/hooks/useAiGeneration_Part1.ts at line 345 to remove 'any'.

### File: `src/components/HamAiStudio/hooks/useDeepScan.ts`
- [TECH DEBT] Line 50: TODO/FIXME found.
  - **Action**: Resolve the TODO in src/components/HamAiStudio/hooks/useDeepScan.ts at line 50.
- [TECH DEBT] Line 52: TODO/FIXME found.
  - **Action**: Resolve the TODO in src/components/HamAiStudio/hooks/useDeepScan.ts at line 52.

### File: `src/components/HamBackground.tsx`
- [TYPE SAFETY] Line 23: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/HamBackground.tsx at line 23 to remove 'any'.

### File: `src/components/InternalBrowser/components/BrowserToolbar.tsx`
- [TYPE SAFETY] Line 31: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/components/BrowserToolbar.tsx at line 31 to remove 'any'.

### File: `src/components/InternalBrowser/components/JockeyPanel.tsx`
- [TYPE SAFETY] Line 23: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/components/JockeyPanel.tsx at line 23 to remove 'any'.

### File: `src/components/InternalBrowser/hooks/useBrowserEvents.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/hooks/useBrowserEvents.ts at line 5 to remove 'any'.
- [TYPE SAFETY] Line 77: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/hooks/useBrowserEvents.ts at line 77 to remove 'any'.

### File: `src/components/InternalBrowser/hooks/useBrowserPilot.ts`
- [TYPE SAFETY] Line 6: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/hooks/useBrowserPilot.ts at line 6 to remove 'any'.
- [TYPE SAFETY] Line 50: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/hooks/useBrowserPilot.ts at line 50 to remove 'any'.

### File: `src/components/InternalBrowser/index.tsx`
- [TYPE SAFETY] Line 87: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/InternalBrowser/index.tsx at line 87 to remove 'any'.

### File: `src/components/PrivateSource/Hooks/useArchiveOperations.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useArchiveOperations.ts at line 8 to remove 'any'.
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useArchiveOperations.ts at line 10 to remove 'any'.
- [TYPE SAFETY] Line 11: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useArchiveOperations.ts at line 11 to remove 'any'.
- [TYPE SAFETY] Line 31: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useArchiveOperations.ts at line 31 to remove 'any'.
- [TYPE SAFETY] Line 51: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useArchiveOperations.ts at line 51 to remove 'any'.

### File: `src/components/PrivateSource/Hooks/useBulkOperations.ts`
- [TYPE SAFETY] Line 11: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 11 to remove 'any'.
- [TYPE SAFETY] Line 13: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 13 to remove 'any'.
- [TYPE SAFETY] Line 14: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 14 to remove 'any'.
- [TYPE SAFETY] Line 47: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 47 to remove 'any'.
- [TYPE SAFETY] Line 79: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 79 to remove 'any'.
- [TYPE SAFETY] Line 109: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 109 to remove 'any'.
- [TYPE SAFETY] Line 132: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 132 to remove 'any'.
- [TYPE SAFETY] Line 180: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useBulkOperations.ts at line 180 to remove 'any'.

### File: `src/components/PrivateSource/Hooks/useFileOperations.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 8 to remove 'any'.
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 10 to remove 'any'.
- [TYPE SAFETY] Line 11: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 11 to remove 'any'.
- [TYPE SAFETY] Line 24: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 24 to remove 'any'.
- [TYPE SAFETY] Line 36: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 36 to remove 'any'.
- [TYPE SAFETY] Line 49: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 49 to remove 'any'.
- [TYPE SAFETY] Line 66: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 66 to remove 'any'.
- [TYPE SAFETY] Line 79: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 79 to remove 'any'.
- [TYPE SAFETY] Line 94: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 94 to remove 'any'.
- [TYPE SAFETY] Line 106: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileOperations.ts at line 106 to remove 'any'.

### File: `src/components/PrivateSource/Hooks/useFileSystemCore.ts`
- [TYPE SAFETY] Line 18: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 18 to remove 'any'.
- [TYPE SAFETY] Line 19: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 19 to remove 'any'.
- [TYPE SAFETY] Line 74: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 74 to remove 'any'.
- [TYPE SAFETY] Line 116: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 116 to remove 'any'.
- [TYPE SAFETY] Line 138: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 138 to remove 'any'.
- [TYPE SAFETY] Line 145: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 145 to remove 'any'.
- [TYPE SAFETY] Line 167: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useFileSystemCore.ts at line 167 to remove 'any'.

### File: `src/components/PrivateSource/Hooks/useTrashBin.ts`
- [TYPE SAFETY] Line 6: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Hooks/useTrashBin.ts at line 6 to remove 'any'.

### File: `src/components/PrivateSource/Modals/DirectoryPickerModal.tsx`
- [TYPE SAFETY] Line 15: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Modals/DirectoryPickerModal.tsx at line 15 to remove 'any'.

### File: `src/components/PrivateSource/Toolbar/QuantumDropzone.tsx`
- [TYPE SAFETY] Line 88: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/Toolbar/QuantumDropzone.tsx at line 88 to remove 'any'.

### File: `src/components/PrivateSource/hooks/usePrivateSourceAssistantLogic.ts`
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/hooks/usePrivateSourceAssistantLogic.ts at line 20 to remove 'any'.

### File: `src/components/PrivateSource/types.ts`
- [TYPE SAFETY] Line 23: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/PrivateSource/types.ts at line 23 to remove 'any'.

### File: `src/components/Settings/ContentSection.tsx`
- [TYPE SAFETY] Line 62: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/Settings/ContentSection.tsx at line 62 to remove 'any'.

### File: `src/components/Settings/GeneralSection.tsx`
- [TYPE SAFETY] Line 40: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/Settings/GeneralSection.tsx at line 40 to remove 'any'.

### File: `src/components/Settings/PerformanceSection.tsx`
- [TYPE SAFETY] Line 21: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/Settings/PerformanceSection.tsx at line 21 to remove 'any'.
- [TYPE SAFETY] Line 29: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/Settings/PerformanceSection.tsx at line 29 to remove 'any'.
- [TYPE SAFETY] Line 35: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/Settings/PerformanceSection.tsx at line 35 to remove 'any'.

### File: `src/components/SystemInfoModal.tsx`
- [TYPE SAFETY] Line 30: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/SystemInfoModal.tsx at line 30 to remove 'any'.

### File: `src/components/SystemStatsDisplay.tsx`
- [TYPE SAFETY] Line 9: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/SystemStatsDisplay.tsx at line 9 to remove 'any'.
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/components/SystemStatsDisplay.tsx at line 10 to remove 'any'.

### File: `src/config/ProjectConfig.ts`
- [TYPE SAFETY] Line 29: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/config/ProjectConfig.ts at line 29 to remove 'any'.

### File: `src/constants/config.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/constants/config.ts at line 8 to remove 'any'.

### File: `src/constants/prompts.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/constants/prompts.ts at line 8 to remove 'any'.
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/constants/prompts.ts at line 10 to remove 'any'.
- [TYPE SAFETY] Line 15: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/constants/prompts.ts at line 15 to remove 'any'.

### File: `src/context/ThemeContext.tsx`
- [UI LAYER] Line 49: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/context/ThemeContext.tsx at line 49 to use useRef.

### File: `src/ham-script/Evaluator.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/ham-script/Evaluator.ts at line 8 to remove 'any'.

### File: `src/ham-synapse/engine/ai.worker.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/ham-synapse/engine/ai.worker.ts at line 5 to remove 'any'.

### File: `src/ham-synapse/engine/memory_worker.ts`
- [TYPE SAFETY] Line 14: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/ham-synapse/engine/memory_worker.ts at line 14 to remove 'any'.

### File: `src/hooks/super-assistant/SuperAssistantProvider.tsx`
- [TYPE SAFETY] Line 25: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hooks/super-assistant/SuperAssistantProvider.tsx at line 25 to remove 'any'.

### File: `src/hooks/useSystemState.ts`
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hooks/useSystemState.ts at line 20 to remove 'any'.
- [TYPE SAFETY] Line 29: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hooks/useSystemState.ts at line 29 to remove 'any'.
- [TYPE SAFETY] Line 35: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hooks/useSystemState.ts at line 35 to remove 'any'.

### File: `src/hs-lang/compiler/parser_declarations.ts`
- [TYPE SAFETY] Line 31: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 31 to remove 'any'.
- [TYPE SAFETY] Line 33: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 33 to remove 'any'.
- [TYPE SAFETY] Line 47: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 47 to remove 'any'.
- [TYPE SAFETY] Line 56: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 56 to remove 'any'.
- [TYPE SAFETY] Line 81: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 81 to remove 'any'.
- [TYPE SAFETY] Line 130: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 130 to remove 'any'.
- [TYPE SAFETY] Line 166: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_declarations.ts at line 166 to remove 'any'.

### File: `src/hs-lang/compiler/parser_expressions.ts`
- [TYPE SAFETY] Line 43: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions.ts at line 43 to remove 'any'.
- [TYPE SAFETY] Line 44: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions.ts at line 44 to remove 'any'.
- [TYPE SAFETY] Line 86: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions.ts at line 86 to remove 'any'.

### File: `src/hs-lang/compiler/parser_expressions_primary.ts`
- [TYPE SAFETY] Line 24: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_primary.ts at line 24 to remove 'any'.
- [TYPE SAFETY] Line 33: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_primary.ts at line 33 to remove 'any'.
- [TYPE SAFETY] Line 58: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_primary.ts at line 58 to remove 'any'.
- [TYPE SAFETY] Line 87: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_primary.ts at line 87 to remove 'any'.
- [TYPE SAFETY] Line 124: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_primary.ts at line 124 to remove 'any'.

### File: `src/hs-lang/compiler/parser_expressions_unary.ts`
- [TYPE SAFETY] Line 60: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_unary.ts at line 60 to remove 'any'.
- [TYPE SAFETY] Line 61: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_unary.ts at line 61 to remove 'any'.
- [TYPE SAFETY] Line 97: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_unary.ts at line 97 to remove 'any'.
- [TYPE SAFETY] Line 98: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/parser_expressions_unary.ts at line 98 to remove 'any'.

### File: `src/hs-lang/compiler/transpiler_base.ts`
- [TYPE SAFETY] Line 17: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_base.ts at line 17 to remove 'any'.
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_base.ts at line 20 to remove 'any'.
- [TYPE SAFETY] Line 26: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_base.ts at line 26 to remove 'any'.

### File: `src/hs-lang/compiler/transpiler_declarations.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_declarations.ts at line 5 to remove 'any'.
- [TYPE SAFETY] Line 69: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_declarations.ts at line 69 to remove 'any'.

### File: `src/hs-lang/compiler/transpiler_expressions.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_expressions.ts at line 5 to remove 'any'.

### File: `src/hs-lang/compiler/transpiler_statements.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_statements.ts at line 5 to remove 'any'.
- [TYPE SAFETY] Line 129: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/compiler/transpiler_statements.ts at line 129 to remove 'any'.

### File: `src/hs-lang/core/types.ts`
- [TYPE SAFETY] Line 143: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/core/types.ts at line 143 to remove 'any'.

### File: `src/hs-lang/engine/evaluatorUtils.ts`
- [TYPE SAFETY] Line 4: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluatorUtils.ts at line 4 to remove 'any'.

### File: `src/hs-lang/engine/evaluator_control_flow.ts`
- [TYPE SAFETY] Line 4: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 4 to remove 'any'.
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 20 to remove 'any'.
- [TYPE SAFETY] Line 35: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 35 to remove 'any'.
- [TYPE SAFETY] Line 61: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 61 to remove 'any'.
- [TYPE SAFETY] Line 83: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 83 to remove 'any'.
- [TYPE SAFETY] Line 93: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 93 to remove 'any'.
- [TYPE SAFETY] Line 100: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 100 to remove 'any'.
- [TYPE SAFETY] Line 113: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 113 to remove 'any'.
- [TYPE SAFETY] Line 122: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 122 to remove 'any'.
- [TYPE SAFETY] Line 133: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_control_flow.ts at line 133 to remove 'any'.

### File: `src/hs-lang/engine/evaluator_core.ts`
- [TYPE SAFETY] Line 9: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_core.ts at line 9 to remove 'any'.

### File: `src/hs-lang/engine/evaluator_expressions.ts`
- [TYPE SAFETY] Line 288: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/evaluator_expressions.ts at line 288 to remove 'any'.

### File: `src/hs-lang/engine/memory.ts`
- [TYPE SAFETY] Line 12: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/engine/memory.ts at line 12 to remove 'any'.

### File: `src/hs-lang/index.ts`
- [TYPE SAFETY] Line 32: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/index.ts at line 32 to remove 'any'.
- [TYPE SAFETY] Line 219: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/hs-lang/index.ts at line 219 to remove 'any'.

### File: `src/hs-lang/stdlib/os_primitives.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/hs-lang/stdlib/os_primitives.ts.

### File: `src/main.tsx`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/main.tsx.

### File: `src/omni-synapse/core/types.ts`
- [TYPE SAFETY] Line 24: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/omni-synapse/core/types.ts at line 24 to remove 'any'.

### File: `src/omni-synapse/engine/ai.worker.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/omni-synapse/engine/ai.worker.ts at line 5 to remove 'any'.

### File: `src/omni-synapse/engine/memory_worker.ts`
- [TYPE SAFETY] Line 111: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/omni-synapse/engine/memory_worker.ts at line 111 to remove 'any'.

### File: `src/plugins/NativeAI.ts`
- [TYPE SAFETY] Line 28: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/plugins/NativeAI.ts at line 28 to remove 'any'.
- [TYPE SAFETY] Line 34: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/plugins/NativeAI.ts at line 34 to remove 'any'.

### File: `src/plugins/NativeStorage.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/plugins/NativeStorage.ts.

### File: `src/polyfills.ts`
- [TYPE SAFETY] Line 16: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/polyfills.ts at line 16 to remove 'any'.
- [TYPE SAFETY] Line 23: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/polyfills.ts at line 23 to remove 'any'.
- [TYPE SAFETY] Line 24: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/polyfills.ts at line 24 to remove 'any'.
- [TYPE SAFETY] Line 40: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/polyfills.ts at line 40 to remove 'any'.

### File: `src/server/handlers/proxyHandler.ts`
- [TYPE SAFETY] Line 46: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/server/handlers/proxyHandler.ts at line 46 to remove 'any'.

### File: `src/server/handlers/readerHandler.ts`
- [TYPE SAFETY] Line 43: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/server/handlers/readerHandler.ts at line 43 to remove 'any'.

### File: `src/server/routes/privateSource.ts`
- [TYPE SAFETY] Line 42: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/server/routes/privateSource.ts at line 42 to remove 'any'.
- [TYPE SAFETY] Line 49: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/server/routes/privateSource.ts at line 49 to remove 'any'.
- [MEMORY LEAK] 'setInterval' used without 'clearInterval'.
  - **Action**: Add cleanup logic for setInterval in src/server/routes/privateSource.ts.

### File: `src/server/routes/proxy.ts`
- [UI LAYER] Line 312: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/server/routes/proxy.ts at line 312 to use useRef.
- [UI LAYER] Line 321: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/server/routes/proxy.ts at line 321 to use useRef.
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/server/routes/proxy.ts.

### File: `src/server/routes/web.ts`
- [MEMORY LEAK] 'setInterval' used without 'clearInterval'.
  - **Action**: Add cleanup logic for setInterval in src/server/routes/web.ts.

### File: `src/server/socket.ts`
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/server/socket.ts at line 10 to remove 'any'.

### File: `src/services/PermissionService.ts`
- [TYPE SAFETY] Line 8: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/PermissionService.ts at line 8 to remove 'any'.
- [TYPE SAFETY] Line 18: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/PermissionService.ts at line 18 to remove 'any'.

### File: `src/services/PlatformAbstractionLayer.ts`
- [TYPE SAFETY] Line 32: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/PlatformAbstractionLayer.ts at line 32 to remove 'any'.
- [TYPE SAFETY] Line 44: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/PlatformAbstractionLayer.ts at line 44 to remove 'any'.

### File: `src/services/ResilienceEngine.ts`
- [TYPE SAFETY] Line 110: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/ResilienceEngine.ts at line 110 to remove 'any'.
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/ResilienceEngine.ts.

### File: `src/services/advancedAssistant/performance/PerformanceManager.ts`
- [TYPE SAFETY] Line 44: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/advancedAssistant/performance/PerformanceManager.ts at line 44 to remove 'any'.
- [TYPE SAFETY] Line 45: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/advancedAssistant/performance/PerformanceManager.ts at line 45 to remove 'any'.

### File: `src/services/aiHub/core/NeuralContextService.ts`
- [TYPE SAFETY] Line 19: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/aiHub/core/NeuralContextService.ts at line 19 to remove 'any'.
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/aiHub/core/NeuralContextService.ts at line 20 to remove 'any'.

### File: `src/services/aiWorkerService.ts`
- [ARCHITECTURE] File is too large (532 lines). Split into smaller modules.
  - **Action**: Refactor src/services/aiWorkerService.ts into smaller components/services.
- [TYPE SAFETY] Line 294: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/aiWorkerService.ts at line 294 to remove 'any'.

### File: `src/services/androidBuildService.ts`
- [UI LAYER] Line 196: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/services/androidBuildService.ts at line 196 to use useRef.
- [TYPE SAFETY] Line 294: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/androidBuildService.ts at line 294 to remove 'any'.

### File: `src/services/deviceMonitorService.ts`
- [TYPE SAFETY] Line 15: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/deviceMonitorService.ts at line 15 to remove 'any'.
- [TYPE SAFETY] Line 32: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/deviceMonitorService.ts at line 32 to remove 'any'.
- [TYPE SAFETY] Line 36: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/deviceMonitorService.ts at line 36 to remove 'any'.

### File: `src/services/firebaseProvisioningService.ts`
- [TYPE SAFETY] Line 7: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/firebaseProvisioningService.ts at line 7 to remove 'any'.

### File: `src/services/gitService.ts`
- [TYPE SAFETY] Line 14: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 14 to remove 'any'.
- [TYPE SAFETY] Line 15: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 15 to remove 'any'.
- [TYPE SAFETY] Line 57: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 57 to remove 'any'.
- [TYPE SAFETY] Line 97: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 97 to remove 'any'.
- [TYPE SAFETY] Line 144: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 144 to remove 'any'.
- [TYPE SAFETY] Line 162: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 162 to remove 'any'.
- [TYPE SAFETY] Line 182: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 182 to remove 'any'.
- [TYPE SAFETY] Line 204: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 204 to remove 'any'.
- [TYPE SAFETY] Line 207: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/gitService.ts at line 207 to remove 'any'.

### File: `src/services/hamEngine/cortex/ModelClient.ts`
- [TYPE SAFETY] Line 6: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/ModelClient.ts at line 6 to remove 'any'.

### File: `src/services/hamEngine/cortex/ToolExecutor.ts`
- [TYPE SAFETY] Line 6: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/ToolExecutor.ts at line 6 to remove 'any'.

### File: `src/services/hamEngine/cortex/handlers/BaseHandlers.ts`
- [TYPE SAFETY] Line 12: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/BaseHandlers.ts at line 12 to remove 'any'.
- [TYPE SAFETY] Line 26: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/BaseHandlers.ts at line 26 to remove 'any'.
- [TYPE SAFETY] Line 36: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/BaseHandlers.ts at line 36 to remove 'any'.
- [TYPE SAFETY] Line 46: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/BaseHandlers.ts at line 46 to remove 'any'.

### File: `src/services/hamEngine/cortex/handlers/CoderHandlers.ts`
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 10 to remove 'any'.
- [TYPE SAFETY] Line 21: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 21 to remove 'any'.
- [TYPE SAFETY] Line 34: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 34 to remove 'any'.
- [TYPE SAFETY] Line 64: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 64 to remove 'any'.
- [TYPE SAFETY] Line 76: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 76 to remove 'any'.
- [TYPE SAFETY] Line 86: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 86 to remove 'any'.
- [TYPE SAFETY] Line 90: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 90 to remove 'any'.
- [TYPE SAFETY] Line 96: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/cortex/handlers/CoderHandlers.ts at line 96 to remove 'any'.

### File: `src/services/hamEngine/inquisitor/auditor.ts`
- [TYPE SAFETY] Line 21: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/inquisitor/auditor.ts at line 21 to remove 'any'.

### File: `src/services/hamEngine/kernel/ShadowStorage.ts`
- [TYPE SAFETY] Line 10: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/kernel/ShadowStorage.ts at line 10 to remove 'any'.

### File: `src/services/hamEngine/kernel/hamSecurity.ts`
- [TYPE SAFETY] Line 20: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/kernel/hamSecurity.ts at line 20 to remove 'any'.

### File: `src/services/hamEngine/taskValidator.ts`
- [TYPE SAFETY] Line 23: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/taskValidator.ts at line 23 to remove 'any'.

### File: `src/services/hamEngine/workerTaskProcessor.ts`
- [TYPE SAFETY] Line 178: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/hamEngine/workerTaskProcessor.ts at line 178 to remove 'any'.

### File: `src/services/hamliKeyManager.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/hamliKeyManager.ts.

### File: `src/services/hamliMemoryService.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/hamliMemoryService.ts.

### File: `src/services/lspService.ts`
- [TYPE SAFETY] Line 124: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/lspService.ts at line 124 to remove 'any'.

### File: `src/services/omniEngine/cortex/core.ts`
- [TYPE SAFETY] Line 150: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/omniEngine/cortex/core.ts at line 150 to remove 'any'.

### File: `src/services/omniEngine/inquisitor/auditor.ts`
- [TYPE SAFETY] Line 26: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/omniEngine/inquisitor/auditor.ts at line 26 to remove 'any'.

### File: `src/services/omniEngine/omniSecurity.ts`
- [TYPE SAFETY] Line 87: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/omniEngine/omniSecurity.ts at line 87 to remove 'any'.

### File: `src/services/omniNode/engine.ts`
- [UI LAYER] Line 133: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/services/omniNode/engine.ts at line 133 to use useRef.

### File: `src/services/openRouterEngine/architect.ts`
- [TYPE SAFETY] Line 51: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/architect.ts at line 51 to remove 'any'.
- [TYPE SAFETY] Line 75: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/architect.ts at line 75 to remove 'any'.

### File: `src/services/openRouterEngine/qaTester.ts`
- [TYPE SAFETY] Line 63: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/qaTester.ts at line 63 to remove 'any'.

### File: `src/services/openRouterEngine/taskProcessor.ts`
- [TYPE SAFETY] Line 107: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/taskProcessor.ts at line 107 to remove 'any'.
- [TYPE SAFETY] Line 162: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/taskProcessor.ts at line 162 to remove 'any'.
- [TYPE SAFETY] Line 293: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/openRouterEngine/taskProcessor.ts at line 293 to remove 'any'.

### File: `src/services/plugin/PluginAPI.ts`
- [TYPE SAFETY] Line 27: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/plugin/PluginAPI.ts at line 27 to remove 'any'.
- [TYPE SAFETY] Line 31: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/plugin/PluginAPI.ts at line 31 to remove 'any'.

### File: `src/services/pluginManager.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/pluginManager.ts.

### File: `src/services/runtime/webContainer.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/runtime/webContainer.ts.

### File: `src/services/securityMemoryService.ts`
- [TYPE SAFETY] Line 17: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/securityMemoryService.ts at line 17 to remove 'any'.

### File: `src/services/shell/ExecutionStrategy.ts`
- [TYPE SAFETY] Line 44: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/shell/ExecutionStrategy.ts at line 44 to remove 'any'.
- [TYPE SAFETY] Line 70: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/shell/ExecutionStrategy.ts at line 70 to remove 'any'.

### File: `src/services/shell/ShellSanitizer.ts`
- [TYPE SAFETY] Line 15: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/shell/ShellSanitizer.ts at line 15 to remove 'any'.

### File: `src/services/super-assistant/ContextManager.ts`
- [TYPE SAFETY] Line 99: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/super-assistant/ContextManager.ts at line 99 to remove 'any'.

### File: `src/services/super-assistant/PerformanceOptimizer.ts`
- [TYPE SAFETY] Line 11: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/super-assistant/PerformanceOptimizer.ts at line 11 to remove 'any'.

### File: `src/services/super-assistant/SecurityGuard.ts`
- [TYPE SAFETY] Line 144: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/super-assistant/SecurityGuard.ts at line 144 to remove 'any'.

### File: `src/services/super-assistant/ToolRegistryHelpers.ts`
- [TYPE SAFETY] Line 88: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/super-assistant/ToolRegistryHelpers.ts at line 88 to remove 'any'.

### File: `src/services/testRunnerService.ts`
- [TYPE SAFETY] Line 11: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/testRunnerService.ts at line 11 to remove 'any'.

### File: `src/services/vfs/VFSIndexer.ts`
- [TYPE SAFETY] Line 19: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/vfs/VFSIndexer.ts at line 19 to remove 'any'.

### File: `src/services/vfs/hybridVFS.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/vfs/hybridVFS.ts.

### File: `src/services/vfs.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/vfs.ts.

### File: `src/services/vfsService.ts`
- [ARCHITECTURE] File is too large (714 lines). Split into smaller modules.
  - **Action**: Refactor src/services/vfsService.ts into smaller components/services.

### File: `src/services/webcontainerService.ts`
- [TYPE SAFETY] Line 31: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/webcontainerService.ts at line 31 to remove 'any'.
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/webcontainerService.ts.

### File: `src/services/webcontainerServiceHelpers.ts`
- [TYPE SAFETY] Line 152: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/webcontainerServiceHelpers.ts at line 152 to remove 'any'.
- [TYPE SAFETY] Line 153: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/webcontainerServiceHelpers.ts at line 153 to remove 'any'.
- [UI LAYER] Line 249: Direct DOM manipulation detected. Use React refs instead.
  - **Action**: Refactor src/services/webcontainerServiceHelpers.ts at line 249 to use useRef.
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/services/webcontainerServiceHelpers.ts.

### File: `src/services/yjsMetadataSyncService.ts`
- [TYPE SAFETY] Line 49: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/services/yjsMetadataSyncService.ts at line 49 to remove 'any'.

### File: `src/sw.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/sw.ts.

### File: `src/utils/nativeBridge.ts`
- [TYPE SAFETY] Line 66: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/nativeBridge.ts at line 66 to remove 'any'.
- [TYPE SAFETY] Line 155: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/nativeBridge.ts at line 155 to remove 'any'.

### File: `src/utils/storage.ts`
- [TYPE SAFETY] Line 69: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/storage.ts at line 69 to remove 'any'.
- [TYPE SAFETY] Line 120: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/storage.ts at line 120 to remove 'any'.

### File: `src/utils/touchFeedback.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/utils/touchFeedback.ts.

### File: `src/utils/xmlParser.ts`
- [TYPE SAFETY] Line 5: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/xmlParser.ts at line 5 to remove 'any'.
- [TYPE SAFETY] Line 127: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/utils/xmlParser.ts at line 127 to remove 'any'.

### File: `src/workers/ai.worker.ts`
- [ARCHITECTURE] File is too large (758 lines). Split into smaller modules.
  - **Action**: Refactor src/workers/ai.worker.ts into smaller components/services.
- [TYPE SAFETY] Line 12: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/workers/ai.worker.ts at line 12 to remove 'any'.
- [TYPE SAFETY] Line 218: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/workers/ai.worker.ts at line 218 to remove 'any'.

### File: `src/workers/git.worker.ts`
- [MEMORY LEAK] 'addEventListener' used without 'removeEventListener'.
  - **Action**: Add cleanup logic for addEventListener in src/workers/git.worker.ts.

### File: `src/workers/vectorStore.worker.ts`
- [TYPE SAFETY] Line 35: Usage of 'any' detected. Replace with 'unknown' or specific type.
  - **Action**: Edit src/workers/vectorStore.worker.ts at line 35 to remove 'any'.
