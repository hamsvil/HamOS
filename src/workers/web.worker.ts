/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
// /src/workers/web.worker.ts
self.onmessage = async (e: MessageEvent) => {
  const { type, payload, id } = e.data;

  if (type === 'EXTRACT_CONTEXT') {
    try {
      const { html } = payload;
      let markdown = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
        .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gim, "")
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      self.postMessage({ id, type: 'EXTRACT_SUCCESS', payload: markdown });
    } catch (err: any) {
      self.postMessage({ id, type: 'ERROR', payload: `Extraction Error: ${err.message}` });
    }
  } else if (type === 'SCRAPE_URL') {
    try {
      const { url } = payload;
      let html = '';
      
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Status: ${response.status}`);
        html = await response.text();
      } catch (directErr) {
        console.warn(`Direct fetch failed for ${url}, trying CORS proxy...`);
        // Fallback to CORS proxy
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        const proxyResponse = await fetch(proxyUrl);
        if (!proxyResponse.ok) throw new Error(`Proxy fetch failed: ${proxyResponse.statusText}`, { cause: directErr });
        const proxyData = await proxyResponse.json();
        if (!proxyData.contents) throw new Error('No content returned from proxy', { cause: directErr });
        html = proxyData.contents;
      }
      
      // Zero-cost HTML to Markdown (simple regex-based cleaning)
      let markdown = html
        .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gim, "")
        .replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gim, "")
        .replace(/<nav\b[^>]*>([\s\S]*?)<\/nav>/gim, "")
        .replace(/<footer\b[^>]*>([\s\S]*?)<\/footer>/gim, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      self.postMessage({ id, type: 'SCRAPE_SUCCESS', payload: markdown });
    } catch (err: any) {
      self.postMessage({ id, type: 'ERROR', payload: `CORS/Fetch Error: ${err.message}` });
    }
  }
};
