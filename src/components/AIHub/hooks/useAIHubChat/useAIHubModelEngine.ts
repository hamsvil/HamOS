 
import { Modality, ThinkingLevel } from '@google/genai';
import { geminiKeyManager } from '../../../../services/geminiKeyManager';
import { webLlmService } from '../../../../services/webLlmService';
import { EnvironmentChecker } from '../../../../services/environmentChecker';
import { nativeBridge } from '../../../../utils/nativeBridge';
import { massiveDb } from '../../../../db/massiveDb';
import { safeStorage } from '../../../../utils/storage';
import { CLONES } from '../../../../constants/aiClones';
import { GLOBAL_AI_CAPABILITIES } from '../../../../config/aiCapabilities';
import { buildSystemInstruction } from '../../../../utils/aiGenerationUtils';
import { ChatMessage, FileAttachment } from '../../../../types/ai';

interface ModelEngineContext {
  history: ChatMessage[];
  activeClone: typeof CLONES[0];
  currentSessionId: string;
  allInstructions: string;
  setLoadingProgress: (val: { progress: number; text: string } | null) => void;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
}

export const executeModelRequest = async (
  ctx: ModelEngineContext,
  clone: typeof CLONES[0], 
  userMsg: string, 
  systemInstruction: string, 
  files: FileAttachment[] = [], 
  onUpdate?: (text: string) => void, 
  retries: string[] = [], 
  abortSignal?: AbortSignal
): Promise<{ text: string, image: string, audio: string, video: string }> => {
  const { history, activeClone, currentSessionId, allInstructions, setLoadingProgress, showToast } = ctx;

  // Native Android AI Request
  if (EnvironmentChecker.isNativeAndroid() && clone.provider === 'gemini' && !['image', 'audio', 'tts', 'live', 'video_gen'].includes(clone.id)) {
      return new Promise((resolve, reject) => {
          const callbackId = `ai_${Date.now()}`;
          (window as any).onAIResponse = (id: string, response: string) => {
              if (id === callbackId) {
                  delete (window as any).onAIResponse;
                  delete (window as any).onAIError;
                  resolve({ text: response, image: '', audio: '', video: '' });
              }
          };
          (window as any).onAIError = (id: string, error: string) => {
              if (id === callbackId) {
                  delete (window as any).onAIResponse;
                  delete (window as any).onAIError;
                  reject(new Error(error));
              }
          };
          
          const historyJson = JSON.stringify([
            ...history.map(h => ({ role: h.role === 'user' ? 'user' : 'model', parts: [{ text: h.content }] })),
            { role: 'user', parts: [{ text: userMsg }] }
          ]);
          
          nativeBridge.call('Android', 'processAI', historyJson, clone.model, 8192, callbackId);
      });
  }

  const singularityPrompt = buildSystemInstruction(null, 'general', '', allInstructions);
  const enhancedSystemInstruction = `${systemInstruction}\n\n${GLOBAL_AI_CAPABILITIES}\n\n${singularityPrompt}\n\n[SYSTEM REMINDER: Terapkan protokol HAM ENGINE APEX V4.0 (ANTI-PANGKAS, ANTI-SIMULASI, ANTI-BLANK SCREEN, READ STRUCTURE, ADVANCED REASONING, HOLOGRAPHIC MEMORY AWARENESS) secara ketat. STATUS: SINGULARITY ACHIEVED (APEX V4.0).]`;
  
  if (clone.provider === 'local') {
    try {
      setLoadingProgress({ progress: 0, text: 'Memuat Otak Lokal...' });
      await webLlmService.init(undefined, (progress: number, text: string) => {
        setLoadingProgress({ progress, text });
      });
      setLoadingProgress(null);
      
      let responseText = "";
      await webLlmService.generate(
        userMsg, 
        "You are Ham Engine (Local Cortex). You are a helpful AI assistant.",
        (text: string) => {
          if (abortSignal?.aborted) throw new Error('Aborted');
          responseText = text;
          if (onUpdate) onUpdate(text);
        }
      );
      
      return { text: responseText, image: '', audio: '', video: '' };
    } catch (err: any) {
      setLoadingProgress(null);
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new Error(`Gagal memuat Otak Lokal: ${errorMessage}. Pastikan Anda sudah mengunduh model di Pengaturan.`, { cause: err });
    }
  }

  try {
    let responseText = '';
    let imageUrl = '';
    let audioUrl = '';
    let videoUrl = '';

    if (clone.provider === 'gemini') {
        if (clone.id === 'image') {
          const res = await geminiKeyManager.executeWithRetry(async (client) => {
            try {
              const result = await client.models.generateContent({
                model: clone.model,
                contents: [{ role: 'user', parts: [{ text: userMsg }] }]
              });
              return result;
            } catch (e: any) {
              if (e.status === 404 || e.message?.includes('404')) {
                console.warn(`Model ${clone.model} not found (404). Falling back to gemini-2.5-flash.`);
                const result = await client.models.generateContent({
                  model: 'gemini-2.5-flash',
                  contents: [{ role: 'user', parts: [{ text: userMsg }] }]
                });
                return result;
              }
              throw e;
            }
          }, 600000, abortSignal);
          for (const part of res.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
              imageUrl = `data:image/png;base64,${part.inlineData.data}`;
            } else if (part.text) {
              responseText += part.text;
              if (onUpdate) onUpdate(responseText);
            }
          }
        } else if (clone.id === 'tts') {
          const promptText = userMsg;
          const res = await geminiKeyManager.executeWithRetry(async (client) => {
            const result = await client.models.generateContent({
              model: clone.model,
              config: {
                systemInstruction: enhancedSystemInstruction
              },
              contents: [{ role: 'user', parts: [{ text: promptText }] }]
            });
            return result;
          }, 600000, abortSignal);
          const base64Audio = res.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
          if (base64Audio) {
            audioUrl = `data:audio/mp3;base64,${base64Audio}`;
            responseText = "Audio berhasil di-generate.";
            if (onUpdate) onUpdate(responseText);
          }
        } else if (clone.id === 'music_gen') {
          const promptText = userMsg;
          let audioBase64 = "";
          let lyrics = "";
          let mimeType = "audio/wav";
          
          await geminiKeyManager.executeWithRetry(async (client) => {
            const responseStream = await client.models.generateContentStream({
              model: clone.model,
              contents: [{ role: 'user', parts: [{ text: promptText }] }]
            });
            
            for await (const chunk of responseStream) {
              if (abortSignal?.aborted) throw new Error('Aborted');
              const parts = chunk.candidates?.[0]?.content?.parts;
              if (!parts) continue;
              for (const part of parts) {
                if (part.inlineData?.data) {
                  if (!audioBase64 && part.inlineData.mimeType) {
                    mimeType = part.inlineData.mimeType;
                  }
                  audioBase64 += part.inlineData.data;
                }
                if (part.text && !lyrics) {
                  lyrics = part.text;
                  responseText += lyrics;
                  if (onUpdate) onUpdate(responseText);
                }
              }
            }
          }, 600000, abortSignal);
          
          if (audioBase64) {
            audioUrl = `data:${mimeType};base64,${audioBase64}`;
            if (!responseText) {
              responseText = "Musik berhasil di-generate.";
              if (onUpdate) onUpdate(responseText);
            }
          }
        } else if (clone.id === 'video_gen') {
          if (onUpdate) onUpdate("Sedang merender video (proses ini memakan waktu beberapa menit)...");
          
          const pendingOpKey = `pending_video_op_${currentSessionId}`;
          const savedOpName = safeStorage.getItem(pendingOpKey);
          let operation: any;

          if (savedOpName) {
            if (onUpdate) onUpdate("Melanjutkan proses render video yang tertunda...");
            operation = { name: savedOpName };
          } else {
            operation = await geminiKeyManager.executeWithRetry(async (client) => {
              return await (client as any).models.generateVideos({
                model: clone.model,
                prompt: userMsg,
                config: {
                  numberOfVideos: 1,
                  resolution: userMsg.includes('1080p') ? '1080p' : '720p',
                  aspectRatio: '16:9'
                }
              });
            }, 600000, abortSignal);
            if (operation.name) {
              safeStorage.setItem(pendingOpKey, operation.name);
            }
          }
          
          while (!operation.done) {
            if (abortSignal?.aborted) throw new Error('Aborted');
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await geminiKeyManager.executeWithRetry(async (client) => {
              // @ts-ignore
              return await client.models.getVideosOperation(operation.name);
            }, 600000, abortSignal);
          }
          
          safeStorage.removeItem(pendingOpKey);
          
          const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
          if (downloadLink) {
            const apiKey = geminiKeyManager.getApiKey();
            const videoRes = await fetch(downloadLink, {
              method: 'GET',
              headers: { 'x-goog-api-key': apiKey || '' },
            });
            const videoBlob = await videoRes.blob();
            const reader = new FileReader();
            videoUrl = await new Promise((resolve) => {
              reader.onloadend = () => resolve(reader.result as string);
              reader.readAsDataURL(videoBlob);
            });
            responseText = "Video berhasil di-generate.";
            if (onUpdate) onUpdate(responseText);
          } else if (operation.error) {
             throw new Error(`Video generation failed: ${operation.error.message || 'Unknown error'}`);
          }
        } else {
          const config: any = { systemInstruction: enhancedSystemInstruction };
          if (clone.tools) config.tools = clone.tools;
          
          if (clone.thinking && (clone.model.includes('gemini-3') || clone.model.includes('gemini-2.5'))) {
            config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
          }
          
          const parts: any[] = [{ text: userMsg }];
          files.forEach(f => {
            parts.push({
              inlineData: {
                data: f.data.split(',')[1],
                mimeType: f.mimeType
              }
            });
          });

          const stream = await geminiKeyManager.executeWithRetry(async (client) => {
            try {
              return await client.models.generateContentStream({
                model: clone.model,
                config: {
                  systemInstruction: enhancedSystemInstruction,
                  tools: clone.tools ? (clone.tools as any) : undefined
                },
                contents: [{ role: 'user', parts }],
              });
            } catch (e: any) {
              if (e.status === 404 || e.message?.includes('404')) {
                console.warn(`Model ${clone.model} not found (404). Falling back to gemini-2.5-flash.`);
                return await client.models.generateContentStream({
                  model: 'gemini-2.5-flash',
                  config: {
                    systemInstruction: enhancedSystemInstruction
                  },
                  contents: [{ role: 'user', parts }],
                });
              }
              throw e;
            }
          }, 600000, abortSignal);

          let thoughtText = '';
          for await (const chunk of stream) {
            if (abortSignal?.aborted) throw new Error('Aborted');
            
            const thoughtPart = chunk.candidates?.[0]?.content?.parts?.find((p: any) => p.thought);
            if (thoughtPart?.thought) {
              thoughtText += thoughtPart.thought;
              if (onUpdate) onUpdate(`<thought>${thoughtText}</thought>${responseText}`);
            }

            const text = chunk.text || '';
            responseText += text;
            if (onUpdate) onUpdate(thoughtText ? `<thought>${thoughtText}</thought>${responseText}` : responseText);
          }
        }
      }

      return { text: responseText, image: imageUrl, audio: audioUrl, video: videoUrl };

    } catch (error: any) {
      console.error(`Model ${clone.model} failed:`, error);
      const errorMsg = error.message || String(error);
      
      if (errorMsg.includes('database') || errorMsg.includes('SQLITE') || errorMsg.includes('massiveDb')) {
        showToast('Mendeteksi anomali database. Menjalankan Self-Healing...', 'warning');
        try {
          await massiveDb.init();
        } catch (_e) {}
      }

      const isAuthError = errorMsg.includes('API_KEY_INVALID') || errorMsg.includes('API_KEY_MISSING') || errorMsg.includes('API key');
      const isNetworkError = errorMsg.includes('Failed to fetch') || errorMsg.includes('network') || errorMsg.includes('timed out');

      if (!isAuthError && !isNetworkError) {
          const availableModels = CLONES.filter(c => !retries.includes(c.id) && c.id !== clone.id && !['image', 'audio', 'tts', 'live'].includes(c.id));
          
          if (availableModels.length > 0) {
            const currentIndex = availableModels.findIndex(c => c.model === activeClone.model);
            const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % availableModels.length;
            const nextModel = availableModels[nextIndex];
            return executeModelRequest(ctx, nextModel, userMsg, systemInstruction, files, onUpdate, [...retries, clone.id], abortSignal);
          }
      }
      
      throw error;
    }
};
