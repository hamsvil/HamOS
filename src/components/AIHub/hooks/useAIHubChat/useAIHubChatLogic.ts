 
 
import { useState, useRef, useCallback } from 'react';
import { generateUUID } from '../../../../utils/uuid';
import { hamliMemoryService } from '../../../../services/hamliMemoryService';
import { CLONES } from '../../../../constants/aiClones';
import { useAIHubStore } from '../../../../store/aiHubStore';
import { Orchestrator } from '../../../../services/aiHub/core/Orchestrator';
import { executeShellCommand } from '../../../../services/shellService';
import { 
  scrapeUrl, 
  summarizeConversation, 
  buildAIHubSystemInstruction, 
  prepareContextPayloads 
} from './useAIHubChatHelpers';
import { executeModelRequest } from './useAIHubModelEngine';
import { FileAttachment, ChatMessage } from '../../../../types/ai';

interface ChatLogicProps {
  saveMessageToDB: (role: 'user' | 'ai', content: string, image?: string, audio?: string, video?: string, files?: FileAttachment[], timestampOverride?: number, skipStateUpdate?: boolean) => Promise<number | string | void>;
  customInstruction: string;
  allInstructions: string;
  singularityMode: boolean;
  currentSessionId: string;
  showToast: (msg: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  setLoadingProgress: (val: { progress: number; text: string } | null) => void;
  setAbortController: (val: AbortController | null) => void;
  setSummaryContext: (val: string | ((prev: string) => string)) => void;
  abortController: AbortController | null;
}

export function useAIHubChatLogic({
  saveMessageToDB,
  customInstruction,
  allInstructions,
  singularityMode,
  currentSessionId,
  showToast,
  setLoadingProgress,
  setAbortController,
  setSummaryContext,
  abortController
}: ChatLogicProps) {
  const { history, setHistory, setIsLoading, selectedFiles, setSelectedFiles, activeClone, setLastError } = useAIHubStore();
  const isProcessingRef = useRef<boolean>(false);
  const activeMessageRef = useRef<string>('');
  const orchestratorRef = useRef<Orchestrator | null>(null);
  if (!orchestratorRef.current) {
    orchestratorRef.current = new Orchestrator({
      maxTokensBeforeLocal: 8000,
      maxTokensBeforeCompression: 100000,
      circuitBreakerThreshold: 3,
      circuitBreakerResetTimeoutMs: 60000
    });
  }

  const handleSend = async (input: string, setInput: (val: string) => void, isResume: boolean = false) => {
    if (!input.trim() && selectedFiles.length === 0 && !isResume) return;
    
    if (isProcessingRef.current) {
      console.warn('AI Hub: Request already in progress, ignoring duplicate send.');
      return;
    }
    isProcessingRef.current = true;

    const userMsg = input;
    const lowerMsg = userMsg.toLowerCase();
    
    // Intent Detection
    const isMusicRequest = lowerMsg.includes('buatkan musik') || lowerMsg.includes('bikin lagu') || lowerMsg.includes('generate music') || lowerMsg.includes('buat lagu') || lowerMsg.includes('nyanyikan');
    const isImageRequest = lowerMsg.includes('buatkan gambar') || lowerMsg.includes('bikin gambar') || lowerMsg.includes('generate image') || lowerMsg.includes('lukis');
    const isVideoRequest = lowerMsg.includes('buatkan video') || lowerMsg.includes('bikin video') || lowerMsg.includes('generate video');
    const isVoiceRequest = lowerMsg.includes('buatkan suara') || lowerMsg.includes('bikin suara') || lowerMsg.includes('bacakan') || lowerMsg.includes('voice over');

    // Quick Replies for short requests
    if (isMusicRequest && userMsg.length < 50 && !isResume) {
      setInput('');
      await saveMessageToDB('user', userMsg);
      await saveMessageToDB('ai', "Tentu, saya bisa membuatkan musik untuk Anda. Agar hasilnya maksimal, mohon berikan detail berikut:\n1. Genre musik (misal: Pop, Rock, Lo-Fi)\n2. Judul lagu\n3. Lirik (atau sebutkan jika ingin instrumental)\n4. Durasi yang diinginkan");
      isProcessingRef.current = false;
      return;
    }
    if (isImageRequest && userMsg.length < 30 && !isResume) {
      setInput('');
      await saveMessageToDB('user', userMsg);
      await saveMessageToDB('ai', "Tentu, saya bisa membuatkan gambar. Mohon berikan deskripsi yang lebih spesifik mengenai objek, gaya visual (misal: realistis, kartun, 3D), resolusi (misal: 1K, 2K, 4K), dan suasana gambar.");
      isProcessingRef.current = false;
      return;
    }
    if (isVideoRequest && userMsg.length < 30 && !isResume) {
      setInput('');
      await saveMessageToDB('user', userMsg);
      await saveMessageToDB('ai', "Tentu, saya bisa membuatkan video. Mohon berikan deskripsi adegan, gaya visual, dan resolusi (720p atau 1080p) yang Anda inginkan.");
      isProcessingRef.current = false;
      return;
    }
    if (isVoiceRequest && userMsg.length < 30 && !isResume) {
      setInput('');
      await saveMessageToDB('user', userMsg);
      await saveMessageToDB('ai', "Tentu, saya bisa membuatkan suara (Voice Over). Mohon berikan teks yang ingin dibacakan dan gaya suara yang diinginkan.");
      isProcessingRef.current = false;
      return;
    }

    const filesToUpload: FileAttachment[] = selectedFiles.map(f => ({ name: f.file.name, data: f.base64, mimeType: f.type }));
    
    if (!isResume) {
      setInput('');
      setSelectedFiles([]);
      await saveMessageToDB('user', userMsg, undefined, undefined, undefined, filesToUpload);
    }
    
    setIsLoading(true);
    setLoadingProgress({ progress: 10, text: 'Menganalisis Konteks & Intent...' });

    const controller = new AbortController();
    setAbortController(controller);

    const aiTimestamp = Date.now();
    const tempId = generateUUID();

    try {
      setLoadingProgress({ progress: 20, text: 'Orchestrating Quantum Engine...' });
      
      const contextPayloads = prepareContextPayloads(history);
      const orchResult = await orchestratorRef.current!.processRequest(userMsg, contextPayloads as any, singularityMode);
      const { decision, finalContext } = orchResult;
      
      let currentClone = activeClone;
      if (decision.provider === 'local-llm' && !['image', 'audio', 'tts', 'live'].includes(activeClone.id)) {
        currentClone = CLONES.find(c => c.id === 'lite') || currentClone;
      }

      // Clone Switching based on intent
      if (isMusicRequest && userMsg.length >= 50) currentClone = CLONES.find(c => c.id === 'music_gen') || currentClone;
      else if (isImageRequest && userMsg.length >= 30) currentClone = CLONES.find(c => c.id === 'image') || currentClone;
      else if (isVideoRequest && userMsg.length >= 30) currentClone = CLONES.find(c => c.id === 'video_gen') || currentClone;
      else if (isVoiceRequest && userMsg.length >= 30) currentClone = CLONES.find(c => c.id === 'tts') || currentClone;

      setLoadingProgress({ progress: 40, text: 'Mengakses Memori Quantum...' });
      
      let coreMemoryContext = '';
      try {
        const coreMemory = await hamliMemoryService.getMemory();
        if (coreMemory) {
          const staticMem = coreMemory.static.map(m => `- [${m.type}] ${m.content}`).join('\n');
          const dynamicMem = coreMemory.dynamic.map(m => `- [${m.type}] ${m.content}`).join('\n');
          coreMemoryContext = `\n\n=== HAMLI CORE MEMORY (SERVER) ===\nStatic Knowledge:\n${staticMem}\n\nLearned Knowledge:\n${dynamicMem}\n==================================\n`;
        }
      } catch (e) {
        console.warn('Failed to fetch Hamli Core Memory', e);
      }

      // Web Grounding
      const urlRegex = /(https?:\/\/[^\s]+)/g;
      const urls = userMsg.match(urlRegex) || [];
      let webGroundingContext = '';
      if (urls.length > 0) {
        setLoadingProgress({ progress: 60, text: `Mengekstrak ${urls.length} URL...` });
        showToast(`Mengekstrak informasi dari ${urls.length} URL...`, 'info');
        const urlsArray = Array.isArray(urls) ? urls : [];
        const scrapePromises = urlsArray.slice(0, 3).map(url => scrapeUrl(url));
        const scrapedContents = await Promise.all(scrapePromises);
        webGroundingContext = `\n\n=== WEB GROUNDING CONTEXT ===\n${urlsArray.slice(0, 3).map((url, i) => `URL: ${url}\nContent: ${scrapedContents[i].substring(0, 5000)}...`).join('\n\n')}\n=============================\n`;
      }

      setLoadingProgress({ progress: 80, text: 'Mensintesis Instruksi Apex...' });
      const baseInstruction = buildAIHubSystemInstruction(currentClone, customInstruction);

      const fullContext = `
${baseInstruction}

<INTERNAL_CONTEXT_ONLY_DO_NOT_OUTPUT>
[CORE MEMORY (SERVER)]:
${coreMemoryContext}

[ORCHESTRATOR CONTEXT]:
${finalContext.map((c: any) => `[${c.role.toUpperCase()}]: ${c.content}`).join('\n')}

[WEB GROUNDING CONTEXT]:
${webGroundingContext}
</INTERNAL_CONTEXT_ONLY_DO_NOT_OUTPUT>
      `;

      const finalPrompt = finalContext.map(c => `${c.role}: ${c.content}`).join('\n\n');

      activeMessageRef.current = '...';
      setHistory(prev => [
        ...prev.filter(msg => msg.content !== '...'),
        { id: tempId, role: 'ai', content: activeMessageRef.current, timestamp: aiTimestamp, sessionId: currentSessionId }
      ]);

      let lastUpdateTime = 0;
      let animationFrameId: number | null = null;

      setLoadingProgress({ progress: 90, text: 'Menghubungkan ke Ham Engine...' });
      
      const modelEngineCtx = {
        history,
        activeClone,
        currentSessionId,
        allInstructions,
        setLoadingProgress,
        showToast
      };

      const result = await executeModelRequest(modelEngineCtx, currentClone, finalPrompt, fullContext, filesToUpload, (updatedText) => {
        setLoadingProgress({ progress: 100, text: 'Mensintesis Respon...' });
        activeMessageRef.current = updatedText;
        
        const now = Date.now();
        if (now - lastUpdateTime > 50) {
          lastUpdateTime = now;
          if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
          animationFrameId = requestAnimationFrame(() => {
            setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: updatedText } : msg));
          });
        }
      }, [], controller.signal);
      
      if (animationFrameId !== null) cancelAnimationFrame(animationFrameId);
      
      if (currentClone.provider === 'gemini') {
        orchestratorRef.current!.recordApiSuccess();
      }

      setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: activeMessageRef.current, image: result.image, audio: result.audio, video: result.video } : msg));

      // Auto-continuation for truncated code blocks
      if (result.text.split('```').length % 2 === 0) {
        const continuePrompt = "Lanjutkan kode dari baris terakhir secara presisi. Langsung lanjutkan saja.";
        const continuation = await executeModelRequest(modelEngineCtx, currentClone, continuePrompt, fullContext, [], (continuationText) => {
           setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: result.text + continuationText } : msg));
        }, [], controller.signal);
        result.text += "\n" + continuation.text;
      }

      // Shell Command Parsing & Execution
      const shellRegex = /```shell\n([\s\S]*?)\n```/g;
      let match;
      let shellOutputs = "";
      while ((match = shellRegex.exec(result.text)) !== null) {
        const command = match[1].trim();
        try {
            const { output, isError } = await executeShellCommand(command);
            shellOutputs += `\n\n[SHELL ${isError ? 'ERROR' : 'OUTPUT'}]:\n\`\`\`\n${output}\n\`\`\``;
            setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: result.text + shellOutputs } : msg));
        } catch (e: any) {
            const errorMessage = e instanceof Error ? e.message : String(e);
            shellOutputs += `\n\n[SHELL ERROR]: ${errorMessage}`;
            setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, content: result.text + shellOutputs } : msg));
        }
      }
      
      const finalAiText = result.text + shellOutputs;
      const realId = await saveMessageToDB('ai', finalAiText, result.image, result.audio, result.video, undefined, aiTimestamp, true);
      
      setHistory(prev => prev.map(msg => msg.id === tempId ? { ...msg, id: realId as string, content: finalAiText } : msg));
      setLastError(null);

      const historyArrayStore = Array.isArray(useAIHubStore.getState().history) ? useAIHubStore.getState().history : [];
      if (historyArrayStore.length > 0 && historyArrayStore.length % 10 === 0) {
         summarizeConversation(historyArrayStore.slice(-10), setSummaryContext, controller.signal);
      }

    } catch (err: any) {
      setHistory(prev => prev.filter(msg => msg.id !== tempId && msg.content !== '...'));
      const errorMessage = err instanceof Error ? err.message : String(err);
      setLastError(errorMessage);
      
      if (err instanceof Error && err.name === 'AbortError') {
        // Aborted
      } else {
        const isApiLimit = errorMessage.toLowerCase().includes('429') || errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('rate limit');
        const isNetworkError = errorMessage.toLowerCase().includes('network') || errorMessage.toLowerCase().includes('fetch') || errorMessage.toLowerCase().includes('failed to call') || errorMessage.toLowerCase().includes('timeout') || errorMessage.toLowerCase().includes('ham engine api');
        
        if (isApiLimit) orchestratorRef.current!.recordApiFailure();
        
        showToast(isApiLimit ? 'API Limit Reached. Silakan tunggu beberapa saat.' : (isNetworkError ? `Network Error: ${errorMessage}` : `Gagal menghasilkan respons: ${errorMessage}`), 'error');
        
        await saveMessageToDB('ai', isApiLimit ? `Maaf, sistem AI sedang mencapai limit kuota. Silakan tunggu beberapa saat.` : (isNetworkError ? `Maaf, terjadi masalah koneksi jaringan. Silakan periksa koneksi internet Anda dan coba lagi. Error: ${errorMessage}` : `Maaf, semua sistem AI sedang sibuk atau mengalami gangguan. Error: ${errorMessage}`));
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
      isProcessingRef.current = false;
    }
  };

  const handleShellExecute = useCallback(async (cmd: string) => {
    try {
      showToast('Mengeksekusi Perintah Shell...', 'info');
      const { output, isError } = await executeShellCommand(cmd);
      showToast(isError ? 'Eksekusi Gagal' : 'Eksekusi Berhasil', isError ? 'error' : 'success');
      await saveMessageToDB('ai', `[${isError ? 'ERROR' : 'OUTPUT'} TERMINAL]:\n\`\`\`\n${output}\n\`\`\``);
    } catch (e: any) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      showToast('Gagal Menghubungkan ke Terminal', 'error');
      await saveMessageToDB('ai', `[FATAL ERROR]: ${errorMessage}`);
    }
  }, [showToast, saveMessageToDB]);

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsLoading(false);
      setLastError('Dibatalkan oleh pengguna');
      saveMessageToDB('ai', '_Permintaan dibatalkan oleh pengguna._');
    }
  };

  const retryLastMessage = async () => {
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
    if (lastUserMsg) {
      setLastError(null);
      const historyArray = Array.isArray(history) ? history : [];
      const lastMsg = historyArray[historyArray.length - 1];
      if (lastMsg && lastMsg.role === 'ai' && (lastMsg.content.includes('Maaf') || lastMsg.content.includes('Error'))) {
        setHistory(historyArray.slice(0, -1));
      }
      await handleSend(lastUserMsg.content, () => {}, true);
    }
  };

  return { handleSend, handleShellExecute, handleCancel, retryLastMessage };
}
