/* eslint-disable no-useless-assignment */
import { OmniToolName, ToolExecutionResult } from './types';
import { vfs } from '../../vfsService';
import { shellService } from '../../shellService';
import { flexibleReplace } from '../../advancedAssistant/tools/toolUtils';
import { OmniSecurity } from '../kernel/omniSecurity';
import { ToolHandlersPart2 } from './toolHandlersPart2';

// ============================================================================
// OMNI-ENGINE V8.2: TOOL HANDLERS (EXECUTION LOGIC)
// ============================================================================

export class ToolHandlers {
  
  // --------------------------------------------------------------------------
  // PILAR 1: PERSEPSI
  // --------------------------------------------------------------------------
  static async handleListDir(path: string): Promise<ToolExecutionResult> {
    try {
      const files = await vfs.listDir(path);
      return { success: true, output: `Directory contents:\n${files.join('\n')}` };
    } catch (e: any) {
      return { success: false, output: `Failed to list directory: ${e.message}` };
    }
  }

  static async handleViewFile(path: string): Promise<ToolExecutionResult> {
    try {
      let content = await vfs.readFile(path);
      // Egress Filtering & Secret Masking
      if (path.includes('.env') || path.includes('config')) {
        content = OmniSecurity.maskSecrets(content);
      }
      return { success: true, output: content };
    } catch (e: any) {
      return { success: false, output: `File not found or error reading: ${e.message}` };
    }
  }

  static async handleShellExec(command: string): Promise<ToolExecutionResult> {
    try {
      // Security: Terminal Muzzle
      const validation = OmniSecurity.validateShellCommand(command);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      const result = await shellService.execute(command);
      return { success: !result.isError, output: result.output || 'Command executed with no output.' };
    } catch (e: any) {
      return { success: false, output: `Shell execution failed: ${e.message}` };
    }
  }

  static async handleReadUrlContent(url: string): Promise<ToolExecutionResult> {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      return { success: true, output: text.substring(0, 15000) }; // Prevent token overflow
    } catch (e: any) {
      return { success: false, output: `Failed to read URL: ${e.message}` };
    }
  }

  static async handleViewContentChunk(documentId: string, position: number): Promise<ToolExecutionResult> {
    try {
      const content = await vfs.readFile(documentId);
      const chunkSize = 3000;
      const start = position * chunkSize;
      const chunk = content.substring(start, start + chunkSize);
      return { success: true, output: chunk || '[END OF FILE]' };
    } catch (e: any) {
      return { success: false, output: `Failed to read chunk: ${e.message}` };
    }
  }

  static async handleQueryLiveDatabase(collection: string, query?: any): Promise<ToolExecutionResult> {
    try {
      // Real Implementation using Firestore REST API
      const configPath = 'firebase-applet-config.json';
      const exists = await vfs.exists(configPath);
      if (!exists) {
        return { success: false, output: `Cannot query database: ${configPath} not found. Firebase is not configured.` };
      }

      const configStr = await vfs.readFile(configPath);
      const config = JSON.parse(configStr);

      if (!config.projectId || !config.firestoreDatabaseId) {
        return { success: false, output: `Invalid firebase config: Missing projectId or firestoreDatabaseId.` };
      }

      // Construct REST API URL
      // https://firestore.googleapis.com/v1/projects/{projectId}/databases/{databaseId}/documents/{collectionId}
      let url = `https://firestore.googleapis.com/v1/projects/${config.projectId}/databases/${config.firestoreDatabaseId}/documents/${collection}`;
      
      // Add API key if available (though usually requires auth token for private data)
      if (config.apiKey) {
        url += `?key=${config.apiKey}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, output: `Firestore API Error (${response.status}): ${errorText}` };
      }

      const data = await response.json();
      return { success: true, output: JSON.stringify(data, null, 2) };
    } catch (e: any) {
      return { success: false, output: `Database query failed: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // PILAR 2: EKSEKUSI BEDAH
  // --------------------------------------------------------------------------
  static async handleCreateFile(path: string, content: string): Promise<ToolExecutionResult> {
    try {
      const validation = OmniSecurity.validateFileModification(path);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      await vfs.writeFile(path, content);
      return { success: true, output: `File ${path} created successfully.` };
    } catch (e: any) {
      return { success: false, output: `Failed to create file: ${e.message}` };
    }
  }

  static async handleEditFile(path: string, targetContent: string, replacementContent: string): Promise<ToolExecutionResult> {
    try {
      const validation = OmniSecurity.validateFileModification(path);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      const currentContent = await vfs.readFile(path);
      const newContent = flexibleReplace(currentContent, targetContent, replacementContent);
      
      if (newContent === currentContent) {
        // Provide context on failure
        const lines = currentContent.split('\n');
        const targetLines = targetContent.split('\n');
        const firstTargetLine = targetLines[0].trim();
        
        let suggestions = "";
        if (firstTargetLine) {
          const matchingLines = lines
            .map((line, idx) => ({ line: line.trim(), idx }))
            .filter(item => item.line.includes(firstTargetLine))
            .slice(0, 3);
          
          if (matchingLines.length > 0) {
            suggestions = "\n\nPotential matches found at:\n" + 
              matchingLines.map(m => `Line ${m.idx + 1}: "${lines[m.idx]}"`).join('\n') +
              "\n\nPlease ensure your 'targetContent' matches the file content EXACTLY, including leading/trailing whitespace.";
          }
        }

        return { success: false, output: `Target content not found in ${path}.${suggestions}` };
      }
      
      await vfs.writeFile(path, newContent);
      return { success: true, output: `File ${path} edited successfully.` };
    } catch (e: any) {
      return { success: false, output: `Failed to edit file: ${e.message}` };
    }
  }

  static async handleMultiEditFile(path: string, edits: { targetContent: string; replacementContent: string }[]): Promise<ToolExecutionResult> {
    try {
      const validation = OmniSecurity.validateFileModification(path);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      let currentContent = await vfs.readFile(path);
      let failedEdits: string[] = [];

      let tempContent = currentContent;
      for (const edit of edits) {
        const newContent = flexibleReplace(tempContent, edit.targetContent, edit.replacementContent);
        if (newContent === tempContent) {
          failedEdits.push(edit.targetContent.substring(0, 50) + "...");
        } else {
          tempContent = newContent;
        }
      }

      if (failedEdits.length > 0) {
        return { success: false, output: `Multi-edit failed. ${failedEdits.length} of ${edits.length} target contents not found in ${path}. Failed snippets: [${failedEdits.join(', ')}]. Multi-edit aborted to prevent partial corruption.` };
      }

      await vfs.writeFile(path, tempContent);
      return { success: true, output: `File ${path} edited successfully. All ${edits.length} edits applied.` };
    } catch (e: any) {
      return { success: false, output: `Failed to multi-edit file: ${e.message}` };
    }
  }

  static async handleDeleteFile(path: string): Promise<ToolExecutionResult> {
    try {
      const validation = OmniSecurity.validateFileModification(path);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      await vfs.deleteFile(path);
      return { success: true, output: `File ${path} deleted.` };
    } catch (e: any) {
      return { success: false, output: `Failed to delete file: ${e.message}` };
    }
  }

  static async handleDeleteDir(path: string): Promise<ToolExecutionResult> {
    try {
      const validation = OmniSecurity.validateFileModification(path);
      if (!validation.safe) {
        return { success: false, output: `Security Error: ${validation.reason}` };
      }
      await vfs.deleteFile(path);
      return { success: true, output: `Directory ${path} deleted.` };
    } catch (e: any) {
      return { success: false, output: `Failed to delete directory: ${e.message}` };
    }
  }

  static async handleMove(sourcePath: string, destinationPath: string): Promise<ToolExecutionResult> {
    try {
      const validationSource = OmniSecurity.validateFileModification(sourcePath);
      const validationDest = OmniSecurity.validateFileModification(destinationPath);
      
      if (!validationSource.safe) return { success: false, output: `Security Error on source: ${validationSource.reason}` };
      if (!validationDest.safe) return { success: false, output: `Security Error on destination: ${validationDest.reason}` };
      
      // Use native VFS rename for atomic move
      await vfs.renameFile(sourcePath, destinationPath);
      
      return { success: true, output: `File moved from ${sourcePath} to ${destinationPath}.` };
    } catch (e: any) {
      return { success: false, output: `Failed to move file: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // ROUTER UTAMA
  // --------------------------------------------------------------------------
  static async executeTool(name: string, args: any): Promise<ToolExecutionResult> {
    try {
      switch (name) {
        case OmniToolName.LIST_DIR: return await this.handleListDir(args.path);
        case OmniToolName.VIEW_FILE: return await this.handleViewFile(args.path);
        case OmniToolName.SHELL_EXEC: return await this.handleShellExec(args.command);
        case OmniToolName.READ_URL_CONTENT: return await this.handleReadUrlContent(args.url);
        case OmniToolName.VIEW_CONTENT_CHUNK: return await this.handleViewContentChunk(args.document_id, args.position);
        case OmniToolName.QUERY_LIVE_DATABASE: return await this.handleQueryLiveDatabase(args.collection, args.query);
        
        case OmniToolName.CREATE_FILE: return await this.handleCreateFile(args.path, args.content);
        case OmniToolName.EDIT_FILE: return await this.handleEditFile(args.path, args.targetContent, args.replacementContent);
        case OmniToolName.MULTI_EDIT_FILE: return await this.handleMultiEditFile(args.path, args.edits);
        case OmniToolName.DELETE_FILE: return await this.handleDeleteFile(args.path);
        case OmniToolName.DELETE_DIR: return await this.handleDeleteDir(args.path);
        case OmniToolName.MOVE: return await this.handleMove(args.sourcePath, args.destinationPath);
        
        case OmniToolName.INSTALL_APPLET_PACKAGE: return await ToolHandlersPart2.handleInstallPackage(args.packages);
        case OmniToolName.INSTALL_APPLET_DEPENDENCIES: return await ToolHandlersPart2.handleInstallDependencies();
        case OmniToolName.RESTART_DEV_SERVER: return await ToolHandlersPart2.handleRestartServer();
        case OmniToolName.SET_UP_FIREBASE: return await ToolHandlersPart2.handleSetUpFirebase();
        case OmniToolName.DEPLOY_FIREBASE: return await ToolHandlersPart2.handleDeployFirebase();
        case OmniToolName.PROVISION_CLOUD_INFRASTRUCTURE: return await ToolHandlersPart2.handleProvisionCloud();
        
        case OmniToolName.LINT_APPLET: return await ToolHandlersPart2.handleLintApplet();
        case OmniToolName.COMPILE_APPLET: return await ToolHandlersPart2.handleCompileApplet();
        case OmniToolName.CAPTURE_AND_ANALYZE_UI: return await ToolHandlersPart2.handleCaptureUI(args.route);
        case OmniToolName.SIMULATE_USER_INTERACTION: return await ToolHandlersPart2.handleSimulateInteraction(args.route, args.actions);
        case OmniToolName.EXECUTE_HTTP_REQUEST: return await ToolHandlersPart2.handleExecuteHttpRequest(args.url, args.method, args.headers, args.body);
        case OmniToolName.ANALYZE_PERFORMANCE_METRICS: return await ToolHandlersPart2.handleAnalyzePerformance();
        case OmniToolName.RUN_SECURITY_PENETRATION: return await ToolHandlersPart2.handleRunSecurity();
        
        case OmniToolName.MANAGE_VERSION_CONTROL: return await ToolHandlersPart2.handleManageVersionControl(args.command);
        case OmniToolName.MANAGE_LONG_TERM_MEMORY: return await ToolHandlersPart2.handleManageLongTermMemory(args.memory);
        case OmniToolName.ANALYZE_USER_TELEMETRY: return await ToolHandlersPart2.handleAnalyzeTelemetry();
        case OmniToolName.GENERATE_MEDIA_ASSETS: return await ToolHandlersPart2.handleGenerateMedia(args.prompt);
        case OmniToolName.SPAWN_EPHEMERAL_THREAD: return await ToolHandlersPart2.handleSpawnEphemeralThread(args.task);
        case OmniToolName.RUN_MENTAL_SANDBOX: return await ToolHandlersPart2.handleRunMentalSandbox(args.code);
        case OmniToolName.RUN_CHAMS_CODE: return await ToolHandlersPart2.handleRunChamsCode(args.code);
        
        // Stubs for advanced tools (to be connected to real services)
        case OmniToolName.LOAD_CONTEXTUAL_TOOLKIT:
        case OmniToolName.FINISH_TASK:
        case OmniToolName.UPGRADE_ENGINE_CORE:
          return { success: true, output: `System handled ${name}` }; // Handled by Core Loop
          
        default:
          return { success: false, output: `Tool ${name} is not yet fully implemented in handlers.` };
      }
    } catch (e: any) {
      return { success: false, output: `Unexpected error executing tool ${name}: ${e.message}` };
    }
  }
}
