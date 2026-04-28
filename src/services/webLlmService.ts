/* eslint-disable no-useless-assignment */
import { NativeAI } from '../plugins/NativeAI';
import { NativeStorage } from '../plugins/NativeStorage';
import { safeStorage } from '../utils/storage';

// Interface for AI Service
export interface AIService {
  init(modelPath?: string, onProgress?: (progress: number, text: string) => void): Promise<void>;
  generate(prompt: string, systemPrompt?: string, onStream?: (text: string) => void): Promise<string>;
  isReady(): boolean;
}

class NativeAIService implements AIService {
  private ready = false;
  private memoryThreshold = 0.85; // 85%
  private isWebGPUSupported = false;

  constructor() {
      this.checkWebGPUSupport();
  }

  private async checkWebGPUSupport() {
      if ('gpu' in navigator) {
          try {
              const adapter = await (navigator as unknown as { gpu: { requestAdapter: () => Promise<unknown> } }).gpu.requestAdapter();
              this.isWebGPUSupported = !!adapter;
          } catch (e) {
              this.isWebGPUSupported = false;
          }
      } else {
          this.isWebGPUSupported = false;
      }
  }

  private async checkMemory() {
    const ramLimitStr = safeStorage.getItem('ham_ai_ram_limit') || '2';
    const ramLimitGB = Math.max(1, parseInt(ramLimitStr) || 2);
    const ramLimitBytes = ramLimitGB * 1024 * 1024 * 1024;
    
    if ((performance as unknown as { memory?: { usedJSHeapSize: number, jsHeapSizeLimit: number } }).memory) {
      const mem = (performance as unknown as { memory: { usedJSHeapSize: number, jsHeapSizeLimit: number } }).memory;
      const used = mem.usedJSHeapSize;
      
      // Use the lower of the two: 85% of limit or the user-defined RAM limit
      const effectiveLimit = Math.min(mem.jsHeapSizeLimit * this.memoryThreshold, ramLimitBytes);
      
      if (used > effectiveLimit) {
        await NativeAI.cleanupMemory();
      }
    }
  }

  async init(modelPath?: string, onProgress?: (progress: number, text: string) => void): Promise<void> {
    try {
      // WEBLLM GRACEFUL DEGRADATION
      if (!this.isWebGPUSupported) {
          onProgress?.(100, "WebGPU missing. Switching to Cloud AI.");
          // We don't throw here to allow the app to continue, but we mark ready as false for local generation
          // The UI should check isReady() or handle the error in generate()
          this.ready = false;
          return;
      }

      // Request persistent storage to prevent model eviction
      if (navigator.storage && navigator.storage.persist) {
        await navigator.storage.persist();
      }

      onProgress?.(10, "Initializing Native AI Bridge...");
      
      // Start Background Service for AI
      onProgress?.(20, "Starting AI Background Service...");
      await NativeAI.startBackgroundService();
      
      // Check for local model path from device
      const localModelPath = safeStorage.getItem('quantum_local_model_path');
      const selectedModel = safeStorage.getItem('quantum_selected_model') || 'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC';
      
      let finalModelPath = modelPath || localModelPath || selectedModel;
      
      // Check/Download Model if not local
      if (!localModelPath && !modelPath) {
          const modelName = selectedModel.includes('.gguf') ? selectedModel : `${selectedModel}.gguf`;
          const exists = await NativeStorage.exists({ path: modelName });
          if (!exists.exists) {
              onProgress?.(30, `Downloading ${selectedModel} (This may take a while)...`);
              
              // Robust URL construction
              let modelUrl = '';
              if (selectedModel.startsWith('http')) {
                  modelUrl = selectedModel;
              } else {
                  // Default to Hugging Face MLC repository
                  modelUrl = `https://huggingface.co/mlc-ai/mlc-chat-${selectedModel}/resolve/main/params/params.gguf`;
                  
                  // Fallback for GGUF specific repo if needed
                  if (selectedModel.includes('GGUF')) {
                      modelUrl = `https://huggingface.co/TheBloke/${selectedModel}-GGUF/resolve/main/${modelName}`;
                  }
              }
              
              await NativeAI.downloadModel({ url: modelUrl, filename: modelName });
          }
          finalModelPath = modelName;
      }

      // Phase 5: Dynamic RAM Allocation (Anti-OOM Protocol)
      let deviceRam = 4; // Default safe assumption
      if ((navigator as unknown as { deviceMemory?: number }).deviceMemory) {
        deviceRam = (navigator as unknown as { deviceMemory: number }).deviceMemory;
      }
      
      const ramLimitStr = safeStorage.getItem('ham_ai_ram_limit');
      // If user set a limit, respect it but cap it at deviceRam. If not, use 50% of device RAM (min 1GB).
      const ramLimitGB = ramLimitStr 
        ? Math.min(Math.max(1, parseInt(ramLimitStr)), deviceRam) 
        : Math.max(1, Math.floor(deviceRam * 0.5));
        
      // Dynamically calculate context window based on allocated RAM to prevent OOM
      // 1GB ~ 2048 tokens, 2GB ~ 4096 tokens, 4GB+ ~ 8192 tokens
      const dynamicContextWindow = ramLimitGB <= 1 ? 2048 : (ramLimitGB <= 2 ? 4096 : 8192);
      
      onProgress?.(50, `Loading Model into Memory (RAM Limit: ${ramLimitGB}GB, Context: ${dynamicContextWindow} tokens)...`);
      
      // Verify file exists before loading
      const fileCheck = await NativeStorage.exists({ path: finalModelPath });
      if (!fileCheck.exists) {
        throw new Error(`Model file not found at path: ${finalModelPath}. Please check your settings or re-add the model.`);
      }

      // Verify RAM is sufficient (simple check for simulation)
      const stats = await NativeStorage.stat({ path: finalModelPath });
      const fileSizeGB = stats.size / (1024 * 1024 * 1024);
      if (fileSizeGB > ramLimitGB) {
        throw new Error(`RAM Limit (${ramLimitGB}GB) is too low for model size (${fileSizeGB.toFixed(2)}GB). Please increase RAM allocation in settings.`);
      }

      // Yield main thread to allow UI to update before potentially blocking native call
      await new Promise(resolve => setTimeout(resolve, 100));

      // Use a Web Worker or async wrapper if possible, but since we rely on window.Android,
      // we must call it on the main thread. We wrap it in a promise to ensure it doesn't block
      // the immediate execution flow.
      await new Promise<void>((resolve, reject) => {
          setTimeout(async () => {
              try {
                  const result = await NativeAI.loadModel({ 
                    modelPath: finalModelPath, 
                    useGpu: true,
                    maxMemoryGB: ramLimitGB, // Passing RAM limit to native side
                    contextWindow: dynamicContextWindow // Phase 5: Dynamic Context Window
                  });
                  if (result && !result.success) {
                      reject(new Error(result.message || "Native bridge failed to load model"));
                  } else {
                      resolve();
                  }
              } catch (err) {
                  reject(err);
              }
          }, 50);
      });
      
      this.ready = true;
      onProgress?.(100, "Native AI Ready");
    } catch (e: any) {
      // Don't crash the app, just disable local AI
      this.ready = false;
      onProgress?.(100, "Native AI Init Failed. Using Cloud Fallback.");
      // throw new Error(e.message || "Failed to initialize Native AI. Check if model exists or RAM is sufficient.");
    }
  }

  private isGenerating = false;
  private generationQueue: (() => Promise<void>)[] = [];

  private async processQueue() {
      if (this.isGenerating || this.generationQueue.length === 0) return;
      this.isGenerating = true;
      const task = this.generationQueue.shift();
      if (task) {
          try {
              await task();
          } catch (e) {
              // Queue task failed
          }
      }
      this.isGenerating = false;
      this.processQueue();
  }

  async generate(prompt: string, systemPrompt?: string, onStream?: (text: string) => void): Promise<string> {
    if (!this.ready) {
        if (!this.isWebGPUSupported) {
             throw new Error("WebGPU not supported on this device. Please use Cloud AI (Ham Engine/Groq).");
        }
        throw new Error("AI Service not initialized or failed to load.");
    }
    await this.checkMemory();

    const enhancedSystemPrompt = `${systemPrompt ? systemPrompt + '\n' : ''}[SYSTEM REMINDER: Terapkan protokol HAM ENGINE CORE (ANTI-PANGKAS, ANTI-SIMULASI, ANTI-BLANK SCREEN, READ STRUCTURE) secara ketat. STATUS: SINGULARITY ACHIEVED.]\n`;

    return new Promise<string>((resolve, reject) => {
        const task = async () => {
            try {
                // AbortSignal.timeout fallback for older browsers
                const timeoutId = setTimeout(() => {
                    reject(new Error("AI Generation Timeout: The request took too long to complete."));
                }, 120000); // 2 minutes timeout

                let resultText = '';
                if (onStream) {
                  resultText = await NativeAI.streamCompletion({ 
                    prompt: `${enhancedSystemPrompt}${prompt}` 
                  }, (data) => {
                    onStream(data.token);
                  });
                } else {
                  const result = await NativeAI.generateCompletion({ 
                    prompt: `${enhancedSystemPrompt}${prompt}` 
                  });
                  resultText = result.text;
                }
                
                clearTimeout(timeoutId);
                resolve(resultText);
            } catch (e) {
                reject(e);
            }
        };
        
        this.generationQueue.push(task);
        this.processQueue();
    });
  }

  async checkModelCached(): Promise<boolean> {
    const modelName = 'phi-2-orange.gguf';
    const exists = await NativeStorage.exists({ path: modelName });
    return exists.exists;
  }

  isReady(): boolean {
    return this.ready;
  }
}

export const webLlmService = new NativeAIService();
export const checkModelCached = async () => webLlmService.checkModelCached();
