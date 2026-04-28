/* eslint-disable no-useless-assignment */
import { Server } from 'http';
import path from 'path';
import { Server as SocketIOServer } from 'socket.io';

let uiUpdateNamespace: any = null;

export function setupUIUpdateSocket(io: SocketIOServer) {
  uiUpdateNamespace = io.of('/ui-update');
  
  uiUpdateNamespace.on('connection', (socket: any) => {
    console.log('[UI-Update] Client connected to namespace');
    
    socket.on('disconnect', () => {
      console.log('[UI-Update] Client disconnected');
    });
  });
}

export function emitComponentRefresh(componentName: string) {
  if (uiUpdateNamespace) {
    uiUpdateNamespace.emit('component:refresh', { componentName });
  }
}

export function emitStateSync(scope: string, data: any) {
  if (uiUpdateNamespace) {
    uiUpdateNamespace.emit('state:sync', { scope, data });
  }
}

export function emitNotify(message: string) {
  if (uiUpdateNamespace) {
    uiUpdateNamespace.emit('ui:notify', { message });
  }
}

export async function setupWebSocket(server: Server) {
  // WebSocket Server for Collaboration (Yjs compatible)
  const { WebSocketServer } = await import('ws');
  const wss = new WebSocketServer({ noServer: true });

  // Store wss on app for access in routes
  (server as any).wss = wss;

  // Yjs state
  // Assuming y-utils.js is in the root directory
  let setupWSConnection: any = null;
  try {
    const yUtils = await import(path.join(process.cwd(), 'y-utils.js'));
    setupWSConnection = yUtils.setupWSConnection;
  } catch (_err) {
    console.warn('[Collab] y-utils.js not found in root. Collaboration features will be disabled.');
  }

  wss.on('error', (error) => {
    console.error('[Collab] WebSocket Server error:', error);
  });

  server.on('upgrade', (request, socket, head) => {
    socket.on('error', (err) => {
      console.error('[Collab] Upgrade socket error:', err);
    });

    const url = new URL(request.url || '', `http://${request.headers.host}`);
    
    // Only handle requests to /collab
    if (url.pathname === '/collab') {
      wss.handleUpgrade(request, socket, head, (ws) => {
        ws.on('error', (err) => {
          console.error('[Collab] WebSocket connection error:', err);
        });
        wss.emit('connection', ws, request);
      });
    }
  });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url || '', `http://${req.headers.host}`);
    
    // Collaboration WebSocket
    let roomId = url.searchParams.get('roomId');
    if (!roomId) {
      // Fallback: use the first part of the pathname as roomId if it's not empty
      const pathParts = url.pathname.split('/').filter(Boolean);
      if (pathParts.length > 0) roomId = pathParts[0];
    }
    roomId = roomId || 'default';
    
    // Use Yjs setupWSConnection
    if (setupWSConnection) {
      setupWSConnection(ws, req, { docName: roomId, gc: true });
    } else {
      console.warn(`[Collab] Collaboration disabled for room: ${roomId} (y-utils.js missing)`);
      // Optionally fallback to a basic broadcast or just close/ignore
    }
    
    console.log(`[Collab] User joined room: ${roomId}`);
  });
}
