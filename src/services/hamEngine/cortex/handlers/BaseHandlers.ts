/* eslint-disable no-useless-assignment */
import { ToolExecutionResult } from '../types';
import { vfs } from '../../../vfsService';
import { shadowVFS } from '../../kernel/ShadowVFS';
import { shellService } from '../../../shellService';
import { safeStorage } from '../../../../utils/storage';

export class BaseHandlers {
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

  static async handleLoadContextualToolkit(toolkitName: string): Promise<ToolExecutionResult> {
    safeStorage.setItem('ham_ai_toolkit', toolkitName);
    return { success: true, output: `Toolkit switched to ${toolkitName}.` };
  }

  static async handleFinishTask(summary: string): Promise<ToolExecutionResult> {
    return { success: true, output: `Task finished: ${summary}` };
  }
}
