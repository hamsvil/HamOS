import { useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

export function useSocketUpdate(componentId: string, onUpdate: () => void): void {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    // Connect to /ui-update namespace
    const socket = io('/ui-update', {
      path: '/terminal-socket/', // Reusing the same base path as terminal
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[useSocketUpdate] Connected for ${componentId}`);
    });

    socket.on('disconnect', (reason) => {
      console.warn(`[useSocketUpdate] Disconnected for ${componentId}: ${reason}`);
      if (reason === 'io server disconnect') {
        // the disconnection was initiated by the server, you need to reconnect manually
        socket.connect();
      }
    });

    socket.on('connect_error', (error) => {
      console.error(`[useSocketUpdate] Connection error for ${componentId}:`, error);
    });

    socket.on('component:refresh', (data: { componentName: string }) => {
      if (data.componentName === componentId || data.componentName === '*') {
        console.log(`[useSocketUpdate] Refresh triggered for ${componentId}`);
        onUpdate();
      }
    });

    return () => {
      console.log(`[useSocketUpdate] Cleaning up for ${componentId}`);
      socket.off('component:refresh');
      socket.disconnect();
      socketRef.current = null;
    };
  }, [componentId, onUpdate]);
}
