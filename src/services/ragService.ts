/* eslint-disable no-useless-assignment */
import { ProjectData } from '../components/HamAiStudio/types';
import { AiWorkerService } from './aiWorkerService';

interface DocumentChunk {
  path: string;
  content: string;
  embedding?: number[];
}

export class RAGService {
  private static instance: RAGService;
  private documents: DocumentChunk[] = [];
  private isIndexing: boolean = false;

  private constructor() {}

  public static getInstance(): RAGService {
    if (!RAGService.instance) {
      RAGService.instance = new RAGService();
    }
    return RAGService.instance;
  }

  private cosineSimilarity(vecA: number[], vecB: number[]): number {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      for (let i = 0; i < vecA.length; i++) {
          dotProduct += vecA[i] * vecB[i];
          normA += vecA[i] * vecA[i];
          normB += vecB[i] * vecB[i];
      }
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  public async indexProject(project: ProjectData) {
    if (this.isIndexing) return;
    this.isIndexing = true;
    
    try {
        // Keep existing embeddings if path and content match
        const newDocs: DocumentChunk[] = [];
        for (const file of project.files) {
            const existing = this.documents.find(d => d.path === file.path && d.content === file.content);
            if (existing && existing.embedding) {
                newDocs.push(existing);
            } else {
                newDocs.push({ path: file.path, content: file.content });
            }
        }
        this.documents = newDocs;

        // Generate embeddings for new/modified documents in batches to avoid rate limits
        for (const doc of this.documents) {
            if (!doc.embedding && doc.content.trim().length > 0) {
                try {
                    // Truncate content if too long for embedding
                    const textToEmbed = `File: ${doc.path}\n\n${doc.content.substring(0, 8000)}`;
                    const response = await AiWorkerService.embedContent({
                        model: 'gemini-embedding-2-preview',
                        contents: [{ role: 'user', parts: [{ text: textToEmbed }] }]
                    });
                    
                    if (response.embeddings && response.embeddings[0] && response.embeddings[0].values) {
                        doc.embedding = response.embeddings[0].values;
                    }
                    // Small delay to respect rate limits
                    await new Promise(resolve => setTimeout(resolve, 200));
                } catch (e) {
                    // Failed to generate embedding
                }
            }
        }
    } finally {
        this.isIndexing = false;
    }
  }

  public async getContextForPrompt(prompt: string): Promise<string> {
    if (this.documents.length === 0) return "";
    
    try {
        const response = await AiWorkerService.embedContent({
            model: 'gemini-embedding-2-preview',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        
        const promptEmbedding = response.embeddings?.[0]?.values;
        
        if (!promptEmbedding) {
            return this.fallbackSearch(prompt);
        }

        const scoredDocs = this.documents
            .filter(doc => doc.embedding)
            .map(doc => ({
                ...doc,
                score: this.cosineSimilarity(promptEmbedding, doc.embedding!)
            }))
            .sort((a, b) => b.score - a.score);

        const topDocs = scoredDocs.slice(0, 5);
        
        if (topDocs.length === 0) {
            return this.fallbackSearch(prompt);
        }

        return topDocs.map(doc => `File: ${doc.path}\nContent:\n${doc.content}\n`).join('\n---\n');
    } catch (e) {
        return this.fallbackSearch(prompt);
    }
  }
  
  private fallbackSearch(prompt: string): string {
    const keywords = prompt.toLowerCase().split(/\W+/).filter(k => k.length > 2);
    
    if (keywords.length === 0) {
      return this.documents.slice(0, 3).map(doc => `File: ${doc.path}\nContent:\n${doc.content}\n`).join('\n---\n');
    }

    const scoredDocs = this.documents.map(doc => {
      let score = 0;
      const pathLower = doc.path.toLowerCase();
      const contentLower = doc.content.toLowerCase();
      
      keywords.forEach(keyword => {
        if (pathLower.includes(keyword)) score += 5;
        if (contentLower.includes(keyword)) {
          const regex = new RegExp(keyword, 'g');
          const matches = contentLower.match(regex);
          if (matches) score += matches.length;
        }
      });
      
      return { ...doc, score };
    }).filter(doc => doc.score > 0).sort((a, b) => b.score - a.score);

    const topDocs = scoredDocs.slice(0, 5);
    
    if (topDocs.length === 0) {
      return this.documents.slice(0, 3).map(doc => `File: ${doc.path}\nContent:\n${doc.content}\n`).join('\n---\n');
    }

    return topDocs.map(doc => `File: ${doc.path}\nContent:\n${doc.content}\n`).join('\n---\n');
  }

  public getAllProjectContext(): string {
    let context = "PROJECT CONTEXT:\n";
    this.documents.forEach(doc => {
      context += `File: ${doc.path}\nContent:\n${doc.content}\n---\n`;
    });
    return context;
  }
}

export const ragService = RAGService.getInstance();
