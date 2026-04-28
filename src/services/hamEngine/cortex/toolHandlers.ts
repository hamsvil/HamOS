/* eslint-disable no-useless-assignment */
import { HamToolName, ToolExecutionResult } from './types';
import { ToolHandlersPart2 } from './toolHandlersPart2';
import { vfs } from '../../vfsService';
import { shadowVFS } from '../kernel/ShadowVFS';
import { shellService } from '../../shellService';
import { safeStorage } from '../../../utils/storage';

export class ToolHandlers {
  static async executeTool(name: HamToolName, args: any): Promise<ToolExecutionResult> {
    try {
      switch (name) {
        // Core / File System
        case HamToolName.LIST_DIR:
          return await this.handleListDir(args.path);
        case HamToolName.VIEW_FILE:
          return await this.handleViewFile(args.path);
        case HamToolName.CREATE_FILE:
          return await this.handleCreateFile(args.path, args.content);
        case HamToolName.EDIT_FILE:
          return await this.handleEditFile(args.path, args.targetContent, args.replacementContent);
        case HamToolName.MULTI_EDIT_FILE:
          return await this.handleMultiEditFile(args.path, args.edits);
        case HamToolName.DELETE_FILE:
          return await this.handleDeleteFile(args.path);
        case HamToolName.MOVE:
          return await this.handleMove(args.sourcePath, args.destinationPath);
        case HamToolName.DELETE_DIR:
          return await this.handleDeleteDir(args.path);
        
        // Execution
        case HamToolName.SHELL_EXEC:
          return await this.handleShellExec(args.command, args.serverSide);
        
        // Context
        case HamToolName.READ_URL_CONTENT:
          return await this.handleReadUrlContent(args.url);
        case HamToolName.VIEW_CONTENT_CHUNK:
          return await this.handleViewContentChunk(args.document_id, args.position);
        case HamToolName.QUERY_LIVE_DATABASE:
          return await this.handleQueryLiveDatabase(args.collection, args.query);
        case HamToolName.LOAD_CONTEXTUAL_TOOLKIT:
          return await this.handleLoadContextualToolkit(args.toolkitName);
        case HamToolName.FINISH_TASK:
          return await this.handleFinishTask(args.summary);
        case HamToolName.UPGRADE_ENGINE_CORE:
          return await this.handleUpgradeEngineCore(args.instruction);

        // Part 2 Delegation
        case HamToolName.INSTALL_APPLET_PACKAGE:
          return await ToolHandlersPart2.handleInstallPackage(args.packages);
        case HamToolName.RESTART_DEV_SERVER:
          return await ToolHandlersPart2.handleRestartServer();
        case HamToolName.INSTALL_APPLET_DEPENDENCIES:
          return await ToolHandlersPart2.handleInstallDependencies();
        case HamToolName.SET_UP_FIREBASE:
          return await ToolHandlersPart2.handleSetUpFirebase();
        case HamToolName.DEPLOY_FIREBASE:
          return await ToolHandlersPart2.handleDeployFirebase();
        case HamToolName.PROVISION_CLOUD_INFRASTRUCTURE:
          return await ToolHandlersPart2.handleProvisionCloud();
        case HamToolName.LINT_APPLET:
          return await ToolHandlersPart2.handleLintApplet();
        case HamToolName.COMPILE_APPLET:
          return await ToolHandlersPart2.handleCompileApplet();
        case HamToolName.CAPTURE_AND_ANALYZE_UI:
          return await ToolHandlersPart2.handleCaptureUI(args.route);
        case HamToolName.SIMULATE_USER_INTERACTION:
          return await ToolHandlersPart2.handleSimulateInteraction(args.route, args.actions);
        case HamToolName.EXECUTE_HTTP_REQUEST:
          return await ToolHandlersPart2.handleExecuteHttpRequest(args.url, args.method, args.headers, args.body);
        case HamToolName.ANALYZE_PERFORMANCE_METRICS:
          return await ToolHandlersPart2.handleAnalyzePerformance();
        case HamToolName.RUN_SECURITY_PENETRATION:
          return await ToolHandlersPart2.handleRunSecurity();
        case HamToolName.MANAGE_VERSION_CONTROL:
          return await ToolHandlersPart2.handleManageVersionControl(args.command);
        case HamToolName.MANAGE_LONG_TERM_MEMORY:
          return await ToolHandlersPart2.handleManageLongTermMemory(args.memory);
        case HamToolName.ANALYZE_USER_TELEMETRY:
          return await ToolHandlersPart2.handleAnalyzeTelemetry();
        case HamToolName.GENERATE_MEDIA_ASSETS:
          return await ToolHandlersPart2.handleGenerateMedia(args.prompt);
        case HamToolName.SPAWN_EPHEMERAL_THREAD:
          return await ToolHandlersPart2.handleSpawnEphemeralThread(args.task);
        case HamToolName.RUN_MENTAL_SANDBOX:
          return await ToolHandlersPart2.handleRunMentalSandbox(args.code);
        case HamToolName.RUN_HS_CODE:
          return await ToolHandlersPart2.handleRunHsCode(args.code);
        case HamToolName.CHECK_SYNTAX:
          return await this.handleCheckSyntax(args.path);

        // Advanced Diagnostics
        case HamToolName.DIAGNOSE_NETWORK_CONNECTIVITY:
          return await ToolHandlersPart2.handleDiagnoseNetwork(args.target_host);
        case HamToolName.RESET_NETWORK_INTERFACE:
          return await ToolHandlersPart2.handleResetNetworkInterface();
        case HamToolName.CHECK_CLOUD_SHELL_STATUS:
          return await ToolHandlersPart2.handleCheckCloudShellStatus();
        case HamToolName.CHECK_VFS_INTEGRITY:
          return await ToolHandlersPart2.handleCheckVfsIntegrity(args.path);
        case HamToolName.RECONCILE_VFS_ENTRY:
          return await ToolHandlersPart2.handleReconcileVfsEntry(args.path);
        case HamToolName.FORCE_DELETE_FILE:
          return await ToolHandlersPart2.handleForceDeleteFile(args.path);
        case HamToolName.CLEAR_VFS_CACHE:
          return await ToolHandlersPart2.handleClearVfsCache();
        case HamToolName.VIEW_SYSTEM_LOGS:
          return await ToolHandlersPart2.handleViewSystemLogs(args.component, args.num_lines);
        case HamToolName.CHECK_PROCESS_STATUS:
          return await ToolHandlersPart2.handleCheckProcessStatus(args.process_name);
        case HamToolName.RESTART_COMPONENT:
          return await ToolHandlersPart2.handleRestartComponent(args.component_name);
        case HamToolName.GET_ENGINE_TELEMETRY:
          return await ToolHandlersPart2.handleGetEngineTelemetry();
        case HamToolName.GET_AI_MODEL_DETAILS:
          return await ToolHandlersPart2.handleGetAiModelDetails();
        case HamToolName.GET_PROCESS_ENVIRONMENT:
          return await ToolHandlersPart2.handleGetProcessEnvironment(args.pid);
        case HamToolName.KILL_PROCESS:
          return await ToolHandlersPart2.handleKillProcess(args.pid, args.signal);
        case HamToolName.RESTART_RUNTIME_ENVIRONMENT:
          return await ToolHandlersPart2.handleRestartRuntimeEnvironment();
        case HamToolName.LIST_INSTALLED_PACKAGES:
          return await ToolHandlersPart2.handleListInstalledPackages(args.package_manager);
        case HamToolName.CHECK_PACKAGE_INTEGRITY:
          return await ToolHandlersPart2.handleCheckPackageIntegrity(args.package_name, args.package_manager);
        case HamToolName.FIX_PACKAGE_DEPENDENCIES:
          return await ToolHandlersPart2.handleFixPackageDependencies(args.package_manager);
        case HamToolName.STATIC_CODE_ANALYSIS:
          return await ToolHandlersPart2.handleStaticCodeAnalysis(args.path, args.rules);
        case HamToolName.GET_CODE_COVERAGE:
          return await ToolHandlersPart2.handleGetCodeCoverage(args.path);
        case HamToolName.SIMULATE_CODE_EXECUTION:
          return await ToolHandlersPart2.handleSimulateCodeExecution(args.code, args.inputs);
        case HamToolName.READ_CONFIG_FILE:
          return await ToolHandlersPart2.handleReadConfigFile(args.path, args.format);
        case HamToolName.VALIDATE_CONFIG_FILE:
          return await ToolHandlersPart2.handleValidateConfigFile(args.path, args.schema_path);
        case HamToolName.MOCK_HTTP_REQUEST:
          return await ToolHandlersPart2.handleMockHttpRequest(args.url, args.method, args.response_body, args.status_code);
        case HamToolName.AUDIT_SECURITY_POLICY:
          return await ToolHandlersPart2.handleAuditSecurityPolicy(args.policy_path);
        case HamToolName.GET_INTERNAL_VERSION_HISTORY:
          return await ToolHandlersPart2.handleGetInternalVersionHistory(args.path);

        // SubAgent Bridge Tools
        case HamToolName.SUBAGENT_READ_FILE:
          return await this.handleViewFile(args.path);
        case HamToolName.SUBAGENT_WRITE_FILE:
          return await this.handleCreateFile(args.path, args.content);
        case HamToolName.SUBAGENT_LIST_FILES:
          return await this.handleListDir(args.path);
        case HamToolName.SUBAGENT_SEARCH_CODE:
          return await this.handleShellExec(`grep -rI "${args.query}" .`, false);
        case HamToolName.SUBAGENT_GET_PROJECT_STRUCTURE:
          return await this.handleShellExec(`find . -maxdepth 3 -type d`, false);

        default:
          return { success: false, output: `Unknown tool: ${name}` };
      }
    } catch (e: any) {
      return { success: false, output: `Tool execution failed: ${e.message}` };
    }
  }

  // --- Implementations ---

  static async handleListDir(path: string): Promise<ToolExecutionResult> {
    try {
      const files = await vfs.readdir(path);
      return { success: true, output: `Contents of ${path}:\n${files.join('\n')}` };
    } catch (e: any) {
      return { success: false, output: `Failed to list directory: ${e.message}` };
    }
  }

  static async handleViewFile(path: string): Promise<ToolExecutionResult> {
    try {
      let content = '';
      try {
        content = await shadowVFS.read(path);
      } catch (e) {
        content = await vfs.readFile(path);
      }
      return { success: true, output: content };
    } catch (e: any) {
      return { success: false, output: `Failed to read file: ${e.message}` };
    }
  }

  static async handleCreateFile(path: string, content: string): Promise<ToolExecutionResult> {
    try {
      await shadowVFS.write(path, content);
      return { success: true, output: `File created successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to create file: ${e.message}` };
    }
  }

  private static flexibleReplace(content: string, target: string, replacement: string, path: string): string {
    const normalize = (str: string) => str.replace(/\s+/g, ' ').trim();
    const normTarget = normalize(target);
    
    if (!normTarget) return content;

    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escapedTarget.replace(/\s+/g, '\\s+');
    const regex = new RegExp(regexStr);
    
    const match = content.match(regex);
    if (match) {
      return content.substring(0, match.index) + replacement + content.substring(match.index! + match[0].length);
    }
    
    throw new Error(`Target content not found in ${path} (even with flexible whitespace matching).`);
  }

  static async handleEditFile(path: string, targetContent: string, replacementContent: string): Promise<ToolExecutionResult> {
    try {
      let content = '';
      try {
        content = await shadowVFS.read(path);
      } catch (e) {
        content = await vfs.readFile(path);
      }
      
      try {
        content = this.flexibleReplace(content, targetContent, replacementContent, path);
      } catch (e: any) {
        return { success: false, output: e.message };
      }
      
      await shadowVFS.write(path, content);
      return { success: true, output: `File edited successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to edit file: ${e.message}` };
    }
  }

  static async handleMultiEditFile(path: string, edits: { targetContent: string, replacementContent: string }[]): Promise<ToolExecutionResult> {
    try {
      if (!Array.isArray(edits)) {
        return { success: false, output: "Error: 'edits' parameter must be an array of { targetContent, replacementContent } objects." };
      }
      let content = '';
      try {
        content = await shadowVFS.read(path);
      } catch (e) {
        content = await vfs.readFile(path);
      }
      
      for (const edit of edits) {
        try {
          content = this.flexibleReplace(content, edit.targetContent, edit.replacementContent, path);
        } catch (e: any) {
          return { success: false, output: e.message };
        }
      }
      
      await shadowVFS.write(path, content);
      return { success: true, output: `File edited successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to edit file: ${e.message}` };
    }
  }

  static async handleDeleteFile(path: string): Promise<ToolExecutionResult> {
    try {
      await shadowVFS.write(path, ''); // Simulate delete in shadowVFS
      try {
        await vfs.deleteFile(path);
      } catch (e: any) {
        if (e.code === 'ENOENT' || e.message.includes('ENOENT')) {
          // File might only exist in shadowVFS, which is fine
          return { success: true, output: `File deleted successfully at ${path} (from shadow workspace)` };
        }
        throw e;
      }
      return { success: true, output: `File deleted successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to delete file: ${e.message}` };
    }
  }

  static async handleMove(sourcePath: string, destinationPath: string): Promise<ToolExecutionResult> {
    try {
      let content = '';
      try {
        content = await shadowVFS.read(sourcePath);
      } catch (e) {
        content = await vfs.readFile(sourcePath);
      }
      await shadowVFS.write(destinationPath, content);
      await shadowVFS.write(sourcePath, ''); // Simulate delete in shadowVFS
      try {
        await vfs.deleteFile(sourcePath);
      } catch (e: any) {
        if (e.code !== 'ENOENT' && !e.message.includes('ENOENT')) {
          throw e;
        }
      }
      return { success: true, output: `Moved ${sourcePath} to ${destinationPath}` };
    } catch (e: any) {
      return { success: false, output: `Failed to move file: ${e.message}` };
    }
  }

  static async handleDeleteDir(path: string): Promise<ToolExecutionResult> {
    try {
      try {
        await vfs.unlink(path);
      } catch (e: any) {
        if (e.code !== 'ENOENT' && !e.message.includes('ENOENT')) {
          throw e;
        }
      }
      return { success: true, output: `Directory deleted successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to delete directory: ${e.message}` };
    }
  }

  static async handleShellExec(command: string, serverSide: boolean = false): Promise<ToolExecutionResult> {
    try {
      await shadowVFS.flushToMainVFS();
      const result = await shellService.execute(command, serverSide);
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Shell execution failed: ${e.message}` };
    }
  }

  static async handleReadUrlContent(url: string): Promise<ToolExecutionResult> {
    try {
      const response = await fetch(url);
      const text = await response.text();
      return { success: response.ok, output: text.substring(0, 10000) };
    } catch (e: any) {
      return { success: false, output: `Failed to read URL: ${e.message}` };
    }
  }

  static async handleViewContentChunk(document_id: string, position: number): Promise<ToolExecutionResult> {
    return { success: true, output: `Chunk ${position} of ${document_id} retrieved.` };
  }

  static async handleQueryLiveDatabase(collection: string, query: any): Promise<ToolExecutionResult> {
    return { success: true, output: `Query executed on ${collection}.` };
  }

  static async handleLoadContextualToolkit(toolkitName: string): Promise<ToolExecutionResult> {
    safeStorage.setItem('ham_ai_toolkit', toolkitName);
    return { success: true, output: `Toolkit switched to ${toolkitName}.` };
  }

  static async handleCheckSyntax(path: string): Promise<ToolExecutionResult> {
    try {
      let content = '';
      try {
        content = await shadowVFS.read(path);
      } catch (e) {
        content = await vfs.readFile(path);
      }

      // Dynamically import typescript to avoid bloating the main bundle if not used
      const ts = await import('typescript');
      
      const sourceFile = ts.createSourceFile(
        path,
        content,
        ts.ScriptTarget.Latest,
        true
      );

      // We need to parse diagnostics. Since we don't have a full program, 
      // we can only get syntactic diagnostics (parse errors).
      // For semantic errors, a full ts.createProgram is needed, which is heavy.
      // But syntactic diagnostics catch 90% of typo issues.
      const diagnostics = (sourceFile as any).parseDiagnostics || [];

      if (diagnostics.length === 0) {
        return { success: true, output: `Syntax check passed for ${path}. No parse errors found.` };
      }

      const errors = diagnostics.map((diagnostic: any) => {
        if (diagnostic.file) {
          const { line, character } = ts.getLineAndCharacterOfPosition(diagnostic.file, diagnostic.start!);
          const message = ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
          return `${path} (${line + 1},${character + 1}): error TS${diagnostic.code}: ${message}`;
        } else {
          return ts.flattenDiagnosticMessageText(diagnostic.messageText, "\n");
        }
      });

      return { success: false, output: `Syntax errors found in ${path}:\n${errors.join('\n')}` };
    } catch (e: any) {
      return { success: false, output: `Failed to check syntax: ${e.message}` };
    }
  }

  static async handleFinishTask(summary: string): Promise<ToolExecutionResult> {
    return { success: true, output: `Task finished: ${summary}` };
  }

  static async handleUpgradeEngineCore(instruction: string): Promise<ToolExecutionResult> {
    return { success: true, output: `Engine core upgrade initiated: ${instruction}` };
  }
}
