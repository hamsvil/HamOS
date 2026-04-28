export interface GenerationRequest {
  prompt: string;
  type: 'video' | 'audio' | 'voice';
  options?: Record<string, any>;
}

export interface GenerationResult {
  id: string;
  type: string;
  url: string;
  status: 'processing' | 'completed' | 'failed';
}
