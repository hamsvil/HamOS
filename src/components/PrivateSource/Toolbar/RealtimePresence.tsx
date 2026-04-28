import React from 'react';
import { Activity, Wifi, WifiOff } from 'lucide-react';
import { usePresence } from '../Hooks/usePresence';

interface RealtimePresenceProps {
  currentPath: string;
  userName?: string;
}

export const RealtimePresence: React.FC<RealtimePresenceProps> = ({ currentPath, userName = 'Anonymous' }) => {
  const { users, isConnected } = usePresence(currentPath, userName);

  return (
    <div className="flex items-center gap-4 px-4 py-2 bg-[var(--bg-tertiary)]/50 rounded-2xl border border-[var(--border-color)] shadow-inner">
      <div className="flex -space-x-3">
        {users.slice(0, 5).map(user => (
          <div 
            key={user.id} 
            className="w-8 h-8 rounded-full border-2 border-[var(--bg-secondary)] flex items-center justify-center text-[10px] font-black text-white uppercase tracking-tighter shadow-lg relative group cursor-pointer hover:scale-110 transition-all overflow-hidden"
            style={{ backgroundColor: user.color }}
            title={user.name}
          >
            {user.avatar ? <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : user.name.charAt(0)}
            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-[var(--bg-secondary)] ${user.activePath === currentPath ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-black/90 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest rounded-lg opacity-0 group-hover:opacity-100 transition-all pointer-events-none whitespace-nowrap z-50 border border-white/10 shadow-2xl">
              {user.name} {user.activePath === currentPath ? '(In this folder)' : `(In ${user.activePath.split('/').pop() || 'Root'})`}
            </div>
          </div>
        ))}
        {users.length > 5 && (
          <div className="w-8 h-8 rounded-full border-2 border-[var(--bg-secondary)] bg-[var(--bg-tertiary)] flex items-center justify-center text-[10px] font-black text-[var(--text-secondary)] uppercase tracking-tighter shadow-lg z-0">
            +{users.length - 5}
          </div>
        )}
      </div>
      <div className="h-6 w-px bg-[var(--border-color)]" />
      <div className="flex items-center gap-3">
        {isConnected ? (
          <Activity size={12} className="text-emerald-500 animate-pulse" />
        ) : (
          <WifiOff size={12} className="text-red-400" />
        )}
        <span className={`text-[10px] font-black uppercase tracking-widest ${isConnected ? 'text-emerald-500' : 'text-red-400'}`}>
          {users.length} Neural Links {isConnected ? 'Active' : 'Offline'}
        </span>
      </div>
    </div>
  );
};
