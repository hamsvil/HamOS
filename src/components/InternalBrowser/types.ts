export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  history: string[]; 
  historyIndex: number;
  lastAccessed: number;
  isPinned: boolean;
  groupId: string | null;
  reloadKey?: number;
  zoomLevel?: number;
  isReaderMode?: boolean;
  error?: string | null;
  errorDetail?: string | null;
}

export interface BrowserExtension {
  id: string;
  name: string;
  description: string;
  version: string;
  enabled: boolean;
  permissions: string[];
}

export interface BrowserHistoryItem {
  id: string;
  url: string;
  title: string;
  timestamp: number;
  favicon?: string;
}

export interface BrowserBookmark {
  id: string;
  url: string;
  title: string;
  folder?: string;
  timestamp: number;
}

export interface BrowserSettings {
  searchEngine: 'google' | 'bing' | 'duckduckgo' | 'startpage';
  homePage: string;
  theme: 'dark' | 'light' | 'system';
  blockAds: boolean; // Simulasi
  doNotTrack: boolean;
}

export const DEFAULT_SETTINGS: BrowserSettings = {
  searchEngine: 'google',
  homePage: 'https://www.google.com/webhp?igu=1', // Google iframe friendly URL
  theme: 'dark',
  blockAds: true,
  doNotTrack: true
};
