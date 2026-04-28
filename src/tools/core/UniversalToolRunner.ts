
  import { logger } from '../../server/logger';
  import { registry } from '../registry/UnifiedToolRegistry';

  /**
   * Universal Tool Runner to execute tools across the codebase.
   * Standardized replacement for various toolExecutor implementations.
   */
  export class UniversalToolRunner {
    /**
     * Runs a tool by name with provided arguments.
     * @param name Tool name
     * @param args Tool arguments
     * @param context Execution context
     * @returns Tool execution result
     */
    static async run(name: string, args: Record<string, any>, context?: any): Promise<any> {
      try {
        return await registry.executeTool(name, args, context);
      } catch (error: any) {
        logger.error({ toolName: name, error: error.message }, 'UniversalToolRunner execution error');
        return {
          success: false,
          output: `Execution error: ${error.message}`
        };
      }
    }
  }
  