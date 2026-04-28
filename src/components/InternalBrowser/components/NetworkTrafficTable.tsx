import React, { useState, useEffect, useRef } from 'react';
import { Badge } from '../../ui/badge';
import { io } from 'socket.io-client';
import { Trash2, Globe, ArrowRight, Activity } from 'lucide-react';

export const NetworkTrafficTable: React.FC<{ id?: string }> = ({ id }) => {
  const [rows, setRows] = useState<any[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(window.location.origin, { path: '/terminal-socket/' });
    
    socket.on('browser:network-activity', (data) => {
      setRows(prev => {
        const newRows = [...prev, data];
        if (newRows.length > 100) return newRows.slice(newRows.length - 100);
        return newRows;
      });
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [rows]);

  const clearRows = () => setRows([]);

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB'];
    let size = bytes;
    let unitIndex = 0;
    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-primary)]">
      <div className="flex items-center justify-between p-2 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Globe size={14} className="text-blue-400" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Network Traffic</span>
        </div>
        <button 
          onClick={clearRows}
          className="p-1 hover:bg-red-500/10 text-slate-500 hover:text-red-400 rounded transition-colors"
          title="Clear Traffic"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto custom-scrollbar p-1"
      >
        <table className="w-full text-[10px] text-left border-collapse">
          <thead className="sticky top-0 bg-[var(--bg-primary)] text-slate-500 font-bold uppercase tracking-tighter">
            <tr>
              <th className="p-1 border-b border-slate-800">Method</th>
              <th className="p-1 border-b border-slate-800">Status</th>
              <th className="p-1 border-b border-slate-800">URL</th>
              <th className="p-1 border-b border-slate-800">Type</th>
              <th className="p-1 border-b border-slate-800 text-right">Size</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {rows.map((row, i) => (
              <tr key={i} className="hover:bg-slate-800/30 transition-colors group">
                <td className="p-1 whitespace-nowrap">
                  <span className={`font-bold ${
                    row.method === 'POST' ? 'text-amber-400' : 
                    row.method === 'GET' ? 'text-blue-400' : 'text-slate-400'
                  }`}>
                    {row.method}
                  </span>
                </td>
                <td className="p-1">
                  <span className={`px-1 rounded ${
                    row.status >= 200 && row.status < 300 ? 'bg-green-500/20 text-green-500' :
                    row.status >= 400 ? 'bg-red-500/20 text-red-500' : 'bg-slate-500/20 text-slate-500'
                  }`}>
                    {row.status}
                  </span>
                </td>
                <td className="p-1 truncate max-w-[200px]" title={row.url}>
                  {row.url}
                </td>
                <td className="p-1 text-slate-500 truncate max-w-[80px]">
                  {row.contentType?.split(';')[0]}
                </td>
                <td className="p-1 text-right text-slate-500 whitespace-nowrap">
                  {formatSize(row.size)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-slate-600 opacity-30">
            <Activity size={32} />
            <span className="text-[10px] mt-2">Waiting for traffic...</span>
          </div>
        )}
      </div>
    </div>
  );
};
  