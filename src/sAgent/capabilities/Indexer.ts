import * as fs from 'fs';
import * as path from 'path';

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  description: string;
}

export interface KnowledgeGraph {
  files: FileInfo[];
  lastUpdated: string;
}

const GRAPH_PATH = path.resolve(process.cwd(), '.lisa/KNOWLEDGE_GRAPH.json');

export class Indexer {
  private graph: KnowledgeGraph = { files: [], lastUpdated: '' };

  public async buildIndex() {
    const rootDir = process.cwd();
    const filesToIndex = this.scanDir(rootDir, ['src', 'server.ts', 'vite.config.ts']);
    
    this.graph.files = filesToIndex.map(filePath => {
      const stats = fs.statSync(filePath);
      const relativePath = path.relative(rootDir, filePath);
      return {
        name: path.basename(filePath),
        path: relativePath,
        size: stats.size,
        description: this.extractDescription(filePath)
      };
    });
    
    this.graph.lastUpdated = new Date().toISOString();
    fs.writeFileSync(GRAPH_PATH, JSON.stringify(this.graph, null, 2));
  }

  private scanDir(dir: string, allowed: string[]): string[] {
    let results: string[] = [];
    const list = fs.readdirSync(dir);
    
    for (const file of list) {
      const fullPath = path.resolve(dir, file);
      const stats = fs.statSync(fullPath);
      const relative = path.relative(process.cwd(), fullPath);

      if (stats.isDirectory()) {
        if (allowed.some(a => relative.startsWith(a) || a === relative)) {
           results = results.concat(this.scanDir(fullPath, allowed));
        }
      } else {
        if (allowed.some(a => relative === a || relative.startsWith(path.join(a, '')))) {
           results.push(fullPath);
        }
      }
    }
    return results;
  }

  private extractDescription(filePath: string): string {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      const firstLine = content.split('\n')[0].trim();
      if (firstLine.startsWith('//') || firstLine.startsWith('/*')) {
        return firstLine.replace(/^\/\/|^\/\*|\*\/$/g, '').trim();
      }
      
      const exportMatch = content.match(/export (?:class|function|const) (\w+)/);
      if (exportMatch) {
        return `Exports ${exportMatch[1]}`;
      }
    } catch (e) {}
    return '';
  }

  public getFileInfo(filePath: string): FileInfo | undefined {
    if (this.graph.files.length === 0 && fs.existsSync(GRAPH_PATH)) {
      this.graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    }
    return this.graph.files.find(f => f.path === filePath);
  }

  public searchFiles(keyword: string): FileInfo[] {
    if (this.graph.files.length === 0 && fs.existsSync(GRAPH_PATH)) {
      this.graph = JSON.parse(fs.readFileSync(GRAPH_PATH, 'utf8'));
    }
    const lowerKw = keyword.toLowerCase();
    return this.graph.files.filter(f => 
      f.name.toLowerCase().includes(lowerKw) || 
      f.path.toLowerCase().includes(lowerKw) || 
      f.description.toLowerCase().includes(lowerKw)
    );
  }
}

export const indexer = new Indexer();
