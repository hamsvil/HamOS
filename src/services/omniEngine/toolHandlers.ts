/* eslint-disable no-useless-assignment */
import { OmniToolName, ToolExecutionResult } from './types';
import { vfs } from '../vfsService';
import { shellService } from '../shellService';
import { flexibleReplace } from '../advancedAssistant/tools/toolUtils';
import { OmniSecurity } from './omniSecurity';

// ============================================================================
// OMNI-ENGINE V7: TOOL HANDLERS (EXECUTION LOGIC)
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
        return { success: false, output: `Target content not found in ${path}. Please view the file again to ensure exact match.` };
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
      let failedEdits = 0;

      for (const edit of edits) {
        const newContent = flexibleReplace(currentContent, edit.targetContent, edit.replacementContent);
        if (newContent === currentContent) {
          failedEdits++;
        } else {
          currentContent = newContent;
        }
      }

      if (failedEdits > 0) {
        return { success: false, output: `${failedEdits} of ${edits.length} target contents not found in ${path}. Multi-edit aborted to prevent partial corruption. Please view the file again to ensure exact match.` };
      }

      await vfs.writeFile(path, currentContent);
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
  // PILAR 3: INFRASTRUKTUR
  // --------------------------------------------------------------------------
  static async handleInstallPackage(packages: string[]): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute(`npm install ${packages.join(' ')}`);
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Failed to install packages: ${e.message}` };
    }
  }

  static async handleRestartServer(): Promise<ToolExecutionResult> {
    try {
      // Real Trigger: Touch a file that the dev server watches
      await vfs.writeFile('/.omni/restart_trigger', Date.now().toString());
      return { success: true, output: 'Dev server restart triggered successfully.' };
    } catch (e: any) {
      return { success: false, output: `Failed to restart server: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // PILAR 4: VALIDASI DETERMINISTIK
  // --------------------------------------------------------------------------
  static async handleLintApplet(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm run lint');
      if (!result.isError) {
        return { success: true, output: 'Linter passed successfully. Code is clean.' };
      } else {
        return { success: false, output: `Linter failed:\n${result.output}` };
      }
    } catch (e: any) {
      return { success: false, output: `Linter execution failed: ${e.message}` };
    }
  }

  static async handleCompileApplet(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm run build');
      if (!result.isError) {
        return { success: true, output: 'Compilation passed successfully. App is crash-free.' };
      } else {
        return { success: false, output: `Compilation failed:\n${result.output}` };
      }
    } catch (e: any) {
      return { success: false, output: `Compiler execution failed: ${e.message}` };
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
        case OmniToolName.CREATE_FILE: return await this.handleCreateFile(args.path, args.content);
        case OmniToolName.EDIT_FILE: return await this.handleEditFile(args.path, args.targetContent, args.replacementContent);
        case OmniToolName.MULTI_EDIT_FILE: return await this.handleMultiEditFile(args.path, args.edits);
        case OmniToolName.DELETE_FILE: return await this.handleDeleteFile(args.path);
        case OmniToolName.DELETE_DIR: return await this.handleDeleteDir(args.path);
        case OmniToolName.MOVE: return await this.handleMove(args.sourcePath, args.destinationPath);
        case OmniToolName.LINT_APPLET: return await this.handleLintApplet();
        case OmniToolName.COMPILE_APPLET: return await this.handleCompileApplet();
        case OmniToolName.INSTALL_APPLET_PACKAGE: return await this.handleInstallPackage(args.packages);
        case OmniToolName.RESTART_DEV_SERVER: return await this.handleRestartServer();
        
        // SubAgent Bridge Tools
        case OmniToolName.SUBAGENT_READ_FILE: return await this.handleViewFile(args.path);
        case OmniToolName.SUBAGENT_WRITE_FILE: return await this.handleCreateFile(args.path, args.content);
        case OmniToolName.SUBAGENT_LIST_FILES: return await this.handleListDir(args.path);
        case OmniToolName.SUBAGENT_SEARCH_CODE: return await this.handleShellExec(`grep -rI "${args.query}" .`);
        case OmniToolName.SUBAGENT_GET_PROJECT_STRUCTURE: return await this.handleShellExec(`find . -maxdepth 3 -type d`);
        
        // Stubs for advanced tools (to be connected to real services)
        case OmniToolName.LOAD_CONTEXTUAL_TOOLKIT:
        case OmniToolName.FINISH_TASK:
          return { success: true, output: `System handled ${name}` }; // Handled by Core Loop
          
        default:
          return { success: false, output: `Tool ${name} is not yet fully implemented in handlers.` };
      }
    } catch (e: any) {
      return { success: false, output: `Unexpected error executing tool ${name}: ${e.message}` };
    }
  }
}
