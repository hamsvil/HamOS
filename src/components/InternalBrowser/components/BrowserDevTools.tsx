import React from 'react';
import { X, Terminal, Network, Database } from 'lucide-react';
import { Virtuoso } from 'react-virtuoso';

interface BrowserDevToolsProps {
  isOpen: boolean;
  onClose: () => void;
  logs: string[];
  networkRequests: any[];
  cookies: any[];
}

export const BrowserDevTools: React.FC<BrowserDevToolsProps> = ({
  isOpen,
  onClose,
  logs,
  networkRequests,
  cookies
}) => {
  // PROTOKOL FIX: useState MUST be called before any conditional return.
  // Previously this hook was AFTER `if (!isOpen) return null`, which violates
  // the Rules of Hooks and caused "Rendered more hooks than during previous render" crashes.
  const [activeTab, setActiveTab] = React.useState<'console' | 'network' | 'storage'>('console');

  if (!isOpen) return null;

  return (
    <div className="h-64 border-t border-[var(--border-color)] bg-[var(--bg-primary)] flex flex-col transition-all duration-300">
      <div className="flex items-center justify-between px-3 py-1 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-4">
          <button onClick={() => setActiveTab('console')} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] ${activeTab === 'console' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}>
            <Terminal size={12} /> Console
          </button>
          <button onClick={() => setActiveTab('network')} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] ${activeTab === 'network' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}>
            <Network size={12} /> Network
          </button>
          <button onClick={() => setActiveTab('storage')} className={`flex items-center gap-1 text-xs font-medium px-2 py-1 rounded hover:bg-[var(--bg-tertiary)] ${activeTab === 'storage' ? 'text-blue-400' : 'text-[var(--text-secondary)]'}`}>
            <Database size={12} /> Storage
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="p-1 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] rounded">
            <X size={12} />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden font-mono text-xs bg-[var(--bg-primary)]">
        {activeTab === 'console' && (
          logs.length === 0 ? (
            <div className="text-[var(--text-secondary)] opacity-50 italic p-4">No logs captured yet...</div>
          ) : (
            <Virtuoso
              style={{ height: '100%' }}
              data={logs}
              initialTopMostItemIndex={logs.length - 1}
              followOutput="smooth"
              itemContent={(index, log) => (
                <div className="border-b border-[var(--border-color)] last:border-0 py-1.5 px-4 hover:bg-[var(--bg-secondary)] text-[var(--text-primary)] break-all flex gap-2">
                  <span className="opacity-30 select-none w-8 shrink-0 text-right">{index + 1}</span>
                  <span className={log.includes('[ERROR]') ? 'text-red-400' : log.includes('[WARN]') ? 'text-yellow-400' : ''}>
                    {log}
                  </span>
                </div>
              )}
            />
          )
        )}
        {activeTab === 'network' && (
          <div className="h-full flex flex-col">
            <div className="flex text-[var(--text-secondary)] border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-1 font-bold uppercase tracking-tighter text-[9px]">
              <div className="w-16 shrink-0">Method</div>
              <div className="flex-1">URL</div>
              <div className="w-16 shrink-0">Status</div>
              <div className="w-20 shrink-0 text-right">Duration</div>
            </div>
            <div className="flex-1">
              {networkRequests.length === 0 ? (
                <div className="text-[var(--text-secondary)] opacity-50 italic p-4">No network requests captured yet...</div>
              ) : (
                <Virtuoso
                  style={{ height: '100%' }}
                  data={networkRequests}
                  itemContent={(index, req) => (
                    <div className="flex border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] px-4 py-1.5 items-center">
                      <div className="w-16 shrink-0 font-bold opacity-70">{req.method}</div>
                      <div className="flex-1 truncate pr-4 opacity-90">{req.url}</div>
                      <div className={`w-16 shrink-0 font-bold ${req.status >= 400 ? 'text-red-400' : 'text-green-400'}`}>{req.status}</div>
                      <div className="w-20 shrink-0 text-right opacity-50">{req.duration}ms</div>
                    </div>
                  )}
                />
              )}
            </div>
          </div>
        )}
        {activeTab === 'storage' && (
          <div className="h-full flex flex-col">
            <div className="flex text-[var(--text-secondary)] border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-1 font-bold uppercase tracking-tighter text-[9px]">
              <div className="w-1/3 shrink-0">Name</div>
              <div className="flex-1">Value</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {cookies.length === 0 ? (
                <div className="text-[var(--text-secondary)] opacity-50 italic p-4">No cookies found...</div>
              ) : (
                cookies.map((cookie, index) => (
                  <div key={index} className="flex border-b border-[var(--border-color)] hover:bg-[var(--bg-secondary)] px-4 py-1.5 items-center">
                    <div className="w-1/3 shrink-0 font-bold opacity-70 truncate pr-2">{cookie.name}</div>
                    <div className="flex-1 truncate opacity-90">{cookie.value}</div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
