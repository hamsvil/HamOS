/* eslint-disable no-useless-assignment */
import { Parser, Language, Tree } from 'web-tree-sitter';
import { LoggerService } from '../LoggerService';

export class TreeSitterService {
  private static instance: TreeSitterService;
  private parser: Parser | null = null;
  private languages: Map<string, Language> = new Map();
  private initPromise: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): TreeSitterService {
    if (!TreeSitterService.instance) {
      TreeSitterService.instance = new TreeSitterService();
    }
    return TreeSitterService.instance;
  }

  public async initialize() {
    if (this.parser) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const wasmPaths = [
          '/tree-sitter.wasm',
          '/web-tree-sitter.wasm',
          'https://cdn.jsdelivr.net/npm/web-tree-sitter@0.26.8/web-tree-sitter.wasm',
          'https://unpkg.com/web-tree-sitter@0.26.8/web-tree-sitter.wasm',
          '/toolchain/tree-sitter/tree-sitter.wasm'
        ];

        let initialized = false;
        for (const path of wasmPaths) {
          try {
            await Promise.race([
              Parser.init({
                locateFile(p: string, prefix: string) {
                  if (p === 'tree-sitter.wasm') return path;
                  return prefix + p;
                }
              }),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
            ]);
            initialized = true;
            console.log(`[TreeSitter] Initialized using: ${path}`);
            break;
          } catch (e) {
            console.warn(`[TreeSitter] Failed to init with ${path}, trying next...`);
          }
        }

        if (!initialized) throw new Error('All TreeSitter init paths failed');
        
        this.parser = new Parser();
      } catch (e) {
        LoggerService.error('TreeSitter', 'Failed to initialize', e);
      }
    })();

    return this.initPromise;
  }

  public async loadLanguage(langName: string, paths: string | string[]) {
    if (this.languages.has(langName)) return;

    const pathList = Array.isArray(paths) ? paths : [paths];

    for (const path of pathList) {
      try {
        const lang = await Promise.race([
          Language.load(path),
          new Promise<Language>((_, reject) => setTimeout(() => reject(new Error(`Timeout: ${path}`)), 10000))
        ]);
        this.languages.set(langName, lang);
        console.log(`[TreeSitter] Language loaded: ${langName} from ${path}`);
        return;
      } catch (e) {
        console.warn(`[TreeSitter] Failed to load ${langName} from ${path}, trying next...`);
      }
    }

    LoggerService.error('TreeSitter', `All paths failed for language: ${langName}`, null);
  }

  public parse(code: string, langName: string): Tree | null {
    if (!this.parser) return null;
    
    // Anti-OOM: Prevent parsing extremely large files on the main thread
    if (code.length > 100000) { // ~100KB limit for synchronous parsing
      LoggerService.warn('TreeSitter', `File too large for AST parsing (${code.length} bytes). Skipping to prevent UI freeze.`);
      return null;
    }

    const lang = this.languages.get(langName);
    if (!lang) return null;

    this.parser.setLanguage(lang);
    try {
      return this.parser.parse(code);
    } catch (e) {
      LoggerService.error('TreeSitter', 'Parse error', e);
      return null;
    }
  }

  /**
   * Phase 3: Prompt Pruning Logic
   * Extracts only relevant parts of the code based on the AST.
   */
  public prunePrompt(code: string, langName: string, query: string): string {
    const tree = this.parse(code, langName);
    if (!tree) return code;

    const root = tree.rootNode;
    let relevantNodes: any[] = [];
    
    function traverse(node: any) {
      if (!node) return;
      
      // Check if the node is a declaration that might match the query
      if (
        node.type === 'function_declaration' || 
        node.type === 'class_declaration' || 
        node.type === 'interface_declaration' || 
        node.type === 'method_definition' ||
        node.type === 'variable_declarator'
      ) {
        const nameNode = node.childForFieldName('name') || node.childForFieldName('key');
        if (nameNode && nameNode.text.toLowerCase().includes(query.toLowerCase())) {
          relevantNodes.push(node);
        }
      }
      
      // Also check comments for hints
      if (node.type === 'comment' && node.text.toLowerCase().includes(query.toLowerCase())) {
          relevantNodes.push(node);
      }

      for (let i = 0; i < node.childCount; i++) {
        traverse(node.child(i));
      }
    }

    traverse(root);

    if (relevantNodes.length > 0) {
      // Extract imports as well to provide context
      const imports = root.children.filter((c: any) => c.type === 'import_statement').map((c: any) => c.text).join('\n');
      const prunedContent = relevantNodes.map(n => n.text).join('\n\n');
      return `${imports}\n\n// --- Pruned Context for: ${query} ---\n\n${prunedContent}`;
    }
    
    // Fallback if no specific nodes match
    return code;
  }
}

export const treeSitterService = TreeSitterService.getInstance();
