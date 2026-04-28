/* eslint-disable no-useless-assignment */
/* eslint-disable no-async-promise-executor */
/* eslint-disable no-useless-escape */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { Content, FunctionCall } from '@google/genai';
import { neuralRouter, AIProvider, ModelConfig } from './NeuralRouter';
import { vfs } from './vfsService';
import { lspService } from './lspService';

interface PendingTask {
  resolve: (data: { text: string, groundingMetadata?: any, functionCalls?: FunctionCall[], embeddings?: { values: number[] }[] }) => void;
  reject: (err: Error) => void;
  onChunk?: (chunk: string, groundingMetadata?: any, functionCalls?: FunctionCall[]) => void;
  payload: any;
  provider: AIProvider;
  apiKey: string;
  apiKeys?: Record<string, string>;
  retries: number;
}

export class AiWorkerService {
  private static worker: Worker | null = null;
  private static nextId = 0;
  private static pendingTasks: Map<number, PendingTask> = new Map();
  private static sharedBuffer: SharedArrayBuffer | null = null;
  private static vfsUnsubscribe: (() => void) | null = null;
  private static isRestarting = false;

  static async syncKeys() {
    if (!this.worker) return;
    const apiKeys: Record<string, string> = {};
    
    // Clear exhausted keys so that if the user just updated them, we try them immediately
    neuralRouter.clearExhaustedKeys();
    
    try { apiKeys.gemini = neuralRouter.getApiKey(AIProvider.GEMINI); } catch (e) {}
    
    this.worker.postMessage({ type: 'UPDATE_KEYS', apiKeys, id: -5 });
    // console.log('[AiWorkerService] API Keys synced to worker.');
  }

  static async getWorker() {
    if (!this.worker) {
      this.worker = new Worker(new URL('../workers/ai.worker.ts', import.meta.url), { type: 'module' });
      
      let initialContextString = "";
      try {
          this.sharedBuffer = await vfs.getSharedContextBuffer({ maxLength: 32 * 1024 * 1024 });
      } catch (e) {
          console.warn('[AiWorkerService] Failed to get Shared Context Buffer. Falling back to string context.', e);
          this.sharedBuffer = null;
      }

      const apiKeys: Record<string, string> = {};
      try { apiKeys.gemini = neuralRouter.getApiKey(AIProvider.GEMINI); } catch (e) {}

      if (!this.sharedBuffer) {
          try {
              // [ARCHITECT FIX] Avoid loading the entire project into memory if SAB is unavailable (OOM prevention)
              initialContextString = "--- VFS Snapshot Disabled (SAB unavailable) ---";
          } catch (e) {
              console.error('[AiWorkerService] Failed to generate initial context string.', e);
          }
      }

      this.worker.postMessage({ 
          type: 'INIT', 
          apiKeys, 
          provider: AIProvider.GEMINI,
          payload: { sharedBuffer: this.sharedBuffer, contextString: initialContextString },
          id: -1 
      });

      this.worker.onerror = (err) => {
        console.error('[AiWorkerService] Fatal Worker Error:', err);
        const errorMsg = err.message || 'Unknown worker error';
        console.error(`Syntax or Runtime Error in AI Worker: ${errorMsg}`);
        
        // If the worker crashes (e.g., syntax error in ai.worker.ts), it cannot fix itself.
        // We MUST perform an emergency rollback to restore its brain.
        this.emergencyRollback().catch(console.error);
      };

      // Hot-Swapping: Listen for changes to ai.worker.ts
      if (!this.vfsUnsubscribe) {
        this.vfsUnsubscribe = vfs.subscribe(async (event, path, source) => {
          if (event === 'update' && path === '/src/workers/ai.worker.ts' && source !== 'system-rollback') {
            // console.log('[AiWorkerService] Detected change in ai.worker.ts. Hot-swapping worker...');
            this.restartWorker();
          } else if (typeof SharedArrayBuffer === 'undefined' || !this.sharedBuffer) {
            // Patch context for non-SAB environments
            if (!path.match(/\.(png|jpe?g|gif|svg|ico|woff2?|ttf|eot|mp4|webm|wav|mp3|zip|tar|gz|wasm|jar|pdf|apk|exe|dll|so|class|bin|dat|db|sqlite|mkv|avi|mov|flv|wmv|m4a|flac|ogg|aac|wma|7z|rar|iso|dmg|pkg|deb|rpm|msi|cab|psd|ai|eps|indd|raw|heic|webp|tiff|bmp|obj|fbx|blend|stl|gltf|glb|doc|docx|xls|xlsx|ppt|pptx|epub|mobi)$/i)) {
               try {
                   const content = event === 'delete' ? null : await vfs.readFile(path);
                   this.worker?.postMessage({
                       type: 'PATCH_CONTEXT_STRING',
                       payload: { path, content },
                       id: -4
                   });
               } catch (e) {}
            }
          }
        });
      }

      this.worker.onmessage = (e) => {
        const { id, type, payload, groundingMetadata, functionCalls } = e.data;
        
        if (id === -1 && type === 'READY') {
            // console.log("AI Worker Ready with Shared Context");
            return;
        }

        const task = this.pendingTasks.get(id);
        if (task) {
          if (type === 'CHUNK') {
            task.onChunk?.(payload, groundingMetadata, functionCalls);
          } else if (type === 'CNC_ABORT') {
            console.warn(`[CNC] Aborting stream due to hallucination: ${payload}`);
            // Retry logic for CNC_ABORT
            this.retryTask(id, task, payload);
          } else if (type === 'RETRYING') {
            // console.log(`[Self-Healing] ${payload}`);
            // You could trigger a toast or UI indicator here
          } else if (type === 'LSP_VALIDATE_REQUEST') {
            this.handleLspValidation(id, payload);
          } else if (type === 'DONE' || type === 'RESULT') {
            task.resolve({ text: payload, groundingMetadata, functionCalls });
            this.pendingTasks.delete(id);
          } else if (type === 'ERROR') {
            const error = new Error(typeof payload === 'string' ? payload : payload.message) as Error & { status?: number };
            if (typeof payload === 'object') {
                error.status = payload.status;
            }
            
            const errorMsg = error.message.toLowerCase();
            const isAuthOrQuotaError = error.status === 401 || error.status === 403 || error.status === 429 || 
                                       errorMsg.includes('quota') || 
                                       errorMsg.includes('api key');
                                       
            const isModelError = (error.status === 400 && !isAuthOrQuotaError) || error.status === 404;
                                       
            const isNetworkOrOtherError = !isAuthOrQuotaError && !isModelError && (
                error.status === 500 || error.status === 502 || error.status === 503 || error.status === 504 ||
                errorMsg.includes('network') || errorMsg.includes('fetch') || 
                errorMsg.includes('failed to call') || errorMsg.includes('timeout')
            );
                                       
            if (task.retries < 4 && !isModelError) {
                task.retries++;
                
                if (isAuthOrQuotaError) {
                    console.warn(`[AiWorkerService] Key exhausted for task ${id} (${task.provider}). Rotating key and retrying...`);
                    neuralRouter.markKeyExhausted(task.apiKey);
                    
                    try {
                        const newApiKey = neuralRouter.getApiKey(task.provider);
                        task.apiKey = newApiKey;
                        if (task.apiKeys) {
                            task.apiKeys[task.provider] = newApiKey;
                        } else {
                            task.apiKeys = { [task.provider]: newApiKey };
                        }
                        
                        // Mark as retry to avoid double token consumption
                        task.payload.isRetry = true;
                        
                        // Resend the task to the worker with the new key
                        const msgType = task.onChunk ? 'GENERATE_STREAM' : 'GENERATE_CONTENT';
                        this.worker?.postMessage({ id, type: msgType, payload: task.payload, apiKeys: task.apiKeys, provider: task.provider });
                        return; // Don't reject yet
                    } catch (retryErr: unknown) {
                        const err = retryErr as Error;
                        console.warn(`[AiWorkerService] All keys exhausted for ${task.provider}. Waiting 10s... Error: ${err.message}`);
                        // Wait 10 seconds and try again instead of failing immediately
                        setTimeout(() => {
                            if (!this.pendingTasks.has(id)) return;
                            // Clear exhausted keys to force a retry
                            neuralRouter.clearExhaustedKeys();
                            const msgType = task.onChunk ? 'GENERATE_STREAM' : 'GENERATE_CONTENT';
                            this.worker?.postMessage({ id, type: msgType, payload: task.payload, apiKeys: task.apiKeys || { [task.provider]: task.apiKey }, provider: task.provider });
                        }, 10000);
                        return; // Don't reject yet
                    }
                } else if (isNetworkOrOtherError) {
                    console.warn(`[AiWorkerService] Network/API error for task ${id}. Retrying with same key (Attempt ${task.retries})...`);
                    
                    // Delay before retry (exponential backoff)
                    const delay = 1000 * Math.pow(2, task.retries - 1);
                    setTimeout(() => {
                        if (!this.pendingTasks.has(id)) return; // Task might have been cancelled
                        const msgType = task.onChunk ? 'GENERATE_STREAM' : 'GENERATE_CONTENT';
                        this.worker?.postMessage({ id, type: msgType, payload: task.payload, apiKeys: task.apiKeys || { [task.provider]: task.apiKey }, provider: task.provider });
                    }, delay);
                    return; // Don't reject yet
                }
            }
            
            task.reject(error);
            this.pendingTasks.delete(id);
          }
        }
      };
    }
    return this.worker;
  }

  static async restartWorker() {
    // PROTOKOL FIX: Race-condition guard for concurrent restart calls.
    // If the VFS subscription fires twice in rapid succession (e.g., on a fast-save),
    // two restartWorker() calls could be queued simultaneously. Without the guard they
    // would both terminate the old worker and both call getWorker() — creating two new
    // workers, both receiving messages, with undefined behavior.
    if (this.isRestarting) {
      console.warn('[AiWorkerService] restartWorker called while already restarting. Skipping duplicate restart.');
      return;
    }
    this.isRestarting = true;
    try {
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
      }
      // Reject all pending tasks so they don't hang
      for (const [, task] of this.pendingTasks.entries()) {
        task.reject(new Error('Worker restarted during execution.'));
      }
      this.pendingTasks.clear();
      await this.getWorker();
    } finally {
      this.isRestarting = false;
    }
  }

  static async triggerAutonomousRepair(errorMsg: string, contextInfo: string) {
    console.error(`[Autonomous Repair Triggered] Error: ${errorMsg}`);
    
    // Ensure worker is alive
    await this.getWorker();

    const repairPrompt = `
[CRITICAL SYSTEM FAILURE DETECTED]
You are the internal AI Assistant of Ham AI Studio. A fatal error has occurred in the platform or within your own cognitive systems.
You MUST fix this immediately. Do NOT wait for user instructions.

ERROR DETAILS:
${errorMsg}

CONTEXT INFO:
${contextInfo}

INSTRUCTIONS:
1. Analyze the error and the context.
2. Identify the root cause (e.g., a bug in a service, a hallucination in your previous code, a missing file).
3. Output the COMPLETE fixed code for the offending file(s).
4. You MUST wrap your fixed code in a block like this:
<code path="/src/path/to/file.ts">
// your full code here
</code>
5. Do NOT ask for permission. Execute the fix immediately.
`;

    try {
      // We use generateContent to run the repair task in the background
      const response = await this.generateContent({
        contents: [{ role: 'user', parts: [{ text: repairPrompt }] }],
        config: { systemInstruction: "You are the autonomous self-healing orchestrator. Fix the system immediately. Output full code in <code path='...'> blocks." }
      });
      
      // Parse <code path="..."> blocks
      const codeBlockRegex = /<code\s+path="([^"]+)">([\s\S]*?)<\/code>/g;
      let match;
      let fixedFiles = 0;
      
      while ((match = codeBlockRegex.exec(response.text)) !== null) {
          const filePath = match[1];
          const fileContent = match[2].trim();
          
          if (filePath && fileContent) {
              // console.log(`[Autonomous Repair] Applying fix to ${filePath}...`);
              await vfs.writeFile(filePath, fileContent, 'autonomous-repair');
              fixedFiles++;
          }
      }
      
      if (fixedFiles > 0) {
          // console.log(`[Autonomous Repair] Successfully applied fixes to ${fixedFiles} file(s).`);
          // If we modified a core file, we might need to restart the worker
          this.restartWorker();
      } else {
          console.warn('[Autonomous Repair] AI did not output any <code path="..."> blocks. Repair failed.');
          await this.emergencyRollback();
      }
    } catch (e) {
      console.error('[Autonomous Repair] Repair task failed:', e);
      await this.emergencyRollback();
    }
  }

  private static async emergencyRollback() {
    console.warn('[Emergency Rollback] Attempting to restore core files from backup...');
    const coreFiles = [
      '/src/workers/ai.worker.ts',
      '/src/services/vfsService.ts',
      '/src/services/hamEngine/utils.ts',
      '/src/services/aiWorkerService.ts'
    ];
    for (const file of coreFiles) {
      try {
        const backupPath = `/src/.backup${file}`;
        if (await vfs.exists(backupPath)) {
          const backupContent = await vfs.readFile(backupPath);
          await vfs.writeFile(file, backupContent, 'system-rollback');
          // console.log(`[Emergency Rollback] Restored ${file}`);
        }
      } catch (e) {
        console.error(`[Emergency Rollback] Failed to restore ${file}:`, e);
      }
    }
    await this.restartWorker();
  }

  private static async retryTask(id: number, task: PendingTask, errorMsg: string) {
      const worker = await this.getWorker();
      const apiKey = neuralRouter.getApiKey(task.provider);
      
      // Inject error into contents for self-correction
      const newPayload = { ...task.payload };
      if (typeof newPayload.contents === 'string') {
          newPayload.contents += `\n\n[SYSTEM ERROR: ${errorMsg}. Please correct your code and continue.]`;
      } else if (Array.isArray(newPayload.contents)) {
          newPayload.contents.push({ role: 'user', parts: [{ text: `[SYSTEM ERROR: ${errorMsg}. Please correct your code and continue.]` }] });
      }

      const apiKeys: Record<string, string> = { [task.provider]: apiKey };

      worker?.postMessage({ 
          id, 
          type: 'GENERATE_STREAM', 
          payload: newPayload, 
          apiKeys, 
          provider: task.provider 
      });
  }

  private static async handleLspValidation(id: number, code: string) {
      if (!this.worker) return;
      
      try {
          // 1. Check if LSP is ready
          if (!lspService.isReady()) {
              console.warn('[AiWorkerService] LSP not ready, skipping validation.');
              this.worker.postMessage({ type: 'LSP_VALIDATE_RESPONSE', id, payload: { valid: true } });
              return;
          }

          // 2. Extract file path from code block if possible
          const pathMatch = code.match(/\/\/\s*FILE:\s*([^\n]+)/) || code.match(/<code\s+path="([^"]+)">/);
          const path = pathMatch ? pathMatch[1] : 'temp_ai_validation.tsx';
          
          // 2. Get diagnostics from LSP
          // Note: We don't actually write to VFS here, we just use the LSP's in-memory model if available
          // or we could temporarily write and then delete.
          // For now, we'll assume the LSP can check a string.
          // Since LSPService.getDiagnostics requires a URI, we'll use a temp one.
          
          const diagnostics = lspService.getDiagnostics(); 
          // Filter for errors in the generated code
          const errors = (diagnostics as any[]).filter(d => d.severity === 8 /* MarkerSeverity.Error */);
          
          if (errors.length > 0) {
              const errorMsg = errors.map(e => `${e.message} (line ${e.startLineNumber})`).join('\n');
              this.worker.postMessage({ type: 'LSP_VALIDATE_RESPONSE', id, payload: { valid: false, error: errorMsg } });
          } else {
              this.worker.postMessage({ type: 'LSP_VALIDATE_RESPONSE', id, payload: { valid: true } });
          }
      } catch (e) {
          console.error('[AiWorkerService] LSP Validation failed:', e);
          // Fallback to valid if LSP fails to avoid blocking the AI
          this.worker.postMessage({ type: 'LSP_VALIDATE_RESPONSE', id, payload: { valid: true } });
      }
  }

  static async generateStream(
    payload: any, 
    onChunk: (chunk: string, groundingMetadata?: any, functionCalls?: FunctionCall[]) => void,
    provider: AIProvider = AIProvider.GEMINI
  ): Promise<{ text: string, groundingMetadata?: any, functionCalls?: FunctionCall[] }> {
    const id = this.nextId++;
    const worker = await this.getWorker();
    const apiKeys: Record<string, string> = {};
    try { apiKeys.gemini = neuralRouter.getApiKey(AIProvider.GEMINI); } catch (e) {}

    return new Promise(async (resolve, reject) => {
      const apiKey = apiKeys[provider] || apiKeys.gemini || '';
      this.pendingTasks.set(id, { resolve, reject, onChunk, payload, provider, apiKey, apiKeys, retries: 0 });
      
      try {
          if (apiKey) await neuralRouter.consumeTokens(provider, apiKey, 1, payload.isRetry || false);
      } catch (e) {
          console.warn('[AiWorkerService] Token consumption failed, proceeding anyway:', e);
      }
      
      worker?.postMessage({ id, type: 'GENERATE_STREAM', payload, apiKeys, provider });
    });
  }

  static async generateContent(
    payload: any,
    provider: AIProvider = AIProvider.GEMINI
  ): Promise<{ text: string, groundingMetadata?: any, functionCalls?: FunctionCall[] }> {
    const id = this.nextId++;
    const worker = await this.getWorker();
    const apiKeys: Record<string, string> = {};
    try { apiKeys.gemini = neuralRouter.getApiKey(AIProvider.GEMINI); } catch (e) {}

    return new Promise(async (resolve, reject) => {
      const apiKey = apiKeys[provider] || apiKeys.gemini || '';
      this.pendingTasks.set(id, { resolve, reject, payload, provider, apiKey, apiKeys, retries: 0 });
      
      try {
          if (apiKey) await neuralRouter.consumeTokens(provider, apiKey, 1, payload.isRetry || false);
      } catch (e) {
          console.warn('[AiWorkerService] Token consumption failed, proceeding anyway:', e);
      }
      
      worker?.postMessage({ id, type: 'GENERATE_CONTENT', payload, apiKeys, provider });
    });
  }

  static async embedContent(
    payload: { model?: string, contents: Content[], config?: any }
  ): Promise<{ embeddings?: { values: number[] }[] }> {
    const id = this.nextId++;
    const worker = await this.getWorker();
    const apiKeys: Record<string, string> = {};
    try { apiKeys.gemini = neuralRouter.getApiKey(AIProvider.GEMINI); } catch (e) {}

    return new Promise((resolve, reject) => {
      this.pendingTasks.set(id, { 
        resolve: (data) => resolve({ embeddings: data.embeddings }), 
        reject, 
        payload, 
        provider: AIProvider.GEMINI, 
        apiKey: apiKeys.gemini || '', 
        apiKeys, 
        retries: 0 
      });
      worker?.postMessage({ id, type: 'EMBED_CONTENT', payload, apiKeys, provider: AIProvider.GEMINI });
    });
  }

  private static updateContextTimeout: NodeJS.Timeout | null = null;
  private static lastContextUpdate = 0;
  private static isUpdating = false;

  static async updateContext() {
      if (!this.worker || this.isUpdating) return;
      
      if (this.updateContextTimeout) {
          clearTimeout(this.updateContextTimeout);
      }
      
      // 5s debounce to prevent excessive heavy VFS operations
      this.updateContextTimeout = setTimeout(async () => {
          if (this.isUpdating) return;
          this.isUpdating = true;
          
          try {
              // Only update if at least 10s passed since last update to save resources
              if (Date.now() - this.lastContextUpdate < 10000) {
                  this.isUpdating = false;
                  return;
              }

              if (typeof SharedArrayBuffer === 'undefined' || !this.sharedBuffer) {
                  // Skip full context update for non-SAB environments to prevent Main Thread Stutter.
                  // Context is now patched incrementally via vfs.subscribe.
                  this.isUpdating = false;
                  return;
              }

              const snapshot = await vfs.getProjectSnapshot({ full: true, skipBinary: true });
              const context = snapshot.files
                .filter(f => !f.isBinary && f.content && !f.content.startsWith('[File too large'))
                .map(f => `--- FILE: ${f.path} ---\n${f.content}\n`)
                .join('\n');

              const encoder = new TextEncoder();
              const encoded = encoder.encode(context);
              
              const currentSize = this.sharedBuffer!.byteLength;
              const requiredSize = encoded.byteLength;
              
              // Reallocate if needed
              if (requiredSize > currentSize || (currentSize > 16 * 1024 * 1024 && requiredSize < currentSize / 4)) {
                  const newSize = Math.max(Math.ceil(requiredSize * 1.5), 32 * 1024 * 1024);
                  this.sharedBuffer = new SharedArrayBuffer(newSize);
                  this.worker!.postMessage({ 
                      type: 'UPDATE_SHARED_BUFFER_REF', 
                      payload: { sharedBuffer: this.sharedBuffer },
                      id: -3
                  });
              }
              
              const view = new Uint8Array(this.sharedBuffer!);
              view.fill(0);
              view.set(encoded);
              
              this.worker!.postMessage({ 
                  type: 'SHARED_CONTEXT_UPDATED', 
                  payload: { byteLength: encoded.byteLength },
                  id: -2
              });
              
              this.lastContextUpdate = Date.now();
          } catch (e) {
              console.error('[AiWorkerService] Error updating context:', e);
          } finally {
              this.isUpdating = false;
          }
      }, 5000); 
  }
}
