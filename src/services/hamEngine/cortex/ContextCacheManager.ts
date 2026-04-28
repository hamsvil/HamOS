/* eslint-disable no-useless-assignment */
import { GoogleGenAI, Content, CachedContent } from '@google/genai';

export class ContextCacheManager {
  private static activeCaches: Map<string, { cache: CachedContent, hash: string }> = new Map();

  public static async getOrCreateCache(client: GoogleGenAI, apiKey: string, modelName: string, systemInstruction: string, fileList: string): Promise<string | undefined> {
    const currentHash = this.hashString(systemInstruction + fileList);
    const existing = this.activeCaches.get(apiKey);
    
    // If cache exists and hash matches, reuse it
    if (existing && existing.hash === currentHash) {
      return existing.cache.name;
    }

    // Try to create a new cache
    try {
      // Delete old cache if it exists for this key
      if (existing) {
        try {
          await client.caches.delete({ name: existing.cache.name });
        } catch (e) {
          console.warn('[ContextCacheManager] Failed to delete old cache:', e);
        }
      }

      const cacheContent: Content[] = [{
        role: 'user',
        parts: [{ text: `CURRENT PROJECT FILES:\n${fileList}` }]
      }];

      // console.log('[ContextCacheManager] Creating new context cache...');
      const newCache = await client.caches.create({
        model: modelName,
        config: {
          contents: cacheContent,
          systemInstruction: { parts: [{ text: systemInstruction }] },
          ttl: "3600s" // 1 hour TTL
        }
      });
      
      this.activeCaches.set(apiKey, { cache: newCache, hash: currentHash });
      // console.log('[ContextCacheManager] Cache created successfully:', newCache.name);
      return newCache.name;
    } catch (e) {
      console.warn('[ContextCacheManager] Failed to create context cache. Falling back to standard payload.', e);
      return undefined;
    }
  }

  public static async clearAllCaches(client: GoogleGenAI): Promise<void> {
    for (const [apiKey, entry] of this.activeCaches.entries()) {
      try {
        await client.caches.delete({ name: entry.cache.name });
      } catch (e) {
        console.warn(`[ContextCacheManager] Failed to delete cache ${entry.cache.name}:`, e);
      }
    }
    this.activeCaches.clear();
    // console.log('[ContextCacheManager] All active caches cleared.');
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }
}
