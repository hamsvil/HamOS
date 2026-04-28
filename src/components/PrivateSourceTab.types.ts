export interface FileItem {
  id?: string;
  name: string;
  isDirectory: boolean;
  path: string;
  size: number;
  modifiedAt: number;
  tags?: string[];
  owner?: string;
  isEncrypted?: boolean;
  syncStatus?: 'synced' | 'syncing' | 'error' | 'offline';
  isFavorite?: boolean;
}

export interface EditingFile {
  path: string;
  content: string;
}

export interface PreviewFile {
  path: string;
  content: string;
}

export interface ContextMenuState {
  x: number;
  y: number;
  item: FileItem;
}
