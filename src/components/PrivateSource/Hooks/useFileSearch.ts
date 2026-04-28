 
import { useState, useCallback, useEffect } from 'react';
import { useToast } from '../../../context/ToastContext';
import { db } from '../../../services/db';

export function useFileSearch(apiCall: (endpoint: string, body: any) => Promise<any>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [searchHistory, setSearchHistory] = useState<string[]>([]);
  const [showSearchHistory, setShowSearchHistory] = useState(false);
  const [searchMode, setSearchMode] = useState<'name' | 'content'>('name');
  const [contentSearchResults, setContentSearchResults] = useState<string[]>([]);
  const [contentSnippets, setContentSnippets] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    const loadHistory = async () => {
      const history = await db.searchHistory.orderBy('timestamp').reverse().limit(10).toArray();
      setSearchHistory(history.map(h => h.query));
    };
    loadHistory();
  }, []);

  const addToHistory = async (query: string) => {
    if (!query.trim()) return;
    await db.searchHistory.put({ query, timestamp: Date.now() });
    const history = await db.searchHistory.orderBy('timestamp').reverse().limit(10).toArray();
    setSearchHistory(history.map(h => h.query));
  };

  const clearHistory = async () => {
    await db.searchHistory.clear();
    setSearchHistory([]);
  };

  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchQuery), 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  useEffect(() => {
    const q = debouncedSearch;
    if (searchMode === 'content' && q.length > 2) {
      setLoading(true);
      apiCall('search', { query: q, mode: 'content' })
        .then(data => {
          setContentSearchResults(data.files || []);
          const snippetsMap: Record<string, string> = {};
          if (data.snippets) {
            data.snippets.forEach((s: any) => {
              snippetsMap[s.file] = s.snippet;
            });
          }
          setContentSnippets(snippetsMap);
        })
        .catch(() => {
          showToast('Content search failed. Falling back to name search.', 'warning');
          setSearchMode('name');
        })
        .finally(() => setLoading(false));
    } else {
      setContentSearchResults([]);
      setContentSnippets({});
    }
  }, [debouncedSearch, searchMode, apiCall, showToast]);

  const handleSearch = useCallback(async (q: string) => {
    setSearchQuery(q);
    setShowSearchHistory(true);
    if (q.trim()) addToHistory(q);
  }, []);

  const toggleSearchMode = useCallback(() => {
    setSearchMode(prev => prev === 'name' ? 'content' : 'name');
    setContentSearchResults([]);
    setContentSnippets({});
  }, []);

  return {
    searchQuery,
    setSearchQuery,
    debouncedSearch,
    searchHistory,
    setSearchHistory,
    clearHistory,
    showSearchHistory,
    setShowSearchHistory,
    searchMode,
    setSearchMode,
    contentSearchResults,
    contentSnippets,
    loading,
    handleSearch,
    toggleSearchMode
  };
}
