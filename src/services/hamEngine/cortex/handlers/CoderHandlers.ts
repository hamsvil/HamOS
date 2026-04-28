/* eslint-disable no-useless-assignment */
import { ToolExecutionResult } from '../types';
import { vfs } from '../../../vfsService';
import { shadowVFS } from '../../kernel/ShadowVFS';

export class CoderHandlers {
  static async handleCreateFile(path: string, content: string): Promise<ToolExecutionResult> {
    try {
      await shadowVFS.write(path, content);
      return { success: true, output: `File created successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: `Failed to create file: ${e.message}` };
    }
  }

  static async handleEditFile(path: string, targetContent: string, replacementContent: string): Promise<ToolExecutionResult> {
    try {
      let content = await this.readContent(path);
      content = this.flexibleReplace(content, targetContent, replacementContent, path);
      await shadowVFS.write(path, content);
      return { success: true, output: `File edited successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }

  static async handleMultiEditFile(path: string, edits: { targetContent: string, replacementContent: string }[]): Promise<ToolExecutionResult> {
    try {
      let content = await this.readContent(path);
      for (const edit of edits) {
        content = this.flexibleReplace(content, edit.targetContent, edit.replacementContent, path);
      }
      await shadowVFS.write(path, content);
      return { success: true, output: `File edited successfully at ${path}` };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }

  private static async readContent(path: string): Promise<string> {
    try {
      return await shadowVFS.read(path);
    } catch {
      return await vfs.readFile(path);
    }
  }

  private static flexibleReplace(content: string, target: string, replacement: string, path: string): string {
    const escapedTarget = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regexStr = escapedTarget.replace(/\s+/g, '\\s+');
    const regex = new RegExp(regexStr);
    
    const match = content.match(regex);
    if (match) {
      return content.substring(0, match.index) + replacement + content.substring(match.index! + match[0].length);
    }
    throw new Error(`Target content not found in ${path}`);
  }

  static async handleDeleteFile(path: string): Promise<ToolExecutionResult> {
    try {
      await shadowVFS.write(path, '');
      try { await vfs.deleteFile(path); } catch {}
      return { success: true, output: `File deleted: ${path}` };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }

  static async handleMove(sourcePath: string, destinationPath: string): Promise<ToolExecutionResult> {
    try {
      const content = await this.readContent(sourcePath);
      await shadowVFS.write(destinationPath, content);
      await shadowVFS.write(sourcePath, '');
      try { await vfs.deleteFile(sourcePath); } catch {}
      return { success: true, output: `Moved ${sourcePath} to ${destinationPath}` };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }

  static async handleCheckSyntax(path: string): Promise<ToolExecutionResult> {
    try {
      const content = await this.readContent(path);
      const ts = await import('typescript');
      const sourceFile = ts.createSourceFile(path, content, ts.ScriptTarget.Latest, true);
      const diagnostics = (sourceFile as any).parseDiagnostics || [];

      if (diagnostics.length === 0) return { success: true, output: `Syntax check passed for ${path}.` };

      const errors = diagnostics.map((d: any) => {
        const { line, character } = ts.getLineAndCharacterOfPosition(sourceFile, d.start!);
        return `${path} (${line + 1},${character + 1}): ${ts.flattenDiagnosticMessageText(d.messageText, "\n")}`;
      });

      return { success: false, output: `Syntax errors in ${path}:\n${errors.join('\n')}` };
    } catch (e: any) {
      return { success: false, output: e.message };
    }
  }
}
