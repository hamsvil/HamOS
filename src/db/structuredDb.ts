 
import Dexie, { Table } from 'dexie';
import { ProjectData, ChatMessageData } from '../components/HamAiStudio/types';

export interface FileMetadata {
  id?: number;
  path: string;
  name: string;
  type: string;
  size: number;
  lastModified: number;
  projectId: string;
}

export interface BrowserHistory {
  id?: number;
  url: string;
  title: string;
  timestamp: number;
}

export interface BrowserBookmark {
  id?: number;
  url: string;
  title: string;
  timestamp: number;
}

export interface ProjectRecord {
  id: string;
  timestamp: number;
  name: string;
  data: ProjectData;
  chatHistory: ChatMessageData[];
}

export interface ProjectSnapshot {
  id?: number;
  projectId: string;
  timestamp: number;
  data: ProjectData;
}

export interface MemoryEntry {
  id: string;
  type: string;
  content: string;
  timestamp: number;
}

export interface BrowserTabRecord {
  id: string;
  url: string;
  title: string;
  isLoading: boolean;
  history: string[];
  historyIndex: number;
  lastAccessed: number;
  isPinned: boolean;
  groupId: string | null;
  reloadKey?: number;
  zoomLevel?: number;
  isReaderMode?: boolean;
}

export interface StorageItem {
  key: string;
  value: string;
}

export interface BrowserCookie {
  id?: number;
  name: string;
  value: string;
  domain: string;
  path: string;
  expires?: number;
  secure: boolean;
  httpOnly: boolean;
  sameSite: string;
  timestamp: number;
}

export class StructuredDatabase extends Dexie {
  fileMetadata!: Table<FileMetadata>;
  browserHistory!: Table<BrowserHistory>;
  browserBookmarks!: Table<BrowserBookmark>;
  projects!: Table<ProjectRecord, string>;
  projectSnapshots!: Table<ProjectSnapshot, number>;
  staticMemory!: Table<MemoryEntry, string>;
  dynamicMemory!: Table<MemoryEntry, string>;
  browserTabs!: Table<BrowserTabRecord, string>;
  safeStorage!: Table<StorageItem, string>;
  browserCookies!: Table<BrowserCookie>;
  knowledge!: Table<{ id: string; targetId: string; intent: string; consequences: string[]; timestamp: number; author: string }>;

  constructor() {
    super('HamOS_StructuredData');
    this.version(8).stores({
      fileMetadata: '++id, path, name, type, projectId', // Primary key and indexed props
      browserHistory: '++id, url, timestamp',
      browserBookmarks: '++id, url, timestamp',
      projects: 'id, name, timestamp',
      projectSnapshots: '++id, projectId, timestamp',
      staticMemory: 'id, type, timestamp',
      dynamicMemory: 'id, type, timestamp',
      browserTabs: 'id, lastAccessed',
      safeStorage: 'key',
      browserCookies: '++id, name, domain, timestamp',
      knowledge: 'id, targetId, timestamp'
    });
  }
}

export const structuredDb = new StructuredDatabase();
