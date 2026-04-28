/* eslint-disable no-useless-assignment */
import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { setupWebSocket } from '../socket';
import { setupTerminalSocket } from '../terminalSocket';

/**
 * The Singularity Socket Engine
 * Initializes Socket.IO and WebSocket (Yjs) services.
 *
 * JWT Hardening: When SOCKET_JWT_SECRET is set in the environment, every
 * Socket.IO connection must present a valid JWT in `auth.token` or the
 * `Authorization: Bearer <token>` header. If unset, we fall back to open
 * mode (development) but log a warning so it's never silently insecure
 * in production.
 */
export async function setupSockets(server: HTTPServer) {
  const jwtSecret = process.env.SOCKET_JWT_SECRET;
  const allowedOrigins = (process.env.SOCKET_ALLOWED_ORIGINS || '*')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // 1. Setup Socket.IO for Terminal (Background)
  const io = new SocketIOServer(server, {
    path: '/terminal-socket/',
    destroyUpgrade: false,
    pingTimeout: 20000,
    pingInterval: 25000,
    cors: {
      origin: allowedOrigins.length === 1 && allowedOrigins[0] === '*' ? '*' : allowedOrigins,
      methods: ['GET', 'POST'],
      credentials: true,
    }
  });

  if (jwtSecret) {
    io.use((socket, next) => {
      try {
        const headerAuth = (socket.handshake.headers.authorization || '').replace(/^Bearer\s+/i, '');
        const token = (socket.handshake.auth?.token as string | undefined) || headerAuth;
        if (!token) return next(new Error('Auth required: missing token'));
        const payload = jwt.verify(token, jwtSecret);
        (socket.data as any).user = payload;
        next();
      } catch (err: any) {
        console.warn('[Socket Auth] Rejected:', err?.message);
        next(new Error('Auth failed: ' + (err?.message || 'invalid token')));
      }
    });
    console.log('[Singularity] Socket.IO JWT auth: ENABLED');
  } else {
    console.warn('[Singularity] Socket.IO JWT auth: DISABLED (set SOCKET_JWT_SECRET to enable)');
  }

  setupTerminalSocket(io);

  // 2. Setup WebSocket (Yjs) (Background - Non-blocking)
  setupWebSocket(server).catch(err => {
    console.error('[The Singularity] WebSocket initialization failed:', err);
  });
}
