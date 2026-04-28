/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { vfs } from '../vfsService';
import { webcontainerService } from '../webcontainerService';
import type { ToolRegistry } from './ToolRegistry';

export function registerDefaultTools(registry: ToolRegistry) {
    // 11. Tool: Grep/Search
    registry.register({
      name: 'grep_search',
      description: 'Search for patterns in the codebase. Supports regex.',
      parameters: { pattern: 'string', path: 'string', isRegex: 'boolean (optional)' },
      execute: async (args) => {
        const pattern = args.pattern as string;
        const path = args.path as string;
        const isRegex = args.isRegex as boolean;
        const searchPath = registry.sanitizePath(path || '/');
        const results: { file: string, line: number, content: string }[] = [];

        let regex: RegExp;
        try {
            regex = isRegex ? new RegExp(pattern, 'g') : new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        } catch (e) {
            return { status: 'error', message: `Invalid regex pattern: ${pattern}` };
        }
        
        const searchRecursive = async (dir: string) => {
            try {
                const entries = await vfs.readdir(dir);
                for (const entry of entries) {
                    const fullPath = dir === '/' ? `/${entry}` : `${dir}/${entry}`;
                    const stats = await vfs.stat(fullPath) as any;
                    
                    if (stats.isDirectory()) {
                        if (entry !== 'node_modules' && entry !== '.git' && entry !== 'dist' && entry !== '.next') {
                            await searchRecursive(fullPath);
                        }
                    } else {
                        // Skip binary files
                        if (fullPath.match(/\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|mp4|webm|wav|mp3|zip|tar|gz|wasm|jar|pdf|apk|exe|dll|so|class|bin|dat|db|sqlite)$/i)) continue;
                        
                        try {
                            const content = await vfs.readFile(fullPath);
                            const lines = content.split('\n');
                            for (let i = 0; i < lines.length; i++) {
                                if (regex.test(lines[i])) {
                                    results.push({ file: fullPath, line: i + 1, content: lines[i].trim() });
                                    regex.lastIndex = 0; // Reset regex state
                                }
                            }
                        } catch (e) {
                            // Ignore read errors
                        }
                    }
                }
            } catch (e) {
                // Ignore dir read errors
            }
        };

        await searchRecursive(searchPath);
        
        if (results.length === 0) {
            return { status: 'success', message: 'No matches found.' };
        }
        
        // Limit results to prevent token overflow
        if (results.length > 100) {
            return { status: 'success', matches: results.slice(0, 100), message: `Found ${results.length} matches. Showing first 100.` };
        }
        
        return { status: 'success', matches: results };
      }
    });

    registry.register({
      name: 'view_file',
      description: 'View the contents of a file. You can specify startLine and endLine to view specific parts.',
      parameters: { path: 'string', startLine: 'number (optional)', endLine: 'number (optional)' },
      execute: async (args) => {
        const path = args.path as string;
        const safePath = registry.sanitizePath(path);
        try {
          const content = await vfs.readFile(safePath);
          const lines = content.split('\n');
          const start = args.startLine ? Math.max(1, Number(args.startLine)) : 1;
          const end = args.endLine ? Math.min(lines.length, Number(args.endLine)) : lines.length;
          const selectedLines = lines.slice(start - 1, end);
          const numberedLines = selectedLines.map((line, i) => `${start + i}: ${line}`).join('\n');
          return `File Path: \`${safePath}\`\nShowing lines ${start} to ${end}\nThe following code has been modified to include a line number before every line, in the format: <line_number>: <original_line>. Please note that any changes targeting the original code should remove the line number, colon, and leading space.\n${numberedLines}`;
        } catch (e) {
          return { status: 'error', message: `File ${safePath} not found or cannot be read.` };
        }
      }
    });

    registry.register({
      name: 'list_dir',
      description: 'List the contents of a directory',
      parameters: { path: 'string' },
      execute: async (args) => {
        const path = args.path as string;
        const safePath = registry.sanitizePath(path);
        try {
          const entries = await vfs.readdir(safePath);
          return { directory: safePath, contents: entries };
        } catch (e) {
          return { status: 'error', message: `Directory ${safePath} not found.` };
        }
      }
    });

    registry.register({
      name: 'get_project_snapshot',
      description: 'Get the current state of the project files',
      parameters: {},
      execute: async () => {
        const snapshot = await vfs.getProjectSnapshot();
        return snapshot;
      }
    });

    registry.register({
      name: 'create_file',
      description: 'Create a new file. Fails if file already exists.',
      parameters: { path: 'string', content: 'string' },
      execute: async (args) => {
        const path = args.path as string;
        const content = args.content as string;
        const safePath = registry.sanitizePath(path);
        try {
          await vfs.readFile(safePath);
          return { status: 'error', message: `File ${safePath} already exists. Use edit_file or write_file instead.` };
        } catch (e) {
          await vfs.writeFile(safePath, content);
          registry.syncToNative('write', safePath, content);
          return { status: 'success', path: safePath };
        }
      }
    });

    registry.register({
      name: 'edit_file',
      description: 'Edit an existing file by replacing exact targetContent with replacementContent. MUST read file first.',
      parameters: { path: 'string', targetContent: 'string', replacementContent: 'string' },
      execute: async (args) => {
        const path = args.path as string;
        const target = args.targetContent as string;
        const replacement = args.replacementContent as string;
        const safePath = registry.sanitizePath(path);
        try {
          const content = await vfs.readFile(safePath);
          const index = content.indexOf(target);
          if (index === -1) {
            return { status: 'error', message: `Target content not found in ${safePath}. Please read the file again to get the exact content (including whitespaces).` };
          }
          const lastIndex = content.lastIndexOf(target);
          if (index !== lastIndex) {
            return { status: 'error', message: `Target content is not unique in ${safePath}. Please provide a larger block of text to ensure uniqueness.` };
          }
          const newContent = content.substring(0, index) + replacement + content.substring(index + target.length);
          await vfs.writeFile(safePath, newContent);
          registry.syncToNative('write', safePath, newContent);
          return { status: 'success', path: safePath };
        } catch (e) {
          return { status: 'error', message: `File ${safePath} does not exist or cannot be read.` };
        }
      }
    });

    registry.register({
      name: 'write_file',
      description: 'Overwrite an entire file. Prefer edit_file for small changes.',
      parameters: { path: 'string', content: 'string' },
      execute: async (args) => {
        const path = args.path as string;
        const content = args.content as string;
        const safePath = registry.sanitizePath(path);
        await vfs.writeFile(safePath, content);
        registry.syncToNative('write', safePath, content);
        return { status: 'success', path: safePath };
      }
    });

    registry.register({
      name: 'multi_edit_file',
      description: 'Edit multiple non-contiguous chunks in a single file. Each chunk must specify TargetContent and ReplacementContent.',
      parameters: { path: 'string', edits: 'Array<{TargetContent: string, ReplacementContent: string}>' },
      execute: async (args) => {
        const path = args.path as string;
        const safePath = registry.sanitizePath(path);
        const edits = args.edits as {TargetContent: string, ReplacementContent: string}[];
        
        try {
          let content = await vfs.readFile(safePath);
          let successCount = 0;
          let errors: string[] = [];

          for (let i = 0; i < edits.length; i++) {
            const edit = edits[i];
            if (!content.includes(edit.TargetContent)) {
              errors.push(`Chunk ${i}: Target content not found in file.`);
              continue;
            }
            // Check for multiple occurrences
            const firstIndex = content.indexOf(edit.TargetContent);
            const lastIndex = content.lastIndexOf(edit.TargetContent);
            if (firstIndex !== lastIndex) {
              errors.push(`Chunk ${i}: Target content is not unique in the file.`);
              continue;
            }
            content = content.replace(edit.TargetContent, edit.ReplacementContent);
            successCount++;
          }

          if (errors.length > 0) {
            return { status: 'error', message: `Could not apply all edits. No changes were saved. Errors:\n${errors.join('\n')}` };
          }

          await vfs.writeFile(safePath, content);
          registry.syncToNative('write', safePath, content);
          return { status: 'success', message: `Successfully applied ${successCount} edits to ${safePath}` };
        } catch (e) {
          return { status: 'error', message: `File ${safePath} not found or cannot be read.` };
        }
      }
    });

    registry.register({
      name: 'shell_exec',
      description: 'Executes a shell command in the applet directory. Useful for grep or npx commands.',
      parameters: { command: 'string' },
      execute: async (args) => {
        const commandStr = args.command as string;
        try {
          const { shellService } = await import('../shellService');
          const result = await shellService.execute(commandStr);
          return { 
            status: result.isError ? 'error' : 'success', 
            output: result.output.trim() 
          };
        } catch (e: any) {
          return { status: 'error', message: `Failed to execute command: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });
















}
