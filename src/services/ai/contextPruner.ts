/* eslint-disable no-useless-assignment */
import { treeSitterService } from '../analysis/treeSitterService';

/**
 * CONTEXT PRUNER - The Deterministic Brain
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */
export class ContextPruner {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;
    
    try {
      await treeSitterService.initialize();
      
      // Load common languages with CDN fallbacks
      await treeSitterService.loadLanguage('typescript', [
        '/tree-sitter-typescript.wasm',
        '/toolchain/tree-sitter/tree-sitter-typescript.wasm',
        'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.11/out/tree-sitter-typescript.wasm',
        'https://unpkg.com/tree-sitter-wasms@0.1.11/out/tree-sitter-typescript.wasm'
      ]);
      await treeSitterService.loadLanguage('tsx', [
        '/tree-sitter-tsx.wasm',
        '/toolchain/tree-sitter/tree-sitter-tsx.wasm',
        'https://cdn.jsdelivr.net/npm/tree-sitter-wasms@0.1.11/out/tree-sitter-tsx.wasm',
        'https://unpkg.com/tree-sitter-wasms@0.1.11/out/tree-sitter-tsx.wasm'
      ]);

      this.isInitialized = true;
      // console.log('[ContextPruner] Tree-Sitter initialized via TreeSitterService');
    } catch (e) {
      console.warn('[ContextPruner] Failed to initialize Tree-Sitter. Falling back to basic pruning.', e);
      // We set it to true anyway so it doesn't keep retrying and blocking
      this.isInitialized = true;
    }
  }

  /**
   * Prunes a file's content to only include relevant parts based on a query or focus.
   * Pillar 2: Prompt Pruning
   */
  async prune(code: string, focus: string, filename: string = 'file.ts'): Promise<string> {
    if (!this.isInitialized) await this.initialize();
    
    try {
      const lang = filename.endsWith('tsx') ? 'tsx' : 'typescript';
      const tree = treeSitterService.parse(code, lang);
      if (!tree) return code.substring(0, 1000);

      const root = tree.rootNode;
      
      // Deterministic Pruning:
      // We look for definitions (functions, classes, interfaces) that match the focus
      let relevantNodes: any[] = [];
      
      function traverse(node: any) {
        if (!node) return;
        if (node.type === 'function_declaration' || node.type === 'class_declaration' || node.type === 'interface_declaration' || node.type === 'method_definition') {
          const nameNode = node.childForFieldName('name') || node.childForFieldName('key');
          if (nameNode && nameNode.text.toLowerCase().includes(focus.toLowerCase())) {
            relevantNodes.push(node);
          }
        }
        for (let i = 0; i < node.childCount; i++) {
          traverse(node.child(i));
        }
      }

      traverse(root);

      const imports = root.children.filter((c: any) => c.type === 'import_statement').map((c: any) => c.text).join('\n');

      if (relevantNodes.length > 0) {
        const prunedContent = relevantNodes.map(n => n.text).join('\n\n');
        return `${imports}\n\n// ... [Context Pruned: Relevant Nodes] ...\n\n${prunedContent}`;
      }

      // Fallback: Return imports + first 1500 chars if no match
      return `${imports}\n\n// ... [Context Pruned: Fallback] ...\n\n${code.substring(0, 1500)}`;
    } catch (e) {
      console.warn('[ContextPruner] Pruning failed, returning safe substring.', e);
      return code.substring(0, 1000);
    }
  }

  /**
   * Builds a dependency graph for a set of files.
   * Pillar 2: Dependency Graph
   */
  async buildDependencyGraph(files: Map<string, string>) {
    // console.log('[ContextPruner] Building dependency graph for', files.size, 'files');
    if (!this.isInitialized) await this.initialize();
    
    const graph = new Map<string, string[]>();
    
    for (const [filename, content] of files.entries()) {
      const lang = filename.endsWith('tsx') ? 'tsx' : 'typescript';
      const tree = treeSitterService.parse(content, lang);
      if (!tree) continue;
      
      const imports: string[] = [];
      const root = tree.rootNode;
      
      // Simple import extraction
      root.children.forEach((node: any) => {
        if (node.type === 'import_statement') {
          const sourceNode = node.childForFieldName('source');
          if (sourceNode) {
            // Remove quotes
            const importPath = sourceNode.text.replace(/['"]/g, '');
            imports.push(importPath);
          }
        }
      });
      
      graph.set(filename, imports);
    }
    
    // console.log('[ContextPruner] Dependency graph built:', graph);
    return graph;
  }
}

export const contextPruner = new ContextPruner();
