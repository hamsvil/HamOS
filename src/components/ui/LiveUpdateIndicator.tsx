import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { io } from 'socket.io-client';

const LiveUpdateIndicator: React.FC = () => {
  const [notifications, setNotifications] = useState<{ id: string; message: string }[]>([]);

  useEffect(() => {
    const socket = io('/ui-update', {
      path: '/terminal-socket/',
    });

    socket.on('ui:notify', (data: { message: string }) => {
      const id = Math.random().toString(36).substring(7);
      setNotifications(prev => [...prev, { id, message: data.message }]);
      
      setTimeout(() => {
        setNotifications(prev => prev.filter(n => n.id !== id));
      }, 2000);
    });

    return () => {
      socket.off('ui:notify');
      socket.disconnect();
    };
  }, []);

  return (
    <div className="fixed bottom-4 left-4 z-[10000] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {notifications.map(n => (
          <motion.div
            key={n.id}
            initial={{ opacity: 0, x: -20, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -20, scale: 0.9 }}
            className="px-4 py-2 rounded-lg bg-[#0a0a0a]/80 backdrop-blur-md border border-white/10 shadow-xl text-white text-xs font-medium flex items-center gap-2"
          >
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
            {n.message}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default LiveUpdateIndicator;
