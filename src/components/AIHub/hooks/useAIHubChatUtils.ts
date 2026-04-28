 
 
import { generateUUID } from '../../../utils/uuid';
import { ChatMessage } from '../../../types/ai';
import { geminiKeyManager } from '../../../services/geminiKeyManager';
import { getReactiveDb } from '../../../db/reactiveDb';

export const scrapeUrl = async (url: string): Promise<string> => {
  return new Promise((resolve) => {
    const worker = new Worker(new URL('../../../workers/web.worker.ts', import.meta.url), { type: 'module' });
    const id = generateUUID();
    
    // Fallback timeout
    const timeout = setTimeout(() => {
      worker.terminate();
      resolve(`[Failed to scrape ${url}: Timeout]`);
    }, 15000);

    worker.onmessage = (e) => {
      if (e.data.id === id) {
        clearTimeout(timeout);
        if (e.data.type === 'SCRAPE_SUCCESS') {
          resolve(e.data.payload);
        } else {
          resolve(`[Failed to scrape ${url}: ${e.data.payload}]`);
        }
        worker.terminate();
      }
    };
    worker.onerror = () => {
      clearTimeout(timeout);
      resolve(`[Failed to scrape ${url}: Worker Error]`);
      worker.terminate();
    };
    worker.postMessage({ id, type: 'SCRAPE_URL', payload: { url } });
  });
};

export const summarizeConversation = async (historyToSummarize: ChatMessage[], setSummaryContext: (val: string | ((prev: string) => string)) => void, abortSignal?: AbortSignal) => {
  try {
    const compressedHistory = historyToSummarize.map(h => {
      let content = h.content;
      if (h.role === 'ai') {
          const removeBlock = (text: string, startTag: string, endTag: string, replacement: string) => {
              let result = '';
              let lastIndex = 0;
              let startIndex = text.indexOf(startTag);
              while (startIndex !== -1) {
                  result += text.substring(lastIndex, startIndex) + replacement;
                  const endIndex = text.indexOf(endTag, startIndex + startTag.length);
                  if (endIndex === -1) break;
                  lastIndex = endIndex + endTag.length;
                  startIndex = text.indexOf(startTag, lastIndex);
              }
              result += text.substring(lastIndex);
              return result;
          };

          content = removeBlock(content, '<thought>', '</thought>', '[THOUGHT PROCESS COMPRESSED]');
          content = content.replace(/<code path="(.*?)">[\s\S]*?<\/code>/g, '[CREATED FILE: $1]');
          content = content.replace(/<edit path="(.*?)">[\s\S]*?<\/edit>/g, '[EDITED FILE: $1]');
          content = content.replace(/<step title="(.*?)">\s*(?:\[CREATED FILE: .*?\]|\[EDITED FILE: .*?\]|\s)*<\/step>/g, '[STEP EXECUTED: $1]');
          
          if (content.length > 1000) {
              content = content.substring(0, 500) + '\n... [TRUNCATED] ...\n' + content.substring(content.length - 200);
          }
      }
      return `${h.role}: ${content}`;
    }).join('\n');
    
    const prompt = `Ringkas percakapan berikut secara sangat padat namun informatif untuk memori jangka panjang AI. Fokus pada fakta, preferensi user, dan topik utama. Percakapan:\n${compressedHistory}`;
    
    const res = await geminiKeyManager.executeWithRetry(async (client) => {
      return await client.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: { systemInstruction: "Kamu adalah sistem manajemen memori. Ringkas percakapan dengan sangat singkat (maks 500 karakter)." }
      });
    }, 30000, abortSignal);
    
    if (res.text) {
      setSummaryContext(prev => (prev + '\n' + res.text).slice(-3000));
    }
  } catch (err) {
    console.error('Summarization failed:', err);
  }
};

export const searchMemory = async (query: string): Promise<string> => {
  const db = await getReactiveDb();
  if (!db) return '';
  const allMsgs = await db.chats.find().exec();
  const allMsgsJson = allMsgs.map(m => m.toJSON());
  
  const queryWords = query.toLowerCase().split(/\W+/).filter(w => w.length > 2);
  const relevant = allMsgsJson.filter((msg: ChatMessage) => {
    const content = msg.content.toLowerCase();
    const matches = queryWords.filter(word => content.includes(word)).length;
    return matches > 0;
  }).sort((a: ChatMessage, b: ChatMessage) => {
    const aMatches = queryWords.filter(word => a.content.toLowerCase().includes(word)).length;
    const bMatches = queryWords.filter(word => b.content.toLowerCase().includes(word)).length;
    if (aMatches !== bMatches) return bMatches - aMatches;
    return b.timestamp - a.timestamp;
  });

  const context = relevant.slice(0, 5);
  return context.map((c: ChatMessage) => `[${new Date(c.timestamp).toLocaleDateString()}] ${c.role}: ${c.content}`).join('\n---\n');
};
