export interface FileItem {
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
