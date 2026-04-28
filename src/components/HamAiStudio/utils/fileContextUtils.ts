/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData } from '../types';
import { vfs } from '../../../services/vfsService';
import { lspService } from '../../../services/lspService';

// LRU Cache for File Context to prevent redundant reads
const fileContextCache = new Map<string, { mtime: number, content: string }>();

export const getFileContext = async (projectContext: ProjectData | null, relevantFiles?: string[]): Promise<string> => {
  if (!projectContext?.files) return '';
  
  // HAM ENGINE APEX V4.0 - HOLOGRAPHIC MEMORY COMPRESSION
  // Target: ~5000 tokens (approx 20,000 characters)
  const MAX_GLOBAL_CHARS = 20000; 
  const MAX_FILE_SIZE = 15000; // 15KB max per full file
  let currentChars = 0;
  let fileContents = '=== PROJECT HOLOGRAPHIC MAP ===\n<file_tree>\n';
  
  // 1. Build Compact File Tree (Extremely token efficient)
  const allFiles = projectContext.files.filter(f => !f.path.match(/\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|mp4|webm|wav|mp3|zip|tar|gz|wasm|jar|pdf|apk|exe|dll|so|class|bin|dat|db|sqlite|mkv|avi|mov|flv|wmv|m4a|flac|ogg|aac|wma|7z|rar|iso|dmg|pkg|deb|rpm|msi|cab|psd|ai|eps|indd|raw|heic|webp|tiff|bmp|obj|fbx|blend|stl|gltf|glb|doc|docx|xls|xlsx|ppt|pptx|epub|mobi)$/i));
  
  fileContents += allFiles.map(f => `- ${f.path}`).join('\n');
  fileContents += '\n</file_tree>\n\n=== FILE CONTENTS ===\n';
  currentChars = fileContents.length;

  const relevantSet = new Set(relevantFiles || []);

  for (const f of allFiles) {
      if (currentChars >= MAX_GLOBAL_CHARS) {
          fileContents += `\n[SYSTEM: Context limit reached. Use 'view_file' tool to explore other files.]\n`;
          break;
      }

      try {
          const stat = await vfs.stat(f.path) as any;
          if (stat && stat.size > 50000) continue; // Skip massive files entirely

          let content = '';
          const cached = fileContextCache.get(f.path);
          
          if (cached && cached.mtime === stat.mtimeMs) {
              content = cached.content;
          } else {
              const rawContent = await vfs.readFile(f.path);
              
              // HOLOGRAPHIC COMPRESSION: 
              // If file is NOT relevant (not currently open/focused), OR if it's too large, extract ONLY the skeleton.
              if (!relevantSet.has(f.path) || rawContent.length > MAX_FILE_SIZE) {
                  const lines = rawContent.split('\n');
                  const skeleton: string[] = [];
                  let braceDepth = 0;
                  let inString = false;
                  let stringChar = '';
                  let inMultilineComment = false;

                  for (let i = 0; i < lines.length; i++) {
                      const line = lines[i];
                      const trimmed = line.trim();

                      // Keep imports and simple exports
                      if (trimmed.startsWith('import ') || (trimmed.startsWith('export ') && !trimmed.includes('{'))) {
                          skeleton.push(line);
                          continue;
                      }

                      // Robust State-Machine Parser
                      let openBraces = 0;
                      let closeBraces = 0;
                      for (let j = 0; j < line.length; j++) {
                          const char = line[j];
                          const nextChar = line[j+1] || '';
                          const prevChar = j > 0 ? line[j-1] : '';

                          if (inMultilineComment) {
                              if (char === '*' && nextChar === '/') {
                                  inMultilineComment = false;
                                  j++; // skip '/'
                              }
                              continue;
                          }

                          if (!inString) {
                              if (char === '/' && nextChar === '*') {
                                  inMultilineComment = true;
                                  j++; // skip '*'
                                  continue;
                              }
                              if (char === '/' && nextChar === '/') {
                                  break; // Ignore rest of line (single-line comment)
                              }
                          }

                          if ((char === '"' || char === "'" || char === '\`') && prevChar !== '\\') {
                              if (!inString) { inString = true; stringChar = char; }
                              else if (stringChar === char) { inString = false; }
                          }

                          if (!inString && !inMultilineComment) {
                              if (char === '{') openBraces++;
                              if (char === '}') closeBraces++;
                          }
                      }

                      const isDeclaration = 
                          trimmed.startsWith('export ') ||
                          trimmed.startsWith('class ') ||
                          trimmed.startsWith('interface ') ||
                          trimmed.startsWith('type ') ||
                          trimmed.startsWith('function ') ||
                          trimmed.startsWith('const ') ||
                          trimmed.startsWith('let ');

                      // Keep top-level declarations and class method signatures (depth 1)
                      if ((braceDepth === 0 && isDeclaration) || (braceDepth === 1 && trimmed.match(/^(public|private|protected|async|get|set|\w+)\s*\(/))) {
                          if (openBraces > closeBraces) {
                              skeleton.push(line.substring(0, line.lastIndexOf('{') + 1) + ' ... }');
                          } else {
                              skeleton.push(line);
                          }
                      }

                      braceDepth += openBraces - closeBraces;
                      if (braceDepth < 0) braceDepth = 0;
                  }

                  content = `// [HOLOGRAPHIC SKELETON] (Internal logic hidden. Use 'view_file' to view full code)\n${skeleton.join('\n')}`;
              } else {
                  // Full content for relevant/active files
                  content = rawContent;
              }
              
              // Update Cache
              if (fileContextCache.size > 100) {
                  const firstKey = fileContextCache.keys().next().value;
                  if (firstKey) fileContextCache.delete(firstKey);
              }
              fileContextCache.set(f.path, { mtime: stat.mtimeMs, content });
          }

          const snippet = `<file path="${f.path}">\n${content}\n</file>\n`;
          if (currentChars + snippet.length <= MAX_GLOBAL_CHARS) {
              fileContents += snippet;
              currentChars += snippet.length;
          }
      } catch (e) {
          // Ignore missing files
      }
  }
  
  // Append Monaco LSP Diagnostics (Errors/Warnings) for Self-Healing
  const diagnostics = lspService.getDiagnostics();
  if (diagnostics && diagnostics.length > 0) {
      fileContents += `\n=== CURRENT LINTER ERRORS (SELF-HEALING REQUIRED) ===\n`;
      diagnostics.forEach((d: any) => {
          const severity = d.severity === 8 ? 'ERROR' : d.severity === 4 ? 'WARNING' : 'INFO';
          fileContents += `[${severity}] ${d.resource?.path || 'Unknown'}:${d.startLineNumber} - ${d.message}\n`;
      });
  }
  
  return fileContents;
};
