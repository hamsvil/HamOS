/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { healAndParseJSON } from './jsonHealer';

interface ParsedResponse {
  thoughts: string[];
  actions: { name: string; parameters: Record<string, any> }[];
  raw: string;
}

export class XmlParser {
  private buffer = '';
  private currentTag: string | null = null;
  private currentContent = '';
  private thoughts: string[] = [];
  private actions: any[] = [];

  constructor() {}

  public parse(chunk: string): ParsedResponse {
    this.buffer += chunk;
    this.processBuffer();
    return {
      thoughts: this.thoughts,
      actions: this.actions,
      raw: this.buffer,
    };
  }

  private processBuffer() {
    let index = 0;
    while (index < this.buffer.length) {
      if (this.currentTag) {
        const closeTag = `</${this.currentTag}>`;
        const closeIndex = this.buffer.indexOf(closeTag, index);
        if (closeIndex !== -1) {
          const content = this.buffer.substring(index, closeIndex);
          this.currentContent += content;
          this.handleTagComplete(this.currentTag, this.currentContent);
          this.currentTag = null;
          this.currentContent = '';
          index = closeIndex + closeTag.length;
        } else {
          this.currentContent += this.buffer.substring(index);
          index = this.buffer.length; // Wait for more chunks
        }
      } else {
        const openTagStart = this.buffer.indexOf('<', index);
        if (openTagStart !== -1) {
          const openTagEnd = this.buffer.indexOf('>', openTagStart);
          if (openTagEnd !== -1) {
            const tagName = this.buffer.substring(openTagStart + 1, openTagEnd);
            if (['thought', 'action'].includes(tagName)) {
              this.currentTag = tagName;
              index = openTagEnd + 1;
            } else {
              index = openTagEnd + 1; // Skip unknown tag
            }
          } else {
            index = this.buffer.length; // Wait for more chunks
          }
        } else {
          index = this.buffer.length; // Wait for more chunks
        }
      }
    }
  }

  private handleTagComplete(tag: string, content: string) {
    if (tag === 'thought') {
      this.thoughts.push(content);
    } else if (tag === 'action') {
      try {
        this.actions.push({ name: 'unknown', parameters: { content } });
      } catch (e) {
        console.error('Failed to parse action in stream', e);
      }
    }
  }

  // Robust static parser using State Machine (Index-based Scanner) instead of Regex
  public static parseFinal(text: string): ParsedResponse {
    const thoughts: string[] = [];
    const actions: any[] = [];

    let i = 0;
    while (i < text.length) {
        const thoughtStart = text.indexOf('<thought>', i);
        const actionStart = text.indexOf('<action', i);
        
        let nextTag = '';
        let startIndex = -1;
        
        if (thoughtStart !== -1 && (actionStart === -1 || thoughtStart < actionStart)) {
            nextTag = 'thought';
            startIndex = thoughtStart;
        } else if (actionStart !== -1) {
            nextTag = 'action';
            startIndex = actionStart;
        } else {
            break; // No more tags found
        }
        
        if (nextTag === 'thought') {
            const contentStart = startIndex + '<thought>'.length;
            const endTag = '</thought>';
            let endIndex = text.indexOf(endTag, contentStart);
            if (endIndex === -1) endIndex = text.length; // Auto-heal unclosed tag
            
            thoughts.push(text.substring(contentStart, endIndex).trim());
            i = endIndex + endTag.length;
        } else if (nextTag === 'action') {
            const openTagEnd = text.indexOf('>', startIndex);
            if (openTagEnd === -1) break;
            
            const openTag = text.substring(startIndex, openTagEnd + 1);
            
            let name = 'unknown';
            const nameMatch = openTag.match(/(?:name|type)\s*=\s*["']([^"']+)["']/i);
            if (nameMatch) name = nameMatch[1].trim();
            
            const contentStart = openTagEnd + 1;
            const endTag = '</action>';
            let endIndex = text.indexOf(endTag, contentStart);
            if (endIndex === -1) endIndex = text.length; // Auto-heal unclosed tag
            
            const content = text.substring(contentStart, endIndex).trim();
            
            let params: Record<string, any> = {};
            let hasParams = false;
            
            // State machine for <parameter> tags
            let pIndex = 0;
            while (pIndex < content.length) {
                const pStart = content.indexOf('<parameter', pIndex);
                if (pStart === -1) break;
                const pOpenEnd = content.indexOf('>', pStart);
                if (pOpenEnd === -1) break;
                
                const pOpenTag = content.substring(pStart, pOpenEnd + 1);
                let pName = '';
                const pNameMatch = pOpenTag.match(/name\s*=\s*["']([^"']+)["']/i);
                if (pNameMatch) pName = pNameMatch[1].trim();
                
                const pContentStart = pOpenEnd + 1;
                const pEndTag = '</parameter>';
                let pEndIndex = content.indexOf(pEndTag, pContentStart);
                if (pEndIndex === -1) pEndIndex = content.length;
                
                if (pName) {
                    params[pName] = content.substring(pContentStart, pEndIndex).trim();
                    hasParams = true;
                }
                pIndex = pEndIndex + pEndTag.length;
            }

            // State machine for direct tags (e.g. <path>...</path>)
            if (!hasParams) {
                const directTagRegex = /<([a-zA-Z0-9_]+)>([\s\S]*?)<\/\1>/gi;
                let directTagMatch;
                while ((directTagMatch = directTagRegex.exec(content)) !== null) {
                    const pName = directTagMatch[1].trim();
                    const pValue = directTagMatch[2].trim();
                    params[pName] = pValue;
                    hasParams = true;
                }
            }
            
            // Fallback to JSON or Heuristic Key-Value
            if (!hasParams) {
                try {
                    params = JSON.parse(content);
                } catch (e) {
                    if (name === 'write_file') {
                        params = { content };
                    } else {
                        const kvRegex = /"([^"]+)"\s*:\s*"([\s\S]*?)"/g;
                        let kvMatch;
                        while ((kvMatch = kvRegex.exec(content)) !== null) {
                            params[kvMatch[1]] = kvMatch[2];
                        }
                    }
                }
            }
            
            actions.push({ name, parameters: params });
            i = endIndex + endTag.length;
        }
    }

    // Phase 5: Universal Integration - Fallback to JSON parsing if XML yields no actions
    if (actions.length === 0) {
        try {
            const jsonParsed = healAndParseJSON(text);
            const jsonActions = Array.isArray(jsonParsed) ? jsonParsed : [jsonParsed];
            
            for (const item of jsonActions) {
                if (item && typeof item === 'object') {
                    if (item.tool_calls && Array.isArray(item.tool_calls)) {
                        for (const tc of item.tool_calls) {
                            if (tc.function && tc.function.name) {
                                let args = tc.function.arguments;
                                if (typeof args === 'string') {
                                    try { args = JSON.parse(args); } catch (e) {}
                                }
                                actions.push({ name: tc.function.name, parameters: args || {} });
                            }
                        }
                    }
                    else if (item.action || item.name || item.tool) {
                        const name = item.action || item.name || item.tool;
                        const parameters = item.parameters || item.args || item.arguments || { ...item };
                        
                        const cleanParams = { ...parameters };
                        delete cleanParams.action;
                        delete cleanParams.name;
                        delete cleanParams.tool;
                        
                        actions.push({ name, parameters: cleanParams });
                    }
                }
            }
        } catch (e) {
            // Not valid JSON, ignore
        }
    }

    // Phase 7: Granular Diffing Protocol (<edit> and <code> tags)
    const editRegex = /<edit path="(.*?)">([\s\S]*?)<\/edit>/g;
    let editMatch;
    while ((editMatch = editRegex.exec(text)) !== null) {
        const path = editMatch[1];
        const editContent = editMatch[2];
        
        const searchRegex = /<search>([\s\S]*?)<\/search>/;
        const replaceRegex = /<replace>([\s\S]*?)<\/replace>/;
        
        const searchMatch = searchRegex.exec(editContent);
        const replaceMatch = replaceRegex.exec(editContent);
        
        if (searchMatch && replaceMatch) {
            actions.push({
                name: 'edit_file',
                parameters: {
                    path: path,
                    target: searchMatch[1].replace(/^\n/, ''),
                    replacement: replaceMatch[1].replace(/^\n/, '')
                }
            });
        }
    }

    const codeRegex = /<code path="(.*?)">([\s\S]*?)<\/code>/g;
    let codeMatch;
    while ((codeMatch = codeRegex.exec(text)) !== null) {
        const path = codeMatch[1];
        const content = codeMatch[2].trim();
        actions.push({
            name: 'write_file',
            parameters: {
                path: path,
                content: content
            }
        });
    }

    // Phase 6: Markdown Code Block Fallback (Anti-Token Waste)
    if (actions.length === 0) {
        const codeBlockRegex = /```[a-zA-Z]*\n([\s\S]*?)```/g;
        let match;
        let fileCounter = 1;
        while ((match = codeBlockRegex.exec(text)) !== null) {
            const codeContent = match[1];
            let path = `src/GeneratedFile${fileCounter}.ts`;
            const firstLine = codeContent.split('\n')[0].trim();
            if (firstLine.startsWith('//') || firstLine.startsWith('/*')) {
                const possiblePath = firstLine.replace(/[\/\*]/g, '').trim();
                if (possiblePath.includes('.') && !possiblePath.includes(' ')) {
                    path = possiblePath;
                }
            }
            actions.push({
                name: 'write_file',
                parameters: {
                    path: path,
                    content: codeContent
                }
            });
            fileCounter++;
        }
    }

    return { thoughts, actions, raw: text };
  }
}
