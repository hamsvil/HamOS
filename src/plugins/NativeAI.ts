import { nativeBridge } from '../utils/nativeBridge';

export interface NativeAIPlugin {
  loadModel(options: { modelPath: string; useGpu?: boolean; maxMemoryGB?: number; contextWindow?: number }): Promise<{ success: boolean; message: string }>;
  unloadModel(): Promise<{ success: boolean }>;
  generateCompletion(options: { 
    prompt: string; 
    maxTokens?: number; 
    temperature?: number;
    stopSequences?: string[];
  }): Promise<{ text: string; usage: { prompt: number; completion: number } }>;
  streamCompletion(
    options: { prompt: string; maxTokens?: number; temperature?: number }, 
    callback: (data: { token: string; done: boolean }) => void
  ): Promise<string>;
  startBackgroundService(): Promise<{ success: boolean }>;
  downloadModel(options: { url: string; filename: string }): Promise<{ success: boolean; path: string }>;
  cleanupMemory(): Promise<{ success: boolean }>;
}

export const NativeAI: NativeAIPlugin = {
  loadModel: async (options) => nativeBridge.call('loadModel', options) || { success: false, message: 'Bridge unavailable' },
  unloadModel: async () => nativeBridge.call('unloadModel') || { success: false },
  generateCompletion: async (options) => nativeBridge.call('generateCompletion', options) || { text: '', usage: { prompt: 0, completion: 0 } },
  streamCompletion: async (options, callback) => {
    // Note: Streaming requires a more complex bridge mechanism. 
    // For now, we assume the native side handles the callback via a global function.
    (window as any).nativeAICallback = callback;
    return nativeBridge.call('streamCompletion', options) || '';
  },
  startBackgroundService: async () => nativeBridge.call('startBackgroundService') || { success: false },
  downloadModel: async (options) => nativeBridge.call('downloadModel', options) || { success: false, path: '' },
  cleanupMemory: async () => {
    if ((performance as any).memory && (performance as any).memory.usedJSHeapSize > 500 * 1024 * 1024) {
      console.warn("High memory usage detected, cleaning up...");
    }
    return nativeBridge.call('cleanupMemory', {}) || { success: false };
  },
};
