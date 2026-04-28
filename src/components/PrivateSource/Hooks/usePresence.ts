 
import { useState, useEffect, useMemo } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

export interface PresenceUser {
  id: string;
  name: string;
  color: string;
  avatar?: string;
  activePath: string;
  lastActive: number;
}

export const usePresence = (currentPath: string, userName: string = 'Anonymous') => {
  const [users, setUsers] = useState<PresenceUser[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  // Generate a stable color for the user
  const userColor = useMemo(() => {
    const colors = ['#f87171', '#fb923c', '#fbbf24', '#a3e635', '#4ade80', '#2dd4bf', '#22d3ee', '#38bdf8', '#818cf8', '#a78bfa', '#c084fc', '#f472b6'];
    let hash = 0;
    for (let i = 0; i < userName.length; i++) {
      hash = userName.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  }, [userName]);

  const userId = useMemo(() => Math.random().toString(36).substring(7), []);

  useEffect(() => {
    const doc = new Y.Doc();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const provider = new WebsocketProvider(
      `${protocol}//${window.location.host}?roomId=private-source-presence`,
      'private-source-presence',
      doc
    );

    const awareness = provider.awareness;

    awareness.setLocalStateField('user', {
      id: userId,
      name: userName,
      color: userColor,
      activePath: currentPath,
      lastActive: Date.now()
    });

    const handleUpdate = () => {
      const states = Array.from(awareness.getStates().values()) as any[];
      const activeUsers = states
        .filter(state => state.user)
        .map(state => state.user as PresenceUser);
      setUsers(activeUsers);
    };

    awareness.on('change', handleUpdate);
    provider.on('status', (event: any) => {
      setIsConnected(event.status === 'connected');
    });

    return () => {
      awareness.off('change', handleUpdate);
      provider.disconnect();
      doc.destroy();
    };
  }, [currentPath, userName, userColor, userId]);

  return { users, isConnected };
};
