 
/* eslint-disable no-useless-escape */
import { ProjectFile } from '../types';
import { openDB } from 'idb';
import { Orchestrator } from '../../../services/aiHub/core/Orchestrator';
import { geminiKeyManager } from '../../../services/geminiKeyManager';

const DB_NAME = 'HamAiStudio_Quantum';
const STORE_NAME = 'snapshots';

export class BuildHealer {
  private static dbPromise = openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'timestamp' });
      }
    },
  });

  static async takeSnapshot(files: ProjectFile[]): Promise<number> {
    const db = await this.dbPromise;
    const timestamp = Date.now();
    await db.put(STORE_NAME, { timestamp, files: JSON.parse(JSON.stringify(files)) });
    return timestamp;
  }

  static async rollback(timestamp: number): Promise<ProjectFile[] | null> {
    const db = await this.dbPromise;
    const snapshot = await db.get(STORE_NAME, timestamp);
    return snapshot ? snapshot.files : null;
  }

  static async getLatestSnapshot(): Promise<ProjectFile[] | null> {
    const db = await this.dbPromise;
    const snapshots = await db.getAll(STORE_NAME);
    if (snapshots.length === 0) return null;
    // Sort by timestamp descending
    snapshots.sort((a, b) => b.timestamp - a.timestamp);
    return snapshots[0].files;
  }

  static async heal(error: string, files: ProjectFile[]): Promise<ProjectFile[] | null> {
    // console.log('Self-healing build error:', error);
    
    // 1. Attempt Auto-Patching via AI
    const apiKey = geminiKeyManager.getApiKey();
    if (apiKey && (error.includes('SyntaxError') || error.includes('ReferenceError') || error.includes('TypeError'))) {
      try {
        // console.log('Attempting AI auto-patch...');
        const orchestrator = Orchestrator.getInstance();
        
        // Find the file that likely caused the error (basic heuristic)
        const errorMatch = error.match(/([a-zA-Z0-9_\-\/\.]+):/);
        const suspectedFileName = errorMatch ? errorMatch[1] : null;
        
        const contextFiles = files.filter(f => 
          f.path.endsWith('.ts') || f.path.endsWith('.tsx') || f.path.endsWith('.js') || f.path.endsWith('.jsx')
        ).slice(0, 5); // Limit context size

        const prompt = `
You are an expert self-healing compiler. Fix the following build error.
Error:
${error}

Context Files:
${contextFiles.map(f => `--- ${f.path} ---\n${f.content.substring(0, 1000)}...`).join('\n\n')}

Return ONLY a JSON array of file modifications to fix the error. Format:
[
  {
    "path": "file/path.ts",
    "content": "full new content of the file"
  }
]
If you cannot fix it, return an empty array [].
`;

        const response = await orchestrator.routeRequest({
          messages: [{ role: 'user', content: prompt, timestamp: Date.now() }],
          systemInstruction: 'You are a silent, precise code fixer. Return only valid JSON.',
          temperature: 0.1,
          modelPreference: 'gemini-cloud',
          cloudModel: 'gemini-2.5-pro',
          apiKey
        });

        if (response.text) {
          try {
            const jsonMatch = response.text.match(/\[[\s\S]*\]/);
            if (jsonMatch) {
              const patches = JSON.parse(jsonMatch[0]);
              if (Array.isArray(patches) && patches.length > 0) {
                // console.log('Applied AI auto-patch successfully.');
                const newFiles = [...files];
                let patched = false;
                for (const patch of patches) {
                  const idx = newFiles.findIndex(f => f.path === patch.path);
                  if (idx !== -1) {
                    newFiles[idx] = { ...newFiles[idx], content: patch.content };
                    patched = true;
                  }
                }
                if (patched) return newFiles;
              }
            }
          } catch (e) {
            console.warn('Failed to parse AI auto-patch JSON', e);
          }
        }
      } catch (e) {
        console.warn('AI auto-patch failed', e);
      }
    }

    // 2. Fallback: Rollback to latest stable snapshot
    // console.log('Auto-patch failed or not applicable. Rolling back to latest snapshot.');
    if (error.includes('SyntaxError') || error.includes('ReferenceError') || error.includes('TypeError')) {
      return await this.getLatestSnapshot();
    }
    return null;
  }
}
