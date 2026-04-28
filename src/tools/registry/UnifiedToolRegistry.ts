import { logger } from '../../server/logger';
import { vfs } from '../../services/vfsService';

/**
 * Unified Tool Registry for HAM AI Studio.
 * Consolidation of super-assistant, advancedAssistant, and omniEngine registries.
 */
export interface Tool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: Record<string, any>, context?: any) => Promise<any>;
}

export class UnifiedToolRegistry {
  private static instance: UnifiedToolRegistry;
  private tools: Map<string, Tool> = new Map();

  private constructor() {
    this.initializeDefaultTools();
  }

  private async initializeDefaultTools() {
    try {
      // Lazy load to avoid circular deps
      const { registerDefaultTools } = await import('../../services/super-assistant/ToolRegistryHelpers');
      const { registerAdvancedTools } = await import('../../services/super-assistant/ToolRegistryHelpersPart2');
      
      // Adaptation layer
      const adapter = {
        register: (tool: any) => this.register(tool),
        sanitizePath: (p: string) => p,
        syncToNative: () => {}
      };
      
      registerDefaultTools(adapter as any);
      registerAdvancedTools(adapter as any);
    } catch (error) {
      logger.error({ error }, 'Failed to initialize default tools in UnifiedToolRegistry');
    }
  }

  public static getInstance(): UnifiedToolRegistry {
    if (!UnifiedToolRegistry.instance) {
      UnifiedToolRegistry.instance = new UnifiedToolRegistry();
    }
    return UnifiedToolRegistry.instance;
  }

  public register(tool: Tool) {
    logger.info({ toolName: tool.name }, 'Registering tool');
    this.tools.set(tool.name, tool);
  }

  public getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  public getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  public async executeTool(name: string, args: Record<string, any>, context?: any): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      logger.error({ toolName: name }, 'Tool not found');
      throw new Error(`Tool ${name} not found in UnifiedToolRegistry`);
    }

    try {
      logger.info({ toolName: name, args }, 'Executing tool');
      const result = await tool.execute(args, context);
      return result;
    } catch (error: any) {
      logger.error({ toolName: name, error: error.message }, 'Tool execution failed');
      throw error;
    }
  }
}

export const registry = UnifiedToolRegistry.getInstance();
