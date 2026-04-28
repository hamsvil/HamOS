/* eslint-disable no-useless-assignment */
/* eslint-disable no-case-declarations */
import { HamToolName } from './hamEngine/cortex/types';
import { OmniToolName } from './omniEngine/cortex/types';
import { ToolHandlers as HamHandlers } from './hamEngine/cortex/toolHandlers';
import { ToolHandlersPart2 as HamHandlersPart2 } from './hamEngine/cortex/toolHandlersPart2';
import { ToolHandlers as OmniHandlers } from './omniEngine/cortex/toolHandlers';

// Universal Tool Core: A single source of truth for all tool executions across all engines.
export class UniversalToolCore {
  static async execute(toolName: string, args: any): Promise<unknown> {
    // 1. Try HamEngine Handlers (The most comprehensive set)
    if (Object.values(HamToolName).includes(toolName as HamToolName)) {
      try {
        // We use HamHandlers which internally delegates to Part2 if needed
        return await HamHandlers.executeTool(toolName as HamToolName, args);
      } catch (e: any) {
        // If it's a missing handler error, we can fallback, otherwise throw
        if (!e.message?.includes('not implemented')) {
          throw e;
        }
      }
    }

    // 2. Try OmniEngine Handlers
    if (Object.values(OmniToolName).includes(toolName as OmniToolName)) {
      try {
        return await OmniHandlers.executeTool(toolName as OmniToolName, args);
      } catch (e: any) {
        if (!e.message?.includes('not implemented')) {
          throw e;
        }
      }
    }

    // 3. SuperAssistant / AdvancedAssistant Fallbacks
    // For tools like 'write_file' which might map to CREATE_FILE or EDIT_FILE
    switch (toolName) {
      case 'write_file':
      case 'create_file':
        return await HamHandlers.executeTool(HamToolName.CREATE_FILE, { path: args.path, content: args.content || args.data });
      case 'read_file':
      case 'view_file':
        return await HamHandlers.executeTool(HamToolName.VIEW_FILE, { path: args.path });
      case 'run_command':
      case 'shell_exec':
        return await HamHandlers.executeTool(HamToolName.SHELL_EXEC, { command: args.command, serverSide: args.serverSide });
      case 'list_files':
      case 'list_dir':
        return await HamHandlers.executeTool(HamToolName.LIST_DIR, { path: args.path || args.dir });
      case 'delete_file':
        return await HamHandlers.executeTool(HamToolName.DELETE_FILE, { path: args.path });
      case 'move_file':
      case 'move':
        return await HamHandlers.executeTool(HamToolName.MOVE, { sourcePath: args.sourcePath || args.source, destinationPath: args.destinationPath || args.destination });
      case 'mkdir':
        // HamEngine doesn't have a direct mkdir tool exposed to AI, but we can simulate it or add it
        const { vfs } = await import('./vfsService');
        await vfs.mkdir(args.path);
        return { success: true, message: `Directory created: ${args.path}` };
      case 'edit_file':
        return await HamHandlers.executeTool(HamToolName.EDIT_FILE, { path: args.path, targetContent: args.targetContent, replacementContent: args.replacementContent });
      case 'multi_edit':
      case 'multi_edit_file':
        return await HamHandlers.executeTool(HamToolName.MULTI_EDIT_FILE, { path: args.path, edits: args.edits || args.chunks });
      case 'grep_search':
        return await HamHandlers.executeTool(HamToolName.SHELL_EXEC, { command: `grep -rn "${args.query}" ${args.path || '.'}` });
      case 'get_project_snapshot':
        const { vfs: vfsSnapshot } = await import('./vfsService');
        const snapshot = await vfsSnapshot.getProjectSnapshot();
        return { success: true, snapshot };
      case 'install_applet_dependencies':
        return await HamHandlersPart2.handleInstallDependencies();
      case 'install_applet_package':
        return await HamHandlersPart2.handleInstallPackage(args.packages || [args.package]);
      case 'compile_applet':
        return await HamHandlersPart2.handleCompileApplet();
      case 'lint_applet':
        return await HamHandlersPart2.handleLintApplet();
      case 'read_url_content':
        return await HamHandlers.executeTool(HamToolName.READ_URL_CONTENT, { url: args.url });
      case 'view_content_chunk':
        return await HamHandlers.executeTool(HamToolName.VIEW_CONTENT_CHUNK, { document_id: args.document_id, position: args.position });
    }

    throw new Error(`UniversalToolCore: Tool '${toolName}' is not recognized or implemented.`);
  }
}
