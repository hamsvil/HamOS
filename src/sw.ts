/* eslint-disable no-useless-assignment */
/// <reference lib="webworker" />

const CACHE_NAME = 'ham-studio-v1';

self.addEventListener('install', (event: any) => {
  event.waitUntil((self as any).skipWaiting());
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil((self as any).clients.claim());
});

// Point 15: Native Cloud Run Execution (WebContainers + ServiceWorker)
// Intercept fetch requests and route them to WebContainer if needed
self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);
  
  // Check if the request is for the preview domain
  if (url.hostname === 'preview.local') {
    event.respondWith(handlePreviewRequest(event.request));
    return;
  }

  // Default fetch
  event.respondWith(fetch(event.request));
});

async function handlePreviewRequest(request: Request) {
  // Communicate with the main thread to get the response from WebContainer
  const clients = await (self as any).clients.matchAll();
  if (clients.length === 0) {
    return new Response('No active clients found', { status: 503 });
  }

  // Send message to the first client (main thread)
  const client = clients[0];
  const messageChannel = new MessageChannel();
  
  client.postMessage({
    type: 'PREVIEW_REQUEST',
    payload: {
      url: request.url,
      method: request.method,
      headers: Object.fromEntries(request.headers.entries())
    }
  }, [messageChannel.port2]);

  return new Promise<Response>((resolve) => {
    messageChannel.port1.onmessage = (event) => {
      const { body, status, headers } = event.data;
      const responseHeaders = new Headers(headers);
      
      // Ensure COOP/COEP headers are present for the previewed content
      responseHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
      responseHeaders.set('Cross-Origin-Embedder-Policy', 'require-corp');
      responseHeaders.set('Cross-Origin-Resource-Policy', 'cross-origin');
      
      resolve(new Response(body, { status, headers: responseHeaders }));
    };
  });
}
