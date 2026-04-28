/* eslint-disable no-useless-assignment */
import JSZip from 'jszip';
import FlexSearch from 'flexsearch';
const Index = (FlexSearch as any).Index || FlexSearch;

let index: any;
try {
  index = new Index({
    tokenize: 'forward',
    cache: true,
    // @ts-ignore
    db: false
  });
} catch (e) {
  console.error('[FS Worker] FlexSearch Init Error:', e);
}

self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  try {
    switch (type) {
      case 'ZIP': {
        const zip = new JSZip();
        const { files } = payload; // Array of { name, content (ArrayBuffer/Blob) }
        
        for (const file of files) {
          zip.file(file.name, file.content);
        }
        
        const blob = await zip.generateAsync({ type: 'blob' });
        self.postMessage({ id, type: 'ZIP_SUCCESS', payload: blob });
        break;
      }

      case 'INDEX_FILES': {
        if (!index) throw new Error('Search Index not initialized');
        const { files } = payload; // Array of { path, content }
        for (const file of files) {
          index.add(file.path, file.content);
        }
        self.postMessage({ id, type: 'INDEX_SUCCESS' });
        break;
      }

      case 'SEARCH': {
        if (!index) throw new Error('Search Index not initialized');
        const { query } = payload;
        const results = index.search(query);
        self.postMessage({ id, type: 'SEARCH_SUCCESS', payload: results });
        break;
      }

      case 'HASH': {
        const { buffer } = payload;
        const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        self.postMessage({ id, type: 'HASH_SUCCESS', payload: hashHex });
        break;
      }

      default:
        self.postMessage({ id, type: 'ERROR', payload: 'Unknown task type' });
    }
  } catch (err: any) {
    self.postMessage({ id, type: 'ERROR', payload: err.message });
  }
};
