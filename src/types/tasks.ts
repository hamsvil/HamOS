export type TaskType = 
  | 'indexing' | 'parsing' | 'building' | 'syncing' 
  | 'upload' | 'download' | 'zip' | 'unzip' | 'move' | 'copy' | 'delete';

export interface TaskProgress {
  id: string;
  name: string;
  progress: number; // 0-100
  type: TaskType;
  status: 'pending' | 'running' | 'completed' | 'error';
  error?: string;
  createdAt: number;
}

export type BgTaskState = 'idle' | 'loading' | 'success' | 'error';

export interface BgInitStatus {
  vectorStore: BgTaskState;
  webContainer: BgTaskState;
}

export interface UploadStatus {
  id: string;
  file: File | { name: string; size: number; path: string; fullFile: File };
  progress: number;
  status: 'pending' | 'uploading' | 'completed' | 'error' | 'paused';
  error?: string;
  currentChunk?: number;
}
