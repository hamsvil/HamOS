/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// import { pipeline, env } from '@xenova/transformers';

let pipeline: any = null;
let env: any = null;

async function initTransformers() {
    if (!pipeline) {
        // @ts-ignore
        const transformers = await import(/* @vite-ignore */ 'https://cdn.jsdelivr.net/npm/@xenova/transformers@2.17.2/+esm');
        pipeline = transformers.pipeline;
        env = transformers.env;
        
        env.allowLocalModels = true;
        env.useBrowserCache = true;
    }
}

// Proxy massiveDb calls to the main thread to avoid multiple SQLite OPFS locks
const massiveDb = {
    async call(method: string, ...args: any[]) {
        return new Promise((resolve, reject) => {
            const id = Math.random().toString(36).substring(7);
            const handler = (e: MessageEvent) => {
                if (e.data.id === id) {
                    self.removeEventListener('message', handler);
                    if (e.data.type === 'DB_RESULT') resolve(e.data.payload);
                    else if (e.data.type === 'DB_ERROR') reject(new Error(e.data.payload));
                }
            };
            self.addEventListener('message', handler);
            self.postMessage({ id, type: 'DB_CALL', method, args });
        });
    },
    init: () => massiveDb.call('init'),
    getAllEmbeddings: () => massiveDb.call('getAllEmbeddings'),
    pruneOldEmbeddings: (limit: number) => massiveDb.call('pruneOldEmbeddings', limit),
    pruneOrphanedRelationships: () => massiveDb.call('pruneOrphanedRelationships'),
    insertEmbedding: (id: string, content: string, embeddingArray: any, metadata: any) => massiveDb.call('insertEmbedding', id, content, embeddingArray, metadata),
    insertRelationship: (docIdA: string, docIdB: string, type: string, score?: number) => massiveDb.call('insertRelationship', docIdA, docIdB, type, score),
    batchInsertEmbeddings: (items: any[]) => massiveDb.call('batchInsertEmbeddings', items),
    deleteEmbedding: (id: string) => massiveDb.call('deleteEmbedding', id),
    getRelatedDocs: (docId: string) => massiveDb.call('getRelatedDocs', docId),
    getAllDocMetadata: () => massiveDb.call('getAllDocMetadata')
};

// Disable local models, use remote models from HuggingFace
const MODEL_NAME = 'Xenova/all-MiniLM-L6-v2';
let extractor: any = null;
let documentEmbeddings: Map<string, any> = new Map();
let isExtractorReady = false;

async function initExtractor() {
    if (!extractor) {
        try {
            await initTransformers();
            await massiveDb.init();
            const savedEmbeddings = await massiveDb.getAllEmbeddings() as EmbeddingRow[];
            savedEmbeddings.forEach((row) => {
                documentEmbeddings.set(row.id, row.embedding);
            });
            
            extractor = await pipeline('feature-extraction', MODEL_NAME, {
                quantized: true,
            });
            isExtractorReady = true;
        } catch (e) {
            console.error("Failed to load semantic model:", e);
        }
    }
    return extractor;
}

// Start loading in background
initExtractor();

async function getEmbedding(text: string) {
    if (!isExtractorReady || !extractor) return null;
    try {
        // Truncate text to avoid exceeding token limits of the model
        const output = await extractor(text.slice(0, 1024), { pooling: 'mean', normalize: true });
        return output.data;
    } catch (e) {
        return null;
    }
}

function cosineSimilarity(vecA: any, vecB: any) {
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

// We need a standalone version of VectorStore logic for the worker
// Since the original VectorStore relies on VFS (which uses IndexedDB),
// we can either pass the documents to the worker, or have the worker read from IndexedDB.
// Passing documents is safer and easier.

let documents: Map<string, { content: string, tokens: string[] }> = new Map();
let docLengths: Map<string, number> = new Map();
let avgDocLength: number = 0;
let termFreqs: Map<string, Map<string, number>> = new Map();
let docFreqs: Map<string, number> = new Map();
const k1 = 1.5;
const b = 0.75;
const STORAGE_LIMIT = 5000; // Max embeddings to keep

interface PruneResult {
    deleted: number;
    deletedIds: string[];
}

interface EmbeddingRow {
    id: string;
    embedding: any;
}

interface RelatedDoc {
    docId: string;
    type: string;
}

interface DocMetadata {
    id: string;
    metadata: any;
    timestamp: number;
}

async function autoPrune() {
    try {
        const result = await massiveDb.pruneOldEmbeddings(STORAGE_LIMIT) as PruneResult;
        if (result && result.deleted > 0) {
            // console.log(`Auto-pruned ${result.deleted} old embeddings`);
            
            // Clean up orphaned relationships
            await massiveDb.pruneOrphanedRelationships();

            // Refresh local documentEmbeddings map if needed, 
            // but since it's a cache, we can just let it be or clear it.
            // For simplicity, let's just clear it and it will re-populate from DB if needed.
            // Actually, documentEmbeddings is used for search, so we should keep it in sync.
            const savedEmbeddings = await massiveDb.getAllEmbeddings() as EmbeddingRow[];
            documentEmbeddings.clear();
            savedEmbeddings.forEach((row) => {
                documentEmbeddings.set(row.id, row.embedding);
            });
        }
    } catch (e) {
        console.error("Auto-pruning failed:", e);
    }
}

function tokenize(text: string): string[] {
    const words = text.toLowerCase().replace(/[^a-z0-9_]/g, ' ').split(/\s+/).filter(t => t.length > 1);
    const tokens = [...words];
    for (let i = 0; i < words.length - 1; i++) {
        tokens.push(`${words[i]}_${words[i+1]}`);
    }
    return tokens;
}

function buildBM25Index() {
    docLengths.clear();
    termFreqs.clear();
    docFreqs.clear();
    
    let totalLength = 0;
    const numDocs = documents.size;

    if (numDocs === 0) {
        avgDocLength = 0;
        return;
    }

    documents.forEach((doc, path) => {
        const len = doc.tokens.length;
        docLengths.set(path, len);
        totalLength += len;

        const tf = new Map<string, number>();
        const uniqueTerms = new Set<string>();

        doc.tokens.forEach(term => {
            tf.set(term, (tf.get(term) || 0) + 1);
            uniqueTerms.add(term);
        });

        termFreqs.set(path, tf);

        uniqueTerms.forEach(term => {
            docFreqs.set(term, (docFreqs.get(term) || 0) + 1);
        });
    });

    avgDocLength = totalLength / numDocs;
}

function calculateBM25Score(queryTokens: string[], path: string): number {
    const tfMap = termFreqs.get(path);
    const docLen = docLengths.get(path) || 0;
    const numDocs = documents.size;
    
    if (!tfMap || docLen === 0 || avgDocLength === 0) return 0;

    let score = 0;

    queryTokens.forEach(term => {
        const tf = tfMap.get(term) || 0;
        if (tf > 0) {
            const df = docFreqs.get(term) || 0;
            const idf = Math.log(1 + (numDocs - df + 0.5) / (df + 0.5));
            const tfNorm = (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (docLen / avgDocLength)));
            score += idf * tfNorm;
        }
    });

    return score;
}

self.onmessage = async (e: MessageEvent) => {
    const { type, payload, id } = e.data;

    try {
        if (type === 'PING') {
            self.postMessage({ id, type: 'PONG' });
        }
        else if (type === 'SYNC_DOCS') {
            // payload is an array of { path, content }
            payload.forEach((doc: { path: string, content: string }) => {
                documents.set(doc.path, { content: doc.content, tokens: tokenize(doc.content) });
            });
            buildBM25Index();
            self.postMessage({ id, type: 'SYNC_SUCCESS' });
            
            // Background semantic indexing
            (async () => {
                if (!isExtractorReady) await initExtractor();
                const newEmbeddings: Map<string, number[]> = new Map();
                
                for (const doc of payload) {
                    if (!documentEmbeddings.has(doc.path)) {
                        const emb = await getEmbedding(doc.content);
                        if (emb) {
                            documentEmbeddings.set(doc.path, emb);
                            newEmbeddings.set(doc.path, emb);
                            await massiveDb.insertEmbedding(doc.path, doc.content, emb, { type: 'file' });
                        }
                    }
                }

                // Graph RAG Linking for synced docs
                for (const [path, emb] of newEmbeddings.entries()) {
                    for (const [otherPath, otherEmb] of documentEmbeddings.entries()) {
                        if (otherPath !== path) {
                            const sim = cosineSimilarity(emb, otherEmb);
                            if (sim > 0.8) { // Strict threshold for high-quality links
                                await massiveDb.insertRelationship(path, otherPath, 'semantic_link', sim);
                                await massiveDb.insertRelationship(otherPath, path, 'semantic_link', sim);
                            }
                        }
                    }
                }
            })();
        } 
        else if (type === 'ADD_DOC') {
            const { path, content } = payload;
            documents.set(path, { content, tokens: tokenize(content) });
            buildBM25Index();
            self.postMessage({ id, type: 'ADD_SUCCESS' });
            
            // Background semantic indexing
            (async () => {
                if (!isExtractorReady) await initExtractor();
                const emb = await getEmbedding(content);
                if (emb) {
                    documentEmbeddings.set(path, emb);
                    await massiveDb.insertEmbedding(path, content, emb, { type: 'file' });
                    
                    // Auto-Graph RAG Linking for single doc
                    for (const [otherPath, otherEmb] of documentEmbeddings.entries()) {
                        if (otherPath !== path) {
                            const sim = cosineSimilarity(emb, otherEmb);
                            if (sim > 0.8) {
                                await massiveDb.insertRelationship(path, otherPath, 'semantic_link', sim);
                                await massiveDb.insertRelationship(otherPath, path, 'semantic_link', sim);
                            }
                        }
                    }
                }
            })();
        }
        else if (type === 'BATCH_ADD_DOCS') {
            const items = payload; // array of { path, content, metadata }
            for (const item of items) {
                documents.set(item.path, { content: item.content, tokens: tokenize(item.content) });
            }
            buildBM25Index();
            self.postMessage({ id, type: 'BATCH_ADD_SUCCESS' });

            // Background semantic indexing in batch
            (async () => {
                try {
                    if (!isExtractorReady) await initExtractor();
                    const batchItems = [];
                    for (const item of items) {
                        const emb = await getEmbedding(item.content);
                        if (emb) {
                            documentEmbeddings.set(item.path, emb);
                            batchItems.push({
                                docId: item.path,
                                content: item.content,
                                embeddingArray: emb,
                                metadata: item.metadata || { type: 'chunk' }
                            });
                        }
                    }
                    if (batchItems.length > 0) {
                        await massiveDb.batchInsertEmbeddings(batchItems);
                        
                        // Auto-Graph RAG Linking
                        // Find parent chunks in the batch
                        const parentItems = batchItems.filter(item => item.metadata.type === 'parent');
                        for (const parent of parentItems) {
                            // Compare with all other parent embeddings in the store
                            for (const [otherPath, otherEmb] of documentEmbeddings.entries()) {
                                if (otherPath !== parent.docId && otherPath.endsWith('#parent')) {
                                    const sim = cosineSimilarity(parent.embeddingArray, otherEmb);
                                    if (sim > 0.75) {
                                        // Link them bidirectionally
                                        await massiveDb.insertRelationship(parent.docId, otherPath, 'similar');
                                        await massiveDb.insertRelationship(otherPath, parent.docId, 'similar');
                                    }
                                }
                            }
                        }
                    }
                    // Auto-pruning check
                    await autoPrune();
                } catch (err) {
                    console.error("Batch indexing error:", err);
                }
            })();
        }
        else if (type === 'REMOVE_DOC') {
            documents.delete(payload.path);
            documentEmbeddings.delete(payload.path);
            buildBM25Index();
            await massiveDb.deleteEmbedding(payload.path);
            self.postMessage({ id, type: 'REMOVE_SUCCESS' });
        }
        else if (type === 'GET_DOC_CONTENT') {
            const doc = documents.get(payload.path);
            self.postMessage({ id, type: 'DOC_CONTENT', payload: doc ? doc.content : null });
        }
        else if (type === 'SYNC_TYPE_GRAPH') {
            const { path, typeGraph } = payload;
            // typeGraph is { type: string, references: { path: string, start: number }[] }
            if (typeGraph && typeGraph.references) {
                for (const ref of typeGraph.references) {
                    await massiveDb.insertRelationship(path, ref.path, 'type_reference', 1.0);
                    await massiveDb.insertRelationship(ref.path, path, 'type_referenced_by', 1.0);
                }
            }
            self.postMessage({ id, type: 'TYPE_GRAPH_SYNC_SUCCESS' });
        }
        else if (type === 'SEARCH') {
            const { query, topK } = payload;
            if (documents.size === 0) {
                self.postMessage({ id, type: 'SEARCH_RESULT', payload: [] });
                return;
            }

            const queryTokens = tokenize(query);
            const results: { path: string, score: number }[] = [];
            
            // 1. BM25 Scoring
            documents.forEach((_, path) => {
                const score = calculateBM25Score(queryTokens, path);
                results.push({ path, score });
            });

            // Normalize BM25 scores
            const maxBM25 = Math.max(...results.map(r => r.score), 1);
            results.forEach(r => r.score = r.score / maxBM25);

            // 2. Semantic Scoring (Hybrid)
            if (isExtractorReady) {
                const queryEmb = await getEmbedding(query);
                if (queryEmb) {
                    results.forEach(res => {
                        const docEmb = documentEmbeddings.get(res.path);
                        if (docEmb) {
                            const semanticScore = cosineSimilarity(queryEmb, docEmb);
                            // Combine scores (e.g., 60% BM25, 40% Semantic)
                            res.score = (res.score * 0.6) + (semanticScore * 0.4);
                        }
                    });
                }
            }

            // 3. Keyword / Filename Boost
            const queryLower = query.toLowerCase();
            results.forEach(res => {
                const filename = res.path.split('/').pop()?.toLowerCase() || '';
                if (filename.includes(queryLower) || queryLower.includes(filename.replace(/\.[^/.]+$/, ""))) {
                    res.score *= 1.5;
                }
            });

            const topResults = results.sort((a, b) => b.score - a.score).slice(0, topK);
            
            // 4. Graph RAG Expansion
            // For the top result, fetch its related documents and boost them if they are in the results
            if (topResults.length > 0) {
                try {
                    const topDocId = topResults[0].path;
                    // If it's a child chunk, we might want to get relationships of its parent
                    const parentId = topDocId.includes('#child') ? topDocId.split('#child')[0] + '#parent' : topDocId;
                    
                    const relatedDocs = await massiveDb.getRelatedDocs(parentId) as RelatedDoc[];
                    const relatedDocIds = new Set(relatedDocs.map((r) => r.docId));
                    
                    // Boost related docs in the remaining results
                    results.forEach(res => {
                        const resParentId = res.path.includes('#child') ? res.path.split('#child')[0] + '#parent' : res.path;
                        if (relatedDocIds.has(resParentId)) {
                            res.score *= 1.2; // 20% boost for being related in the graph
                        }
                    });
                    
                    // Re-sort after graph boost
                    const finalResults = results.sort((a, b) => b.score - a.score).slice(0, topK);
                    self.postMessage({ id, type: 'SEARCH_RESULT', payload: finalResults });
                    return;
                } catch (e) {
                    console.error("Graph RAG expansion failed:", e);
                }
            }

            self.postMessage({ id, type: 'SEARCH_RESULT', payload: topResults });
        }
        else if (type === 'GET_DOCS') {
            const metadata = await massiveDb.getAllDocMetadata() as DocMetadata[];
            self.postMessage({ id, type: 'DOCS_LIST', payload: metadata.map((m) => ({
                path: m.id,
                metadata: m.metadata,
                timestamp: m.timestamp
            })) });
        }
    } catch (error: any) {
        self.postMessage({ id, type: 'ERROR', payload: error.message });
    }
};
