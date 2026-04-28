 
import { useState, useCallback } from 'react';
import { BrowserHistoryItem, BrowserBookmark } from '../types';

export function useBrowserHistory() {
  const [history, setHistory] = useState<BrowserHistoryItem[]>([]);
  const [bookmarks, setBookmarks] = useState<BrowserBookmark[]>([]);

  const addToHistory = useCallback((url: string, title: string) => {
    setHistory(prev => [{
      id: `hist-${Date.now()}`,
      url,
      title,
      timestamp: Date.now()
    }, ...prev]);
  }, []);

  const addBookmark = useCallback((url: string, title: string) => {
    setBookmarks(prev => [...prev, {
      id: `book-${Date.now()}`,
      url,
      title,
      timestamp: Date.now()
    }]);
  }, []);

  const removeBookmark = useCallback((id: string) => {
    setBookmarks(prev => prev.filter(b => b.id !== id));
  }, []);

  const isBookmarked = useCallback((url: string) => {
    return bookmarks.some(b => b.url === url);
  }, [bookmarks]);

  return {
    history,
    bookmarks,
    addToHistory,
    addBookmark,
    removeBookmark,
    isBookmarked
  };
}
