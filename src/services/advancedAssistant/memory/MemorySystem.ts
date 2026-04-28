/* eslint-disable no-useless-assignment */
import { ProjectData } from '../../../components/HamAiStudio/types';
import { VectorStore } from '../../vectorStore';
import { vfs } from '../../vfsService';

// 2. Context Awareness & RAG (Retrieval-Augmented Generation)
// Stores and retrieves relevant context for the AI
export class MemorySystem {
  private shortTermMemory: string[] = [];

  // Local RAG (Retrieval-Augmented Generation)
  // Indexes code snippets and retrieves relevant ones based on semantic similarity
  public async indexProject(project: ProjectData): Promise<void> {
    // console.log(`Indexing ${project.files.length} files for RAG...`);
    await VectorStore.getInstance().syncFromVFS();
  }

  public async getRelevantContext(query: string): Promise<string> {
    const results = await VectorStore.getInstance().search(query, 5);
    
    if (!results || results.length === 0) {
      return 'No relevant context found.';
    }

    const relevantFiles = await Promise.all(results.map(async (res) => {
      try {
        const content = await vfs.readFile(res.path);
        return `File: ${res.path}\nContent:\n${content.substring(0, 500)}...`; // Truncate for token efficiency
      } catch (e) {
        return `File: ${res.path}\nContent: [Error reading file]`;
      }
    }));

    return relevantFiles.join('\n\n');
  }

  public addToMemory(interaction: { input: string, output: string }): void {
    this.shortTermMemory.push(`User: ${interaction.input}\nAI: ${interaction.output}`);
    if (this.shortTermMemory.length > 10) {
      this.shortTermMemory.shift(); // Keep only last 10 interactions
    }
  }

  public getConversationHistory(): string {
    return this.shortTermMemory.join('\n---\n');
  }
}
