/* eslint-disable no-useless-assignment */
import { vfs } from '../vfsService';
import { NativeStorage } from '../../plugins/NativeStorage';
import { nativeBridge } from '../../utils/nativeBridge';
import { webcontainerService } from '../webcontainerService';
import { registerDefaultTools } from './ToolRegistryHelpers';
import { registerAdvancedTools } from './ToolRegistryHelpersPart2';
import { PathSanitizer } from '../../utils/PathSanitizer';

export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  execute: (args: Record<string, unknown>) => Promise<unknown>;
}

export class ToolRegistry {
  private static instance: ToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {
    registerDefaultTools(this);
    registerAdvancedTools(this);
  }

  public static getInstance(): ToolRegistry {
    if (!ToolRegistry.instance) {
      ToolRegistry.instance = new ToolRegistry();
    }
    return ToolRegistry.instance;
  }

  private currentProject: Record<string, unknown> | null = null;

  public setProjectContext(project: Record<string, unknown> | null) {
    this.currentProject = project;
  }

  public async syncToNative(operation: 'write' | 'delete' | 'mkdir', path: string, content?: string) {
      if (!nativeBridge.isAvailable() || !this.currentProject) return;
      try {
          const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
          const projectName = (this.currentProject.name as string) || 'default';
          const projectRoot = `${dataDir}/projects/${projectName}`;
          const fullPath = `${projectRoot}/${path.startsWith('/') ? path.substring(1) : path}`;
          
          if (operation === 'write' && content !== undefined) {
              await NativeStorage.writeFile({ path: fullPath, data: content, encoding: 'utf8' });
          } else if (operation === 'delete') {
              await NativeStorage.deleteFile({ path: fullPath });
          } else if (operation === 'mkdir') {
              await NativeStorage.mkdir({ path: fullPath });
          }
      } catch (e) {
          // Sync error
      }
  }

  public sanitizePath(inputPath: string): string {
    return PathSanitizer.sanitize(inputPath);
  }

  public register(tool: Tool) {
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const { UniversalToolRunner } = await import('../../tools/core/UniversalToolRunner');
    return await UniversalToolRunner.run(name, args);
  }
}

