/* eslint-disable no-useless-assignment */
import { vectorStore } from '../vectorStore';
import { vfs } from '../vfsService';
import { contextPruner } from './contextPruner';

/**
 * CONTEXT INJECTOR - The RAG Orchestrator
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */
export class ContextInjector {
    /**
     * Injects relevant code context into a query.
     * Pillar 2: Local RAG
     */
    public async injectContext(query: string, topK: number = 5): Promise<string> {
        try {
            const searchResults = await vectorStore.search(query, topK);
            if (searchResults.length === 0) return '';

            let context = '';
            let hasSnippets = false;

            for (const result of searchResults) {
                try {
                    const content = await vfs.readFile(result.path);
                    const snippet = await contextPruner.prune(content, query, result.path);
                    
                    if (snippet && snippet.trim() !== '') {
                        if (!hasSnippets) {
                            context = '\n\n### RELEVANT CODE CONTEXT (RAG)\n';
                            context += 'The following code snippets were retrieved from the local codebase based on your request:\n\n';
                            hasSnippets = true;
                        }
                        context += `File: ${result.path}\n`;
                        context += '```' + this.getLanguage(result.path) + '\n';
                        context += snippet + '\n';
                        context += '```\n\n';
                    }
                } catch (e) {
                    console.warn(`[ContextInjector] Failed to inject context for ${result.path}`, e);
                }
            }

            return context;
        } catch (e) {
            console.error('[ContextInjector] RAG Search failed', e);
            return '';
        }
    }

    public async getSurgicalContext(prompt: string, projectFiles: { path: string, content: string }[], projectType: 'web' | 'android' = 'web'): Promise<string> {
        // 1. Generate File Tree (Lightweight context)
        const fileTree = projectFiles.map(f => f.path).join('\n');
        
        // 2. Get Semantic RAG Context (Deep context)
        // We use the existing injectContext method which leverages vectorStore
        let ragContext = await this.injectContext(prompt, 5);
        
        // 3. Fallback if RAG yields no results
        if (!ragContext || ragContext.trim() === '') {
            // console.log('[ContextInjector] RAG returned empty, using semantic fallback.');
            const fallbackFiles = projectFiles.filter(f => 
                f.path.endsWith('App.tsx') || 
                f.path.endsWith('main.tsx') || 
                f.path.endsWith('package.json') ||
                f.path.endsWith('index.html')
            ).slice(0, 3); // Limit to 3 files to save tokens

            if (fallbackFiles.length > 0) {
                ragContext = '\n\n### FALLBACK CODE CONTEXT\n';
                ragContext += 'The following core files were retrieved as fallback context:\n\n';
                for (const file of fallbackFiles) {
                    ragContext += `File: ${file.path}\n`;
                    ragContext += '```' + this.getLanguage(file.path) + '\n';
                    ragContext += file.content.substring(0, 2000) + '\n'; // Limit content size
                    ragContext += '```\n\n';
                }
            }
        }
        
        // 4. Combine and return
        return `[PROJECT FILE TREE]\n${fileTree}\n\n${ragContext}`;
    }

    private getLanguage(path: string): string {
        const ext = path.split('.').pop();
        switch (ext) {
            case 'ts': return 'typescript';
            case 'tsx': return 'tsx';
            case 'js': return 'javascript';
            case 'jsx': return 'jsx';
            case 'json': return 'json';
            case 'md': return 'markdown';
            default: return '';
        }
    }
}

export const contextInjector = new ContextInjector();
