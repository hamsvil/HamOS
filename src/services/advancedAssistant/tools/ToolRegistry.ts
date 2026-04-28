/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData } from '../../../components/HamAiStudio/types';
import { vfs } from '../../vfsService';
import { webcontainerService } from '../../webcontainerService';
import { NativeStorage } from '../../../plugins/NativeStorage';
import { nativeBridge } from '../../../utils/nativeBridge';
import { cleanCodeBlock } from '../../../utils/textUtils';
import { TaskQueue } from '../../../utils/taskQueue';
import { APP_CONFIG } from '../../../constants/config';
import { useProjectStore } from '../../../store/projectStore';
import { sanitizePath, flexibleReplace } from './toolUtils';

export interface ToolContext {
  project: ProjectData;
  [key: string]: any;
}

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, string>;
  execute: (params: Record<string, unknown>, context: ToolContext) => Promise<string>;
}

// 4. Tooling & Environment Control
// Provides controlled access to external tools and environment
export class ToolRegistry {
  private tools: Map<string, Tool> = new Map();
  private taskQueue: TaskQueue = new TaskQueue();
  private activeReads = 0;
  private maxConcurrentReads = 5;

  private async throttleRead<T>(operation: () => Promise<T>): Promise<T> {
      const startTime = Date.now();
      while (this.activeReads >= this.maxConcurrentReads) {
          if (Date.now() - startTime > 30000) {
              throw new Error('Timeout waiting for read capacity');
          }
          await new Promise(resolve => setTimeout(resolve, 50));
      }
      this.activeReads++;
      try {
          return await operation();
      } finally {
          this.activeReads--;
      }
  }

  constructor() {
    this.register({
      name: 'write_file',
      description: 'Write content to a file',
      parameters: { path: 'string', content: 'string' },
      execute: async ({ path, content }: { path: string, content: string }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            if (!path) {
                return `Error: Missing <path> parameter. Please specify the file path.`;
            }
            const safePath = sanitizePath(path);
            if (content === undefined || content.trim() === '') {
                return `Error: Content for ${safePath} is empty. Please provide the full code.`;
            }
            
            const cleanContent = cleanCodeBlock(content);

            const isSourceCode = /\.(ts|tsx|js|jsx|css|html|json|md|svg|txt)$/i.test(safePath);
            if (isSourceCode) {
                // Phase 7: Shadow Workspace - Write to shadow buffer instead of direct VFS
                useProjectStore.getState().setShadowBuffer(safePath, cleanContent);
                return `File ${safePath} proposed successfully. User will review the changes.`;
            } else {
                await vfs.writeFile(safePath, cleanContent);
                useProjectStore.getState().setShadowBuffer(safePath, null);
                return `File ${safePath} written directly to VFS.`;
            }
        });
      }
    });

    this.register({
      name: 'read_file',
      description: 'Read content from a file (optional line range)',
      parameters: { path: 'string', startLine: 'number (optional)', endLine: 'number (optional)' },
      execute: async ({ path, startLine, endLine }: { path: string, startLine?: number, endLine?: number }, context: ToolContext) => {
        return this.throttleRead(async () => {
            if (!path) return `Error: Missing <path> parameter.`;
            const safePath = sanitizePath(path);
            try {
              let content = useProjectStore.getState().shadowBuffers[safePath];
              if (content === null) {
                  return `Error: File ${safePath} not found (deleted in shadow buffer).`;
              }
              if (content === undefined) {
                  const stat = await vfs.stat(safePath) as any;
                  if (stat && stat.size > 150000 && startLine === undefined && endLine === undefined) {
                      return `Error: File ${safePath} is too large (${Math.round(stat.size/1024)}KB) to read entirely. Please specify startLine and endLine to read a specific chunk.`;
                  }
                  content = await vfs.readFile(safePath);
              }

              if (startLine !== undefined || endLine !== undefined) {
                  const lines = content.split('\n');
                  const start = startLine ? Math.max(0, startLine - 1) : 0;
                  const end = endLine ? Math.min(lines.length, endLine) : lines.length;
                  const chunk = lines.slice(start, end).join('\n');
                  
                  if (chunk.length > 100000) {
                      return `Error: Requested chunk is too large (${Math.round(chunk.length/1024)}KB). Please request a smaller range.`;
                  }
                  return chunk;
              }
              
              if (content.length > 100000) {
                  // Token Compression: return skeleton
                  const lines = content.split('\n');
                  const imports = lines.filter(l => l.startsWith('import ') || l.startsWith('export ')).join('\n');
                  const rest = lines.filter(l => !l.startsWith('import ') && !l.startsWith('export ')).join('\n');
                  return `${imports}\n\n// ... (File too large, internal logic omitted for brevity. Use startLine/endLine to read specific parts) ...\n\n${rest.substring(0, 20000)}...`;
              }
              
              return content;
            } catch (e: any) {
              const msg = e instanceof Error ? e.message : String(e);
              throw new Error(`Failed to read file ${safePath}: ${msg}`, { cause: e });
            }
        });
      }
    });

    this.register({
      name: 'run_command',
      description: 'Run a shell command (Sandboxed)',
      parameters: { command: 'string' },
      execute: async ({ command }: { command: string }, context: ToolContext) => {
        if (!command) return `Error: Missing <command> parameter.`;
        try {
            if (!window.crossOriginIsolated) {
                return `Command execution failed: Browser environment is not cross-origin isolated. WebContainer cannot boot.`;
            }
            // Basic command simulation for non-webcontainer environments or unsupported commands
            if (command.startsWith('docker')) return 'Error: Docker is not supported in this environment.';
            if (command.startsWith('sudo')) return 'Error: Root access is not permitted.';

            const process = await webcontainerService.spawn('jsh', ['-c', command]);
            let output = '';
            
            const streamPromise = process.output.pipeTo(new WritableStream({
                write(data) { output += data; }
            }));
            
            // Add timeout for long-running commands (e.g., dev servers)
            const timeoutPromise = new Promise<number>((_, reject) => {
                setTimeout(() => reject(new Error('Command execution timed out after 30 seconds. If this is a dev server, it is running in the background.')), 30000);
            });

            try {
                const exitCode = await Promise.race([process.exit, timeoutPromise]);
                await streamPromise; // Ensure we got all output
                
                if (exitCode !== 0) {
                    return `Command failed with exit code ${exitCode}.\nOutput:\n${output}`;
                }
                return `Command executed successfully.\nOutput:\n${output}`;
            } catch (timeoutErr: any) {
                // Return the output gathered so far if it timed out
                const msg = timeoutErr instanceof Error ? timeoutErr.message : String(timeoutErr);
                return `${msg}\nPartial Output:\n${output}`;
            }
        } catch (e: any) {
            if (e && e.message && e.message.includes('RPC::UNREACHABLE')) {
                return `WebContainer RPC error. The environment might be restarting or unstable. Please try again in a moment. Details: ${e.message}`;
            }
            const msg = e instanceof Error ? e.message : String(e);
            return `Failed to execute command: ${msg}`;
        }
      }
    });

    this.register({
      name: 'list_files',
      description: 'List files in a directory',
      parameters: { path: 'string' },
      execute: async ({ path }: { path: string }, context: ToolContext) => {
        try {
          const safePath = sanitizePath(path || '.');
          let entries: string[] = [];
          try {
              entries = await vfs.readdir(safePath);
          } catch (e) {
              // Directory might only exist in shadow buffer
          }
          
          const shadowBuffers = useProjectStore.getState().shadowBuffers;
          const shadowEntries = new Set<string>();
          
          for (const p of Object.keys(shadowBuffers)) {
              if (shadowBuffers[p] === null) continue;
              
              const dirPrefix = safePath === '/' ? '/' : safePath + '/';
              if (p.startsWith(dirPrefix)) {
                  const relativePath = p.substring(dirPrefix.length);
                  const parts = relativePath.split('/');
                  if (parts.length > 0 && parts[0]) {
                      shadowEntries.add(parts[0]);
                  }
              }
          }
          
          let allEntries = Array.from(new Set([...entries, ...Array.from(shadowEntries)]));
          
          allEntries = allEntries.filter(entry => {
              const fullPath = safePath === '/' ? `/${entry}` : `${safePath}/${entry}`;
              return shadowBuffers[fullPath] !== null;
          });
          
          return allEntries.join('\n');
        } catch (e: any) {
          const msg = e instanceof Error ? e.message : String(e);
          return `Failed to list files in ${path}: ${msg}`;
        }
      }
    });

    this.register({
      name: 'delete_file',
      description: 'Delete a file or directory',
      parameters: { path: 'string' },
      execute: async ({ path }: { path: string }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            if (!path) return `Error: Missing <path> parameter.`;
            const safePath = sanitizePath(path);
            try {
            useProjectStore.getState().setShadowBuffer(safePath, '__DELETED__');
            
            const shadowBuffers = useProjectStore.getState().shadowBuffers;
            const dirPrefix = safePath === '/' ? '/' : safePath + '/';
            for (const p of Object.keys(shadowBuffers)) {
                if (p.startsWith(dirPrefix)) {
                    useProjectStore.getState().setShadowBuffer(p, '__DELETED__');
                }
            }
            
            return `Deletion of ${safePath} proposed successfully. User will review the changes.`;
            } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            return `Failed to delete ${safePath}: ${msg}`;
            }
        });
      }
    });

    this.register({
      name: 'move_file',
      description: 'Move or rename a file or directory',
      parameters: { sourcePath: 'string', targetPath: 'string' },
      execute: async ({ sourcePath, targetPath }: { sourcePath: string, targetPath: string }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            if (!sourcePath || !targetPath) return `Error: Missing <sourcePath> or <targetPath> parameter.`;
            const safeSourcePath = sanitizePath(sourcePath);
            const safeTargetPath = sanitizePath(targetPath);
            try {
            const isDir = await vfs.stat(safeSourcePath).then((s: any) => s.isDirectory()).catch(() => false);
            
            if (isDir) {
                await vfs.renameFile(safeSourcePath, safeTargetPath);
                
                // Move shadow buffers
                const shadowBuffers = useProjectStore.getState().shadowBuffers;
                const dirPrefix = safeSourcePath === '/' ? '/' : safeSourcePath + '/';
                for (const p of Object.keys(shadowBuffers)) {
                    if (p.startsWith(dirPrefix) && shadowBuffers[p] !== null) {
                        const newPath = safeTargetPath + p.substring(safeSourcePath.length);
                        useProjectStore.getState().setShadowBuffer(newPath, shadowBuffers[p]);
                        useProjectStore.getState().setShadowBuffer(p, null);
                    }
                }
            } else {
                const shadowContent = useProjectStore.getState().shadowBuffers[safeSourcePath];
                if (shadowContent === null) {
                    return `Error: Source file ${safeSourcePath} not found (deleted in shadow buffer).`;
                }
                const content = shadowContent !== undefined ? shadowContent : await vfs.readFile(safeSourcePath);
                
                const isSourceCode = /\.(ts|tsx|js|jsx|css|html|json|md|svg|txt)$/i.test(safeTargetPath);
                if (isSourceCode) {
                    useProjectStore.getState().setShadowBuffer(safeTargetPath, content);
                    useProjectStore.getState().setShadowBuffer(safeSourcePath, '__DELETED__');
                } else {
                    await vfs.writeFile(safeTargetPath, content);
                    await vfs.deleteFile(safeSourcePath);
                    useProjectStore.getState().setShadowBuffer(safeSourcePath, null);
                }
            }
            
            return `Successfully moved ${safeSourcePath} to ${safeTargetPath}.`;
            } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            return `Failed to move ${safeSourcePath}: ${msg}`;
            }
        });
      }
    });

    this.register({
      name: 'mkdir',
      description: 'Create a new directory',
      parameters: { path: 'string' },
      execute: async ({ path }: { path: string }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            if (!path) return `Error: Missing <path> parameter.`;
            const safePath = sanitizePath(path);
            try {
            await vfs.mkdir(safePath);
            return `Successfully created directory ${safePath}.`;
            } catch (e: any) {
            const msg = e instanceof Error ? e.message : String(e);
            return `Failed to create directory ${safePath}: ${msg}`;
            }
        });
      }
    });

    this.register({
      name: 'edit_file',
      description: 'Replace a specific section of code in a file',
      parameters: { path: 'string', target: 'string', replacement: 'string' },
      execute: async ({ path, target, replacement }: { path: string, target: string, replacement: string }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            if (!path || !target || replacement === undefined) {
                return `Error: Missing <path>, <target>, or <replacement> parameter.`;
            }
            const safePath = sanitizePath(path);
            try {
                const shadowContent = useProjectStore.getState().shadowBuffers[safePath];
                if (shadowContent === null) {
                    return `Error: File ${safePath} not found (deleted in shadow buffer).`;
                }
                const currentContent = shadowContent !== undefined ? shadowContent : await vfs.readFile(safePath);
                
                const normalizedContent = currentContent.replace(/\r\n/g, '\n');
                const normalizedTarget = target.replace(/\r\n/g, '\n');
                const normalizedReplacement = replacement.replace(/\r\n/g, '\n');

                let newContent: string;
                try {
                    newContent = flexibleReplace(normalizedContent, normalizedTarget, normalizedReplacement);
                } catch (e: any) {
                    const strippedContent = normalizedContent.replace(/\s+/g, '');
                    const strippedTarget = normalizedTarget.replace(/\s+/g, '');
                    
                    if (strippedContent.includes(strippedTarget)) {
                        return `Error: Target content found but whitespace differs. Please provide the exact content from the file including whitespace.`;
                    }
                    
                    return `Error: Target content not found in ${safePath}. Please ensure the target matches exactly.`;
                }

                const isSourceCode = /\.(ts|tsx|js|jsx|css|html|json|md|svg|txt)$/i.test(safePath);
                if (isSourceCode) {
                    // Phase 7: Shadow Workspace - Write to shadow buffer
                    useProjectStore.getState().setShadowBuffer(safePath, newContent);
                    return `File ${safePath} proposed successfully. User will review the changes.`;
                } else {
                    await vfs.writeFile(safePath, newContent);
                    useProjectStore.getState().setShadowBuffer(safePath, null);
                    return `File ${safePath} edited directly in VFS.`;
                }
            } catch (e: any) {
                const msg = e instanceof Error ? e.message : String(e);
                return `Failed to edit ${safePath}: ${msg}`;
            }
        });
      }
    });

    this.register({
      name: 'multi_edit',
      description: 'Edit multiple files at once (Overwrite or Replace)',
      parameters: { edits: 'array of {path: string, content?: string, target?: string, replacement?: string}' },
      execute: async ({ edits }: { edits: {path: string, content?: string, target?: string, replacement?: string}[] }, context: ToolContext) => {
        return this.taskQueue.enqueue(async () => {
            const successfulEdits: { path: string, originalContent: string | null, originalShadowContent?: string | null, isSourceCode?: boolean }[] = [];
            try {
            const results = [];
            for (const edit of edits) {
                const safePath = sanitizePath(edit.path);
                let originalContent = null;
                const originalShadowContent = useProjectStore.getState().shadowBuffers[safePath];
                if (originalShadowContent === null) {
                    originalContent = null;
                } else {
                    try {
                      originalContent = originalShadowContent !== undefined ? originalShadowContent : await vfs.readFile(safePath);
                    } catch (e) {
                      // File doesn't exist yet
                    }
                }

                if (edit.content !== undefined) {
                    // Overwrite mode
                    const cleanContent = cleanCodeBlock(edit.content);
                    const isSourceCode = /\.(ts|tsx|js|jsx|css|html|json|md|svg|txt)$/i.test(safePath);
                    if (isSourceCode) {
                        useProjectStore.getState().setShadowBuffer(safePath, cleanContent);
                        results.push(`Proposed Overwrite for ${safePath}`);
                        successfulEdits.push({ path: safePath, originalContent, originalShadowContent, isSourceCode: true });
                    } else {
                        await vfs.writeFile(safePath, cleanContent);
                        useProjectStore.getState().setShadowBuffer(safePath, null);
                        results.push(`Overwrote ${safePath} directly in VFS`);
                        successfulEdits.push({ path: safePath, originalContent, originalShadowContent, isSourceCode: false });
                    }
                } else if (edit.target !== undefined && edit.replacement !== undefined) {
                    // Replace mode
                    if (originalContent === null) {
                        results.push(`Failed to edit ${safePath}: File not found`);
                        continue;
                    }
                    const normalizedContent = originalContent.replace(/\r\n/g, '\n');
                    const normalizedTarget = edit.target.replace(/\r\n/g, '\n');
                    const normalizedReplacement = edit.replacement.replace(/\r\n/g, '\n');
                    
                    let newContent: string | null = null;
                    try {
                        newContent = flexibleReplace(normalizedContent, normalizedTarget, normalizedReplacement);
                    } catch (e) {
                        newContent = null;
                    }
                    
                    if (newContent !== null) {
                        const isSourceCode = /\.(ts|tsx|js|jsx|css|html|json|md|svg|txt)$/i.test(safePath);
                        if (isSourceCode) {
                            useProjectStore.getState().setShadowBuffer(safePath, newContent);
                            results.push(`Proposed Edit for ${safePath}`);
                            successfulEdits.push({ path: safePath, originalContent, originalShadowContent, isSourceCode: true });
                        } else {
                            await vfs.writeFile(safePath, newContent);
                            useProjectStore.getState().setShadowBuffer(safePath, null);
                            results.push(`Edited ${safePath} directly in VFS`);
                            successfulEdits.push({ path: safePath, originalContent, originalShadowContent, isSourceCode: false });
                        }
                    } else {
                        results.push(`Failed to edit ${safePath}: Target not found`);
                    }
                } else {
                    results.push(`Skipped ${safePath}: Missing content or target/replacement`);
                }
            }
            return `Multi-edit proposals created:\n${results.join('\n')}`;
            } catch (e: any) {
                // Rollback mechanism
                for (const successfulEdit of successfulEdits.reverse()) {
                    try {
                        if (successfulEdit.isSourceCode) {
                            if (successfulEdit.originalShadowContent !== null && successfulEdit.originalShadowContent !== undefined) {
                                useProjectStore.getState().setShadowBuffer(successfulEdit.path, successfulEdit.originalShadowContent);
                            } else {
                                useProjectStore.getState().setShadowBuffer(successfulEdit.path, null);
                            }
                        } else {
                            if (successfulEdit.originalContent !== null) {
                                await vfs.writeFile(successfulEdit.path, successfulEdit.originalContent);
                            } else {
                                await vfs.deleteFile(successfulEdit.path);
                            }
                        }
                    } catch (rollbackError) {
                        console.error(`Rollback failed for ${successfulEdit.path}:`, rollbackError);
                    }
                }
                const msg = e instanceof Error ? e.message : String(e);
                return `Failed to apply multi_edit and rolled back. Error: ${msg}`;
            }
        });
      }
    });
  }

  public register(tool: Tool): void {
    this.tools.set((tool as any).name, tool);
  }

  // Plugin system for extensibility
  public registerPlugin(plugin: { tools: Tool[] }): void {
      plugin.tools.forEach(tool => this.register(tool));
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public listTools(): string[] {
    return Array.from(this.tools.keys());
  }
}
