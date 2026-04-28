/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { webcontainerService } from '../webcontainerService';
import type { ToolRegistry } from './ToolRegistry';

const urlContentCache = new Map<string, string>();

export function registerAdvancedTools(registry: ToolRegistry) {
    // 11.5 Tool: Install Applet Dependencies
    registry.register({
      name: 'install_applet_dependencies',
      description: 'Install all dependencies from package.json. This runs npm install to populate the node_modules directory.',
      parameters: {},
      execute: async () => {
        try {
          const process = await webcontainerService.spawn('npm', ['install']);
          let output = '';
          const reader = process.output.getReader();
          
          const readPromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) output += value;
              if (output.length > 50000) {
                output = output.substring(0, 50000) + '\n...[TRUNCATED]';
                reader.cancel();
                break;
              }
            }
          })();
          
          const exitCode = await Promise.race([
            process.exit,
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000))
          ]).catch((err) => {
            process.kill();
            if (err.message === 'Timeout') {
                output += '\n\n[Process killed due to timeout (120s)]';
            } else {
                output += `\n\n[Process error: ${err.message}]`;
            }
            return -1;
          });
          
          await readPromise.catch(() => {});
          
          if (exitCode === 0) {
            return { status: 'success', message: 'Dependencies installed successfully.' };
          } else {
            return { status: 'error', message: `Install failed with exit code ${exitCode}`, output: output.substring(output.length - 1000) };
          }
        } catch (e: any) {
          if (e && e.message && e.message.includes('RPC::UNREACHABLE')) {
              return { status: 'error', message: `WebContainer RPC error. The environment might be restarting or unstable. Please try again in a moment. Details: ${e.message}` };
          }
          return { status: 'error', message: `Failed to install dependencies: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });

    registry.register({
      name: 'install_applet_package',
      description: 'Install npm packages to the applet.',
      parameters: { PackageNames: 'Array<string>', IsDevDependency: 'boolean (optional)' },
      execute: async (args) => {
        const packages = args.PackageNames as string[];
        const isDev = args.IsDevDependency as boolean;
        if (!packages || packages.length === 0) return { status: 'error', message: 'No packages specified' };
        
        try {
          const cmdArgs = ['install', ...packages];
          if (isDev) cmdArgs.push('-D');
          
          const process = await webcontainerService.spawn('npm', cmdArgs);
          let output = '';
          const reader = process.output.getReader();
          
          const readPromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) output += value;
              if (output.length > 50000) {
                output = output.substring(0, 50000) + '\n...[TRUNCATED]';
                reader.cancel();
                break;
              }
            }
          })();
          
          const exitCode = await Promise.race([
            process.exit,
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 120000))
          ]).catch((err) => {
            process.kill();
            if (err.message === 'Timeout') {
                output += '\n\n[Process killed due to timeout (120s)]';
            } else {
                output += `\n\n[Process error: ${err.message}]`;
            }
            return -1;
          });
          
          await readPromise.catch(() => {});
          
          return { status: exitCode === 0 ? 'success' : 'error', exitCode, output: output.substring(output.length - 1000) };
        } catch (e: any) {
          if (e && e.message && e.message.includes('RPC::UNREACHABLE')) {
              return { status: 'error', message: `WebContainer RPC error. The environment might be restarting or unstable. Please try again in a moment. Details: ${e.message}` };
          }
          return { status: 'error', message: `Failed to install packages: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });

    // 13. Tool: Compile Applet
    registry.register({
      name: 'compile_applet',
      description: 'Checks if the AI Studio applet builds successfully by running npm run build.',
      parameters: {},
      execute: async () => {
        try {
          const process = await webcontainerService.spawn('npm', ['run', 'build']);
          let output = '';
          const reader = process.output.getReader();
          
          const readPromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) output += value;
              if (output.length > 10000) {
                output = output.substring(0, 10000) + '\n...[TRUNCATED]';
                reader.cancel();
                break;
              }
            }
          })();
          
          const exitCode = await Promise.race([
            process.exit,
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
          ]).catch((err) => {
            process.kill();
            if (err.message === 'Timeout') {
                output += '\n\n[Process killed due to timeout (60s)]';
            } else {
                output += `\n\n[Process error: ${err.message}]`;
            }
            return -1;
          });
          
          await readPromise.catch(() => {});
          
          if (exitCode === 0) {
            return { status: 'success', message: 'Build completed successfully.' };
          } else {
            return { status: 'error', message: `Build failed with exit code ${exitCode}`, output: output.trim() };
          }
        } catch (e: any) {
          if (e && e.message && e.message.includes('RPC::UNREACHABLE')) {
              return { status: 'error', message: `WebContainer RPC error. The environment might be restarting or unstable. Please try again in a moment. Details: ${e.message}` };
          }
          return { status: 'error', message: `Failed to execute build: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });

    // 14. Tool: Lint Applet
    registry.register({
      name: 'lint_applet',
      description: 'Validates the codebase for syntax errors, missing imports, and other fatal issues by running npm run lint.',
      parameters: {},
      execute: async () => {
        try {
          const process = await webcontainerService.spawn('npm', ['run', 'lint']);
          let output = '';
          const reader = process.output.getReader();
          
          const readPromise = (async () => {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) output += value;
              if (output.length > 10000) {
                output = output.substring(0, 10000) + '\n...[TRUNCATED]';
                reader.cancel();
                break;
              }
            }
          })();
          
          const exitCode = await Promise.race([
            process.exit,
            new Promise<number>((_, reject) => setTimeout(() => reject(new Error('Timeout')), 60000))
          ]).catch((err) => {
            process.kill();
            if (err.message === 'Timeout') {
                output += '\n\n[Process killed due to timeout (60s)]';
            } else {
                output += `\n\n[Process error: ${err.message}]`;
            }
            return -1;
          });
          
          await readPromise.catch(() => {});
          
          if (exitCode === 0) {
            return { status: 'success', message: 'Linting completed successfully. No errors found.' };
          } else {
            return { status: 'error', message: `Linter found issues (exit code ${exitCode})`, output: output.trim() };
          }
        } catch (e: any) {
          if (e && e.message && e.message.includes('RPC::UNREACHABLE')) {
              return { status: 'error', message: `WebContainer RPC error. The environment might be restarting or unstable. Please try again in a moment. Details: ${e.message}` };
          }
          return { status: 'error', message: `Failed to execute linter: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });

    // 14.6 Tool: Read URL Content
    registry.register({
      name: 'read_url_content',
      description: 'Fetch content from a URL via HTTP request. Converts HTML to markdown.',
      parameters: { Url: 'string' },
      execute: async (args) => {
        try {
          const url = args.Url as string;
          let text = '';
          
          try {
            // Attempt to use WebContainer to bypass CORS
            const code = `
              fetch(process.argv[1])
                .then(r => {
                  if (!r.ok) { console.error('HTTP_ERROR:' + r.status); process.exit(1); }
                  return r.text();
                })
                .then(t => console.log(t))
                .catch(e => { console.error(e.message); process.exit(1); });
            `;
            const process = await webcontainerService.spawn('node', ['-e', code, url]);
            const reader = process.output.getReader();
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              if (value) text += value;
              if (text.length > 500000) { reader.cancel(); break; } // 500KB limit
            }
            
            const exitCode = await process.exit.catch(() => -1);
            if (exitCode !== 0) throw new Error(text.trim() || 'WebContainer fetch failed');
          } catch (wcError) {
            // Fallback to direct fetch if WebContainer fails or is unavailable
            console.warn('[ToolRegistry] WebContainer fetch failed, falling back to direct fetch:', wcError);
            const response = await fetch(url);
            if (!response.ok) {
              return { status: 'error', message: `HTTP error! status: ${response.status}` };
            }
            text = await response.text();
          }

          // Very basic HTML to text conversion for simplicity
          const markdown = text.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
                               .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
                               .replace(/<[^>]+>/g, ' ')
                               .replace(/\s+/g, ' ')
                               .trim();
          
          const documentId = btoa(url).substring(0, 16);
          urlContentCache.set(documentId, markdown);
          
          if (markdown.length > 5000) {
            return { 
              status: 'success', 
              content: markdown.substring(0, 5000) + `\n...[TRUNCATED. Use view_content_chunk with document_id: "${documentId}" and position: 5000 to see more]` 
            };
          }
          return { status: 'success', content: markdown };
        } catch (e) {
          return { status: 'error', message: `Failed to read URL: ${e instanceof Error ? e.message : String(e)}` };
        }
      }
    });

    // 14.7 Tool: View Content Chunk
    registry.register({
      name: 'view_content_chunk',
      description: 'View a specific chunk of document content using its DocumentId and chunk position.',
      parameters: { document_id: 'string', position: 'number' },
      execute: async (args) => {
        const docId = args.document_id as string;
        const pos = args.position as number;
        
        if (!urlContentCache.has(docId)) {
          return { status: 'error', message: `Document ID ${docId} not found. Please read the URL first.` };
        }
        
        const fullContent = urlContentCache.get(docId)!;
        if (pos >= fullContent.length) {
          return { status: 'error', message: `Position ${pos} is beyond the end of the document (length: ${fullContent.length}).` };
        }
        
        const chunk = fullContent.substring(pos, pos + 5000);
        const nextPos = pos + 5000;
        
        let result = chunk;
        if (nextPos < fullContent.length) {
          result += `\n...[TRUNCATED. Use view_content_chunk with document_id: "${docId}" and position: ${nextPos} to see more]`;
        }
        
        return { status: 'success', content: result };
      }
    });
}
