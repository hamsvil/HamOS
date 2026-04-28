/* eslint-disable no-useless-assignment */
import FlexSearch from 'flexsearch';
const Document = (FlexSearch as any).Document || FlexSearch;

// This worker handles local search indexing.

let index: any;
try {
  index = new Document({
    cache: true,
    tokenize: "forward",
    document: {
      id: "id",
      index: ["content"],
    },
    // @ts-ignore
    db: false
  });
} catch (e) {
  console.error('[Search Worker] FlexSearch Init Error:', e);
}

self.onmessage = (e) => {
  const { type, payload } = e.data;

  if (type === 'ADD' && index) {
    try {
      index.add({ id: payload.id, content: payload.content });
    } catch (e) {
      console.error('[Search Worker] Add Error:', e);
    }
  } else if (type === 'SEARCH' && index) {
    try {
      const results = index.search(payload.query);
      self.postMessage({ type: 'RESULTS', results });
    } catch (e) {
      console.error('[Search Worker] Search Error:', e);
      self.postMessage({ type: 'RESULTS', results: [] });
    }
  }
};
