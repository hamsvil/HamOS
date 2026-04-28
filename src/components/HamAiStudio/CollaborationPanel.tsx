 
import React, { useEffect, useState, useRef } from 'react';
import { Users, X, Info, Wifi, WifiOff, Send } from 'lucide-react';

interface CollaborationPanelProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
}

interface Collaborator {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'idle';
  isCurrentUser?: boolean;
}

import { safeStorage } from '../../utils/storage';

export default function CollaborationPanel({ isOpen, onClose, projectId }: CollaborationPanelProps) {
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [messages, setMessages] = useState<{user: string, text: string}[]>([]);
  const [chatInput, setChatInput] = useState('');
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      if (!isOpen || socketRef.current?.readyState === WebSocket.OPEN) return;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socket = new WebSocket(`${protocol}//${window.location.host}/collab?roomId=${projectId}`);
      
      socket.onopen = () => {
        setIsConnected(true);
        reconnectAttempts = 0;
        
        // Start Ping/Pong Heartbeat
        pingIntervalRef.current = setInterval(() => {
            if (socket.readyState === WebSocket.OPEN) {
                socket.send(JSON.stringify({ type: 'ping', timestamp: Date.now() }));
            }
        }, 30000);
        
        // Load or create user identity
        let userIdentity = safeStorage.getItem('ham_collab_user');
        let user;
        
        if (userIdentity) {
          user = JSON.parse(userIdentity);
        } else {
          const randomValues = new Uint32Array(1);
          self.crypto.getRandomValues(randomValues);
          const randomNum = randomValues[0] % 1000;
          
          user = {
            id: crypto.randomUUID().substr(0, 9),
            name: 'User_' + randomNum,
            avatar: `https://i.pravatar.cc/150?u=${crypto.randomUUID()}`
          };
          safeStorage.setItem('ham_collab_user', JSON.stringify(user));
        }

        // Announce presence
        socket.send(JSON.stringify({
          type: 'presence',
          user: user,
          timestamp: Date.now()
        }));
      };

      socket.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'presence') {
          setCollaborators(prev => {
            const exists = prev.find(c => c.id === data.user.id);
            if (exists) return prev;
            return [...prev, { ...data.user, status: 'online' }];
          });
        } else if (data.type === 'chat') {
          setMessages(prev => [...prev, { user: data.user, text: data.text, timestamp: data.timestamp || Date.now() }]);
        }
      };

      socket.onclose = () => {
        setIsConnected(false);
        socketRef.current = null;
        if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
        
        // Exponential Backoff Reconnection
        if (isOpen && reconnectAttempts < maxReconnectAttempts) {
            const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 10000);
            reconnectAttempts++;
            reconnectTimeoutRef.current = setTimeout(connectWebSocket, delay);
        }
      };

      socketRef.current = socket;
    };

    if (isOpen) {
        connectWebSocket();
    }

    return () => {
      if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
      if (pingIntervalRef.current) clearInterval(pingIntervalRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [isOpen, projectId]);

  const handleSendMessage = () => {
    if (chatInput.trim() && socketRef.current) {
      const msg = { type: 'chat', user: 'You', text: chatInput, timestamp: Date.now() };
      socketRef.current.send(JSON.stringify(msg));
      setMessages(prev => [...prev, msg]);
      setChatInput('');
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed right-0 top-0 h-full w-72 bg-[#141414] border-l border-white/10 shadow-2xl z-40 transform transition-transform duration-300 ease-in-out ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}>
      <div className="flex flex-col h-full">
        <div className="px-3 py-2.5 border-b border-white/10 flex items-center justify-between bg-[#1e1e1e]">
          <h3 className="font-semibold text-gray-200 flex items-center gap-2 text-sm">
            <Users size={16} className="text-indigo-400" />
            Live Collaboration
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-blue-400 rounded-full hover:bg-white/5 transition-colors">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
            <div className={`p-2 rounded-md text-[11px] flex items-start gap-2 ${isConnected ? 'bg-green-500/10 border border-green-500/20 text-green-400' : 'bg-red-500/10 border border-red-500/20 text-red-400'}`}>
                {isConnected ? <Wifi size={14} className="shrink-0" /> : <WifiOff size={14} className="shrink-0" />}
                <span>{isConnected ? `Connected to project: ${projectId}` : 'Disconnected from live session'}</span>
            </div>

            <div className="space-y-3">
                <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Active Users</p>
                <div className="flex flex-wrap gap-2">
                  <div className="flex items-center gap-1.5 p-1 bg-blue-500/10 rounded-full border border-blue-500/20">
                    <img src="https://i.pravatar.cc/150?u=me" className="w-5 h-5 rounded-full" alt="Me" referrerPolicy="no-referrer" />
                    <span className="text-[11px] text-blue-400 font-medium pr-1.5">You</span>
                  </div>
                  {collaborators.map(user => (
                    <div key={user.id} className="flex items-center gap-1.5 p-1 bg-white/5 rounded-full border border-white/10">
                      <img src={user.avatar} className="w-5 h-5 rounded-full" alt={user.name} referrerPolicy="no-referrer" />
                      <span className="text-[11px] text-gray-300 font-medium pr-1.5">{user.name}</span>
                    </div>
                  ))}
                </div>
            </div>

            <div className="flex-1 flex flex-col bg-[#0a0a0a] rounded-xl border border-white/5 overflow-hidden">
              <div className="p-1.5 border-b border-white/5 bg-[#1e1e1e] text-[9px] uppercase tracking-widest text-gray-500 font-bold">
                Project Chat
              </div>
              <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                {messages.length === 0 && <p className="text-center text-gray-600 text-xs mt-10 italic">No messages yet</p>}
                {messages.map((m, i) => (
                  <div key={i} className={`flex flex-col ${m.user === 'You' ? 'items-end' : 'items-start'}`}>
                    <span className="text-[9px] text-gray-500 mb-0.5">{m.user}</span>
                    <div className={`px-2 py-1 rounded-md text-[11px] max-w-[90%] ${m.user === 'You' ? 'bg-blue-600 text-white' : 'bg-white/5 text-gray-300'}`}>
                      {m.text}
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-1.5 bg-[#1e1e1e] border-t border-white/5 flex gap-1.5">
                <input 
                  type="text" 
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Type message..."
                  className="flex-1 bg-[#0a0a0a] border border-white/10 rounded-md px-2 py-1 text-[11px] text-white focus:outline-none focus:border-blue-500"
                />
                <button 
                  onClick={handleSendMessage}
                  className="p-1 bg-blue-600 text-white rounded-md hover:bg-blue-500 transition-colors"
                >
                  <Send size={12} />
                </button>
              </div>
            </div>
        </div>

        <div className="p-3 border-t border-white/10 bg-[#1e1e1e]">
          <p className="text-[10px] text-gray-500 text-center uppercase tracking-tighter mb-2">Ham Engine 2.1 Real-Time Sync</p>
          <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full bg-blue-500 transition-all duration-1000 ${isConnected ? 'w-full' : 'w-0'}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
