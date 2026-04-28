import React, { useState, useEffect } from 'react';
import { Badge } from '../../ui/badge';
import { Download, X, FileText, CheckCircle, Clock } from 'lucide-react';
import { io } from 'socket.io-client';

export const DownloadsPanel: React.FC<{ id?: string }> = ({ id }) => {
  const [downloads, setDownloads] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDownloads = async () => {
    try {
      const res = await fetch('/api/proxy/downloads');
      const data = await res.json();
      setDownloads(data);
      setLoading(false);
    } catch (e) {
      console.error('Failed to fetch downloads', e);
    }
  };

  useEffect(() => {
    fetchDownloads();
    const interval = setInterval(fetchDownloads, 3000);

    const socket = io(window.location.origin, { path: '/terminal-socket/' });
    socket.on('browser:download-started', (download) => {
      setDownloads(prev => [download, ...prev]);
    });

    return () => {
      clearInterval(interval);
      socket.disconnect();
    };
  }, []);

  const removeDownload = async (downloadId: string) => {
    try {
      await fetch(`/api/proxy/downloads/${downloadId}`, { method: 'DELETE' });
      setDownloads(prev => prev.filter(d => d.id !== downloadId));
    } catch (e) {
      console.error('Failed to remove download', e);
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return 'Unknown';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size > 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(1)} ${units[unitIndex]}`;
  };

  return (
    <div className="flex flex-col gap-2 h-full overflow-y-auto custom-scrollbar">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Downloads</h3>
        <Badge variant="outline" className="text-[10px]">{downloads.length}</Badge>
      </div>

      {downloads.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-slate-600">
          <Download size={32} className="opacity-20 mb-2" />
          <p className="text-[10px]">No active downloads</p>
        </div>
      ) : (
        downloads.map(download => (
          <div key={download.id} className="p-2 border border-slate-800 rounded bg-slate-900/50 flex flex-col gap-2 group">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2 overflow-hidden">
                <FileText size={14} className="text-blue-400 shrink-0" />
                <div className="flex flex-col overflow-hidden">
                  <span className="text-[10px] font-medium text-slate-200 truncate">{download.filename}</span>
                  <span className="text-[9px] text-slate-500">{formatSize(download.size)} • {download.contentType}</span>
                </div>
              </div>
              <button 
                onClick={() => removeDownload(download.id)}
                className="text-slate-500 hover:text-red-400 transition-colors"
              >
                <X size={12} />
              </button>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1">
                {download.status === 'completed' ? (
                  <CheckCircle size={10} className="text-green-500" />
                ) : (
                  <Clock size={10} className="text-amber-500 animate-pulse" />
                )}
                <span className={`text-[9px] font-bold uppercase ${download.status === 'completed' ? 'text-green-500' : 'text-amber-500'}`}>
                  {download.status}
                </span>
              </div>
              
              <button
                onClick={() => window.open(download.url, '_blank')}
                className="px-2 py-0.5 bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[9px] font-bold rounded hover:bg-blue-500/20 transition-colors"
              >
                Download Again
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
};
  