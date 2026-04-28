import { TopologyNode } from '../../types/supreme';
import { vfs } from '../vfsService';

/**
 * PILAR 8: NEXUS-TOPOLOGY (The Graph Sovereign)
 * Pemetaan topologi proyek dan penyelesaian ketergantungan melingkar otomatis.
 */
export class NexusTopology {
  private static instance: NexusTopology;
  private nodes: Map<string, TopologyNode> = new Map();

  private constructor() {}

  public static getInstance(): NexusTopology {
    if (!NexusTopology.instance) {
      NexusTopology.instance = new NexusTopology();
    }
    return NexusTopology.instance;
  }

  public async mapProject(): Promise<Map<string, TopologyNode>> {
    console.log("[NEXUS-TOPOLOGY] Building Project Knowledge Graph...");
    const files = await this.getAllProjectFiles('/');
    this.nodes.clear();

    for (const file of files) {
      if (this.isSkipFile(file)) continue;
      
      const node: TopologyNode = {
        id: file,
        path: file,
        imports: [],
        dependents: [],
        isCircular: false
      };
      
      try {
        const content = await vfs.readFile(file);
        if (typeof content === 'string') {
          node.imports = this.extractImports(content, file);
        }
      } catch (_e) {
        // Skip binary or inaccessible files
      }
      
      this.nodes.set(file, node);
    }

    this.resolveDependents();
    this.detectCycles();
    
    return this.nodes;
  }

  private async getAllProjectFiles(dir: string): Promise<string[]> {
    let result: string[] = [];
    const entries = await vfs.readdir(dir);
    for (const entry of entries) {
      const fullPath = dir === '/' ? `/${entry}` : `${dir}/${entry}`;
      // Basic check if it's a file by extension
      if (entry.includes('.')) {
        result.push(fullPath);
      } else {
        const sub = await this.getAllProjectFiles(fullPath);
        result = [...result, ...sub];
      }
    }
    return result;
  }

  private extractImports(content: string, filePath: string): string[] {
    const importRegex = /from ['"](.+?)['"]/g;
    const imports: string[] = [];
    let match;
    
    const dir = filePath.substring(0, filePath.lastIndexOf('/'));
    
    while ((match = importRegex.exec(content)) !== null) {
      let importedPath = match[1];
      if (importedPath.startsWith('.')) {
        // Resolve relative path
        const parts = importedPath.split('/');
        const currentParts = dir === '/' ? [] : dir.split('/').filter(Boolean);
        
        for (const part of parts) {
          if (part === '.') continue;
          if (part === '..') {
            currentParts.pop();
          } else {
            currentParts.push(part);
          }
        }
        
        let resolved = '/' + currentParts.join('/');
        // Append common extensions if missing
        if (!resolved.includes('.')) {
          // This is a naive guess, but works for most JS/TS projects
          resolved += '.ts'; 
        }
        imports.push(resolved);
      } else if (importedPath.startsWith('@/')) {
        let resolved = importedPath.replace('@/', '/src/');
        if (!resolved.includes('.')) resolved += '.ts';
        imports.push(resolved);
      }
    }
    
    return imports;
  }

  private resolveDependents() {
    this.nodes.forEach((node, path) => {
      node.imports.forEach(imp => {
        const targetNode = this.nodes.get(imp);
        if (targetNode) {
          targetNode.dependents.push(path);
        }
      });
    });
  }

  private detectCycles() {
    const visited = new Set<string>();
    const recStack = new Set<string>();

    this.nodes.forEach((_, path) => {
      if (!visited.has(path)) {
        this.isCyclicUtil(path, visited, recStack, []);
      }
    });
  }

  private isCyclicUtil(curr: string, visited: Set<string>, recStack: Set<string>, path: string[]): boolean {
    if (recStack.has(curr)) {
      const node = this.nodes.get(curr);
      if (node) {
        node.isCircular = true;
        node.cyclePath = [...path, curr];
      }
      return true;
    }

    if (visited.has(curr)) return false;

    visited.add(curr);
    recStack.add(curr);

    const node = this.nodes.get(curr);
    if (node) {
      for (const neighbor of node.imports) {
        if (this.isCyclicUtil(neighbor, visited, recStack, [...path, curr])) {
          node.isCircular = true;
          return true;
        }
      }
    }

    recStack.delete(curr);
    return false;
  }

  private isSkipFile(path: string): boolean {
    return path.includes('node_modules') || path.includes('.git') || path.includes('dist');
  }

  public getNodes(): Map<string, TopologyNode> {
    return this.nodes;
  }
}
