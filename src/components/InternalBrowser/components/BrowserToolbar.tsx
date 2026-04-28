 
/* eslint-disable no-useless-escape */
import React, { useState, useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, RefreshCw, Home, Bookmark, MoreVertical, Sparkles, ShieldCheck, ShieldAlert, X, Search, BookOpen, ZoomIn, ZoomOut, Clock } from 'lucide-react';

interface BrowserToolbarProps {
  canGoBack: boolean;
  canGoForward: boolean;
  isLoading: boolean;
  url: string;
  onBack: () => void;
  onForward: () => void;
  onRefresh: () => void;
  onHome: () => void;
  onNavigate: (url: string) => void;
  onToggleMenu: () => void;
  isBookmarked: boolean;
  onToggleBookmark: () => void;
  onToggleCommand: () => void;
  isCommandActive: boolean;
  onToggleReaderMode: () => void;
  onZoom: (delta: number) => void;
  bookmarks: any[];
  history: any[];
  incognitoMode?: boolean;
}

export const BrowserToolbar: React.FC<BrowserToolbarProps> = ({
  canGoBack, canGoForward, isLoading, url, onBack, onForward, onRefresh, onHome, onNavigate, onToggleMenu, isBookmarked, onToggleBookmark, onToggleCommand, isCommandActive, onToggleReaderMode, onZoom, bookmarks, history, incognitoMode = false
}) => {
  const [inputValue, setInputValue] = useState(url);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputValue(url);
    }
  }, [url, isFocused]);

  useEffect(() => {
    if (isFocused && inputValue) {
      const query = inputValue.toLowerCase();
      const matchedBookmarks = bookmarks.filter(b => b.url.toLowerCase().includes(query) || b.title.toLowerCase().includes(query)).map(b => ({ ...b, type: 'bookmark' }));
      const matchedHistory = history.filter(h => h.url.toLowerCase().includes(query) || h.title.toLowerCase().includes(query)).map(h => ({ ...h, type: 'history' }));

      const combined = [...matchedBookmarks, ...matchedHistory];
      const unique = Array.from(new Map(combined.map(item => [item.url, item])).values());
      setSuggestions(unique.slice(0, 5));
    } else {
      setSuggestions([]);
    }
  }, [inputValue, isFocused, bookmarks, history]);

  const handleNavigate = (targetUrl: string = inputValue) => {
    let finalUrl = targetUrl.trim();
    if (!finalUrl) return;

    // PROTOKOL: Anti-XSS & Protocol Sanitization (Aggressive)
    const cleanUrl = finalUrl.replace(/[\s\t\n\r]/g, '').toLowerCase();
    const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:'];
    if (dangerousProtocols.some(p => cleanUrl.startsWith(p))) {
      console.warn(`[Quantum Browser] Blocked dangerous protocol navigation: ${finalUrl}`);
      finalUrl = `https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`;
      onNavigate(finalUrl);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }

    // PROTOKOL FIX: Improved URL detection.
    // Previous regex `/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([\/\w .-]*)*\/?$/i`
    // was too narrow and failed for URLs with query strings (?q=...) or hash fragments (#).
    // e.g. "google.com/search?q=hello" was incorrectly sent to the search engine.
    const hasProtocol = /^https?:\/\//i.test(finalUrl);

    // Already has protocol — use as-is
    if (hasProtocol) {
      onNavigate(finalUrl);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }

    // Detect localhost/IP (always treat as URL, use http)
    const isLocalhost = /^localhost(:\d+)?(\/.*)?$/i.test(finalUrl);
    const isIpAddress = /^(\d{1,3}\.){3}\d{1,3}(:\d+)?(\/.*)?$/.test(finalUrl);

    if (isLocalhost || isIpAddress) {
      onNavigate(`http://${finalUrl}`);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }

    // Detect domain-like strings: contains a dot and the part after the last dot is a known TLD-like suffix
    // This also handles domains with paths, query strings, and fragments.
    const domainPattern = /^([\da-z][\da-z-]*\.)+[a-z]{2,}([\/?#].*)?$/i;
    if (domainPattern.test(finalUrl)) {
      onNavigate(`https://${finalUrl}`);
      setIsFocused(false);
      inputRef.current?.blur();
      return;
    }

    // Fallback: treat as search query
    onNavigate(`https://www.google.com/search?q=${encodeURIComponent(finalUrl)}`);
    setIsFocused(false);
    inputRef.current?.blur();
  };

  const isHttps = url.startsWith('https://');

  return (
    <div className="flex flex-col relative z-20">
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] shadow-[0_4px_20px_rgba(0,0,0,0.1)]">
        <div className="flex items-center gap-1">
          <button onClick={onBack} disabled={!canGoBack} className="p-2 rounded-xl hover:bg-violet-500/10 disabled:opacity-20 text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-300 active:scale-90" title="Back"><ArrowLeft size={16} /></button>
          <button onClick={onForward} disabled={!canGoForward} className="p-2 rounded-xl hover:bg-violet-500/10 disabled:opacity-20 text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-300 active:scale-90" title="Forward"><ArrowRight size={16} /></button>
          <button onClick={onRefresh} className={`p-2 rounded-xl hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-500 active:scale-90 ${isLoading ? 'animate-spin text-violet-400' : ''}`} title="Refresh"><RefreshCw size={16} /></button>
          <button onClick={onHome} className="p-2 rounded-xl hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all duration-300 active:scale-90" title="Home"><Home size={16} /></button>
        </div>

        <div className={`flex-1 flex items-center gap-3 bg-[var(--bg-primary)] border rounded-2xl px-5 py-2 transition-all duration-500 group/input relative ${isFocused ? 'border-violet-500/50 ring-4 ring-violet-500/5 shadow-[0_0_20px_rgba(167,139,250,0.1)]' : 'border-[var(--border-color)] hover:border-[var(--text-secondary)]/30'} ${incognitoMode ? 'bg-gray-900 border-gray-700 shadow-[inset_0_0_20px_rgba(0,0,0,0.5)]' : ''}`}>
          <div className="flex items-center gap-2 shrink-0">
            {incognitoMode ? (
              <div className="p-1 bg-gray-500/10 rounded-md border border-gray-500/20">
                <ShieldCheck size={12} className="text-gray-400" />
              </div>
            ) : isHttps ? (
              <div className="p-1 bg-emerald-500/10 rounded-md border border-emerald-500/20">
                <ShieldCheck size={12} className="text-emerald-500" />
              </div>
            ) : (
              <div className="p-1 bg-amber-500/10 rounded-md border border-amber-500/20">
                <ShieldAlert size={12} className="text-amber-500" />
              </div>
            )}
            <span className={`text-[9px] font-black uppercase tracking-widest ${incognitoMode ? 'text-gray-400/70' : isHttps ? 'text-emerald-500/70' : 'text-amber-500/70'}`}>
              {incognitoMode ? 'Incognito' : isHttps ? 'Secure' : 'Insecure'}
            </span>
          </div>

          <div className="h-4 w-px bg-[var(--border-color)]" />

          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleNavigate()}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            placeholder="Search or enter address"
            className={`flex-1 bg-transparent border-none outline-none text-xs text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/30 font-black uppercase tracking-wider ${incognitoMode ? 'text-gray-200' : ''}`}
          />

          <div className="flex items-center gap-2">
            {inputValue && isFocused && (
              <button onClick={() => setInputValue('')} className="p-1.5 hover:bg-red-500/10 rounded-full text-red-400/50 hover:text-red-400 transition-all active:scale-90">
                <X size={12} />
              </button>
            )}
            <Search size={14} className={`transition-all duration-300 ${isFocused ? 'text-violet-400 scale-110' : 'text-[var(--text-secondary)] opacity-20'}`} />
          </div>

          {/* Auto-suggest Dropdown */}
          {isFocused && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-2xl overflow-hidden z-50">
              {suggestions.map((item, idx) => (
                <div
                  key={idx}
                  onClick={() => handleNavigate(item.url)}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-[var(--bg-tertiary)] cursor-pointer transition-colors border-b border-[var(--border-color)] last:border-0"
                >
                  {item.type === 'bookmark' ? (
                    <Bookmark size={14} className="text-amber-500 shrink-0" />
                  ) : (
                    <Clock size={14} className="text-violet-500 shrink-0" />
                  )}
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-xs font-bold text-[var(--text-primary)] truncate">{item.title}</span>
                    <span className="text-[10px] text-[var(--text-secondary)] truncate">{item.url}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-1 ml-1">
          <button onClick={onToggleReaderMode} className="hidden sm:flex p-2.5 rounded-xl hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90" title="Reader Mode"><BookOpen size={16} /></button>
          <button onClick={() => onZoom(0.1)} className="hidden md:flex p-2.5 rounded-xl hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90" title="Zoom In"><ZoomIn size={16} /></button>
          <button onClick={() => onZoom(-0.1)} className="hidden md:flex p-2.5 rounded-xl hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400 transition-all active:scale-90" title="Zoom Out"><ZoomOut size={16} /></button>
          <button onClick={onToggleBookmark} className={`p-2.5 rounded-xl hover:bg-amber-500/10 transition-all duration-300 active:scale-90 ${isBookmarked ? 'text-amber-400' : 'text-[var(--text-secondary)] hover:text-amber-400'}`} title="Bookmark"><Bookmark size={16} /></button>
          <button
            onClick={onToggleCommand}
            className={`p-2.5 rounded-xl transition-all duration-500 active:scale-90 group ${isCommandActive ? 'bg-violet-500/20 text-violet-400 border border-violet-500/30 shadow-[0_0_15px_rgba(167,139,250,0.2)]' : 'hover:bg-violet-500/10 text-[var(--text-secondary)] hover:text-violet-400'}`}
            title="Neural Pilot"
          >
            <Sparkles size={16} className={`${isCommandActive ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
          </button>
          <button onClick={onToggleMenu} className="p-2.5 rounded-xl hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-all active:scale-90" title="Menu"><MoreVertical size={16} /></button>
        </div>
      </div>

      {/* Linear Progress Bar */}
      {isLoading && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent overflow-hidden z-30">
          <div className="h-full bg-violet-500 animate-[progress_1.5s_ease-in-out_infinite]" style={{ width: '50%', transformOrigin: 'left' }} />
        </div>
      )}
      <style>{`
        @keyframes progress {
          0% { transform: translateX(-100%) scaleX(0.2); }
          50% { transform: translateX(0) scaleX(1); }
          100% { transform: translateX(200%) scaleX(0.2); }
        }
      `}</style>
    </div>
  );
};
