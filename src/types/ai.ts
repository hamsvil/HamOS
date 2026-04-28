import { CitationSource } from '../components/AIHub/Citation';

export interface FileAttachment {
  name: string;
  data: string;
  mimeType: string;
}

export interface ChatMessage {
  id?: string | number;
  role: 'user' | 'ai';
  content: string;
  image?: string;
  audio?: string;
  video?: string;
  files?: FileAttachment[];
  citations?: CitationSource[];
  timestamp: number;
  sessionId: string;
}

export interface ChatSession {
  id: string;
  title: string;
  timestamp: number;
}

export interface SelectedFile {
  file: File;
  base64: string;
  type: string;
}
