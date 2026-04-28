export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'thought';
  content: string;
  timestamp: number;
  isCommand?: boolean;
}

export interface FileItem {
  id: string;
  name: string;
  type: 'file' | 'directory';
  size?: number;
  mimeType?: string;
  lastModified: number;
  modifiedAt?: number;
  parentId: string | null;
  path: string;
  content?: string;
  isLocked?: boolean;
  isEncrypted?: boolean;
  tags?: string[];
  metadata?: Record<string, any>;
  isDirectory?: boolean;
  owner?: string;
  ownerAvatar?: string;
  syncStatus?: 'synced' | 'syncing' | 'error';
  snippet?: string;
}

export interface FileVersion {
  id: string;
  fileId: string;
  version: number;
  timestamp: number;
  date?: number;
  author: string;
  changes: string;
  size: number;
}

export interface FileComment {
  id: string;
  fileId: string;
  author: string;
  user?: string;
  content: string;
  text?: string;
  timestamp: number;
  date?: number;
  replies?: FileComment[];
}

export interface FileActivity {
  id: string;
  fileId: string;
  type: 'create' | 'update' | 'delete' | 'move' | 'rename' | 'lock' | 'unlock';
  action?: string;
  user: string;
  timestamp: number;
  date?: number;
  details?: string;
}
