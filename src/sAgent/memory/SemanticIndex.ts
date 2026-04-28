import * as fs from 'fs';
import * as path from 'path';

export interface Entry {
  id: string;
  keywords: string[];
  summary: string;
  filePath: string;
  timestamp: number;
  weight: number;
}

export interface Index {
  entries: Entry[];
}

const INDEX_PATH = path.resolve(process.cwd(), '.lisa/SEMANTIC_INDEX.json');
const MEMORY_PATH = path.resolve(process.cwd(), 'hamli_memory.json');

export class SemanticIndex {
  private index: Index = { entries: [] };

  constructor() {
    this.loadIndex();
  }

  private loadIndex() {
    if (fs.existsSync(INDEX_PATH)) {
      this.index = JSON.parse(fs.readFileSync(INDEX_PATH, 'utf8'));
    } else {
      this.seedFromMemory();
    }
  }

  private saveIndex() {
    fs.writeFileSync(INDEX_PATH, JSON.stringify(this.index, null, 2));
  }

  private seedFromMemory() {
    if (fs.existsSync(MEMORY_PATH)) {
      const memory = JSON.parse(fs.readFileSync(MEMORY_PATH, 'utf8'));
      const staticEntries = memory.static || [];
      
      this.index.entries = staticEntries.map((e: any) => ({
        id: e.id,
        keywords: e.content.toLowerCase().split(/\W+/).filter((w: string) => w.length > 3),
        summary: e.content.substring(0, 100),
        filePath: 'hamli_memory.json',
        timestamp: e.timestamp || Date.now(),
        weight: 1
      }));
      this.saveIndex();
    }
  }

  public indexEntry(id: string, content: string, filePath: string) {
    const entry: Entry = {
      id,
      keywords: content.toLowerCase().split(/\W+/).filter(w => w.length > 3),
      summary: content.substring(0, 200),
      filePath,
      timestamp: Date.now(),
      weight: 1
    };
    
    const existingIndex = this.index.entries.findIndex(e => e.id === id);
    if (existingIndex >= 0) {
      this.index.entries[existingIndex] = entry;
    } else {
      this.index.entries.push(entry);
    }
    this.saveIndex();
  }

  public queryMemory(keywords: string[]): Entry[] {
    const kw = keywords.map(k => k.toLowerCase());
    return this.index.entries
      .map(entry => {
        const matches = entry.keywords.filter(k => kw.includes(k)).length;
        return { entry, score: matches * entry.weight };
      })
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(item => item.entry);
  }

  public updateWeight(id: string, delta: number) {
    const entry = this.index.entries.find(e => e.id === id);
    if (entry) {
      entry.weight += delta;
      this.saveIndex();
    }
  }
}

export const semanticIndex = new SemanticIndex();
