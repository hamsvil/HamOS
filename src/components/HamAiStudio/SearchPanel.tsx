 
import React, { useState, useMemo, useEffect } from 'react';
import { Search, FileText, ChevronRight, ChevronDown, X, Type } from 'lucide-react';
import { ProjectData } from './types';

interface SearchPanelProps {
  project: ProjectData | null;
  onSelectFile: (path: string, line?: number) => void;
  onClose: () => void;
  onReplaceAll?: (searchQuery: string, replaceQuery: string, matchCase: boolean, useRegex: boolean) => void;
}

interface SearchResult {
  path: string;
  matches: { line: number; content: string; index: number }[];
}

export default function SearchPanel({ project, onSelectFile, onClose, onReplaceAll }: SearchPanelProps) {
  const [inputValue, setInputValue] = useState('');
  const [query, setQuery] = useState('');
  const [matchCase, setMatchCase] = useState(false);
  const [useRegex, setUseRegex] = useState(false);
  const [matchWholeWord, setMatchWholeWord] = useState(false);
  const [expandedFiles, setExpandedFiles] = useState<Set<string>>(new Set());

  const [replaceQuery, setReplaceQuery] = useState('');
  const [showReplace, setShowReplace] = useState(false);
  const [regexError, setRegexError] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setQuery(inputValue);
    }, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const results = useMemo(() => {
    setRegexError(null);
    if (!project || !query.trim()) return [];
    
    const searchResults: SearchResult[] = [];
    let searchRegex: RegExp | null = null;
    
    try {
      if (useRegex) {
        searchRegex = new RegExp(query, matchCase ? 'g' : 'gi');
      } else {
        const escapedQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const pattern = matchWholeWord ? `\\b${escapedQuery}\\b` : escapedQuery;
        searchRegex = new RegExp(pattern, matchCase ? 'g' : 'gi');
      }
    } catch (e: any) {
      setRegexError(e.message);
      return []; // Invalid regex
    }

    project.files.forEach(file => {
      // Skip binary files or very large files if needed (simple heuristic)
      if (file.content.length > 500000) return; 

      const lines = file.content.split('\n');
      const matches: { line: number; content: string; index: number }[] = [];
      
      lines.forEach((lineContent, lineIndex) => {
        // Skip extremely long lines to prevent UI freezing
        if (lineContent.length > 1000) return;

        searchRegex!.lastIndex = 0; // Reset regex state
        const match = searchRegex!.exec(lineContent);
        
        if (match) {
            // Truncate content for display if too long
            let displayContent = lineContent.trim();
            if (displayContent.length > 100) {
                const matchIndex = displayContent.indexOf(match[0]);
                const start = Math.max(0, matchIndex - 20);
                const end = Math.min(displayContent.length, matchIndex + match[0].length + 40);
                displayContent = (start > 0 ? '...' : '') + displayContent.substring(start, end) + (end < displayContent.length ? '...' : '');
            }

            matches.push({
                line: lineIndex + 1,
                content: displayContent,
                index: match.index
            });
        }
      });

      if (matches.length > 0) {
        searchResults.push({ path: file.path, matches });
      }
    });

    return searchResults;
  }, [project, query, matchCase, useRegex, matchWholeWord]);

  const toggleExpand = (path: string) => {
    const newExpanded = new Set(expandedFiles);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFiles(newExpanded);
  };

  return (
    <div className="flex flex-col h-full bg-[var(--bg-secondary)] border-r border-[var(--border-color)] w-64 shrink-0">
      <div className="p-3 border-b border-[var(--border-color)] flex justify-between items-center">
        <h3 className="text-sm font-semibold tracking-wider uppercase flex items-center gap-2">
          <Search size={14} /> Search
        </h3>
        <button onClick={onClose} className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)]" title="Close Search">
          <X size={14} />
        </button>
      </div>

      <div className="p-3 border-b border-[var(--border-color)] flex flex-col gap-2">
        <div className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Search in files..."
            className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md pl-2 pr-16 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            autoFocus
          />
          <div className="absolute right-2 flex items-center gap-1">
            <button 
              onClick={() => setMatchCase(!matchCase)}
              className={`p-0.5 rounded text-[10px] font-bold ${matchCase ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Match Case"
            >
              Aa
            </button>
            <button 
              onClick={() => setMatchWholeWord(!matchWholeWord)}
              className={`p-0.5 rounded text-[10px] font-bold ${matchWholeWord ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Match Whole Word"
            >
              <Type size={12} />
            </button>
            <button 
              onClick={() => setUseRegex(!useRegex)}
              className={`p-0.5 rounded text-[10px] font-bold ${useRegex ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Use Regular Expression"
            >
              .*
            </button>
            <button 
              onClick={() => setShowReplace(!showReplace)}
              className={`p-0.5 rounded text-[10px] font-bold ${showReplace ? 'bg-blue-500/20 text-blue-400' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title="Toggle Replace"
            >
              <ChevronDown size={12} className={showReplace ? '' : '-rotate-90'} />
            </button>
          </div>
        </div>

        {regexError && (
            <div className="mt-2 px-2 py-1 bg-red-500/10 border border-red-500/20 rounded text-[10px] text-red-400 font-mono break-all">
                {regexError}
            </div>
        )}
        {showReplace && (
          <div className="flex flex-col gap-2 animate-in slide-in-from-top-1 duration-200">
            <input
              type="text"
              value={replaceQuery}
              onChange={(e) => setReplaceQuery(e.target.value)}
              placeholder="Replace with..."
              className="w-full bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-md px-2 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-blue-500"
            />
            <button 
              disabled={!query || results.length === 0}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-[10px] font-bold py-1.5 rounded transition-colors"
              onClick={() => {
                if (onReplaceAll) {
                  onReplaceAll(query, replaceQuery, matchCase, useRegex);
                }
              }}
            >
              Replace All
            </button>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {query && results.length === 0 ? (
          <div className="text-center text-xs text-[var(--text-secondary)] mt-4">
            No results found.
          </div>
        ) : (
          <div className="space-y-1">
            {results.map(result => {
              const isExpanded = expandedFiles.has(result.path) || query.length > 2;
              return (
                <div key={result.path} className="text-xs font-mono">
                  <div 
                    className="flex items-center gap-1 p-1 hover:bg-[var(--bg-tertiary)] rounded cursor-pointer text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    onClick={() => toggleExpand(result.path)}
                  >
                    {isExpanded ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
                    <FileText size={12} className="text-blue-400" />
                    <span className="truncate flex-1">{result.path.split('/').pop()}</span>
                    <span className="bg-[var(--bg-primary)] px-1.5 rounded-full text-[9px]">{result.matches.length}</span>
                  </div>
                  
                  {isExpanded && (
                    <div className="ml-4 border-l border-[var(--border-color)] pl-2 space-y-0.5 mt-0.5">
                      {result.matches.map((match, idx) => (
                        <div 
                          key={idx}
                          className="flex items-start gap-2 p-1 hover:bg-blue-500/10 rounded cursor-pointer text-[10px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                          onClick={() => onSelectFile(result.path, match.line)}
                        >
                          <span className="text-gray-500 w-6 text-right shrink-0">{match.line}</span>
                          <span className="truncate" title={match.content}>{match.content}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
