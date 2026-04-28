 
import { useState, useEffect, useRef } from 'react';
import { CLONES } from '../../constants/aiClones';
import { hamliMemoryService } from '../../services/hamliMemoryService';
import { safeStorage } from '../../utils/storage';
import { useToast } from '../../context/ToastContext';
import { useAIHubSession } from './hooks/useAIHubSession';
import { useAIHubMedia } from './hooks/useAIHubMedia';
import { useAIHubChat } from './hooks/useAIHubChat';
import { useAIHubStore } from '../../store/aiHubStore';

export function useAIHubLogic() {
  const { showToast } = useToast();
  
  // UI State
  const { activeClone, setActiveClone } = useAIHubStore();
  const [input, setInput] = useState('');
  const [customInstruction, setCustomInstruction] = useState(() => safeStorage.getItem('quantum_custom_instruction') || '');
  const [showSettings, setShowSettings] = useState(false);
  const [externalApiKey, setExternalApiKey] = useState(() => safeStorage.getItem('ham_alternate_api_key') || '');
  const [singularityMode, setSingularityMode] = useState(true);
  const [isCloneMenuOpen, setIsCloneMenuOpen] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<'idle' | 'syncing' | 'success'>('idle');
  const [allInstructions, setAllInstructions] = useState('');
  const [visibleCount, setVisibleCount] = useState(10);
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sub-hooks
  const session = useAIHubSession();
  const media = useAIHubMedia();
  const chat = useAIHubChat({
    saveMessageToDB: session.saveMessageToDB,
    customInstruction,
    allInstructions,
    singularityMode,
    currentSessionId: session.currentSessionId
  });

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    // Use 'auto' behavior during streaming to prevent choppy/stuttering scroll animations
    scrollToBottom(chat.isLoading ? 'auto' : 'smooth');
  }, [session.history, chat.isLoading]);

  // Reset visible count if history is cleared
  useEffect(() => {
    if (session.history.length <= 10) {
      setVisibleCount(10);
    }
  }, [session.history.length]);

  useEffect(() => {
    safeStorage.setItem('quantum_custom_instruction', customInstruction);
  }, [customInstruction]);

  // Load instructions
  useEffect(() => {
    setAllInstructions("");
    
    // Memory Sync Listener
    hamliMemoryService.onSync(() => {
      handleSyncMemory();
    });
  }, []);

  // Auto-resume logic
  useEffect(() => {
    if (session.history.length > 0 && !chat.isLoading) {
      const lastMsg = session.history[session.history.length - 1];
      if (lastMsg.role === 'user') {
        // Check if there's no pending AI response
        const hasPendingAiResponse = session.history.some(m => m.timestamp > lastMsg.timestamp && m.role === 'ai');
        if (!hasPendingAiResponse) {
          // Auto-resume generation
          chat.handleSend(lastMsg.content, setInput, true);
        }
      }
    }
  }, [session.history.length]); // Run when history length changes (e.g., loaded from DB)

  const handleSyncMemory = async () => {
    setIsSyncing(true);
    setSyncStatus('syncing');
    try {
      await hamliMemoryService.getMemory();
      setSyncStatus('success');
      showToast('Memori Quantum Berhasil Disinkronisasi', 'success');
      setTimeout(() => setSyncStatus('idle'), 3000);
    } catch (e) {
      console.error('Sync failed:', e);
      setSyncStatus('idle');
      showToast('Gagal Sinkronisasi Memori', 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSendWrapper = async (e: React.FormEvent) => {
    e.preventDefault();
    await chat.handleSend(input, setInput);
  };

  return {
    // UI State
    activeClone, setActiveClone,
    input, setInput,
    customInstruction, setCustomInstruction,
    showSettings, setShowSettings,
    externalApiKey, setExternalApiKey,
    singularityMode, setSingularityMode,
    isCloneMenuOpen, setIsCloneMenuOpen,
    isSyncing, setIsSyncing,
    syncStatus, setSyncStatus,
    visibleCount, setVisibleCount,
    isVaultOpen, setIsVaultOpen,
    messagesEndRef, fileInputRef,
    scrollToBottom,
    handleSyncMemory,

    // Session
    history: session.history,
    setHistory: session.setHistory,
    sessions: session.sessions,
    setSessions: session.setSessions,
    currentSessionId: session.currentSessionId,
    setCurrentSessionId: session.setCurrentSessionId,
    showHistory: session.showHistory,
    setShowHistory: session.setShowHistory,
    checkpoints: session.checkpoints,
    createCheckpoint: session.createCheckpoint,
    performRestore: session.performRestore,
    loadCheckpoints: session.loadCheckpoints,
    createNewSession: session.createNewSession,
    clearAllHistory: session.clearAllHistory,
    deleteSession: session.deleteSession,

    // Media
    selectedFiles: media.selectedFiles,
    setSelectedFiles: media.setSelectedFiles,
    isRecording: media.isRecording,
    recordingTime: media.recordingTime,
    isLiveCall: media.isLiveCall,
    setIsLiveCall: media.setIsLiveCall,
    liveCallStatus: media.liveCallStatus,
    mediaRecorderRef: media.mediaRecorderRef,
    audioChunksRef: media.audioChunksRef,
    timerRef: media.timerRef,
    liveSessionRef: media.liveSessionRef,
    handleFileUpload: media.handleFileUpload,
    handleFileDrop: (files: File[]) => {
      const event = { target: { files } } as any as React.ChangeEvent<HTMLInputElement>;
      media.handleFileUpload(event);
    },
    startRecording: media.startRecording,
    stopRecording: media.stopRecording,
    startLiveCall: media.startLiveCall,

    // Chat
    isLoading: chat.isLoading,
    loadingProgress: chat.loadingProgress,
    abortController: chat.abortController,
    summaryContext: chat.summaryContext,
    handleSend: handleSendWrapper,
    handleShellExecute: chat.handleShellExecute,
    handleCancel: chat.handleCancel,
    retryLastMessage: chat.retryLastMessage
  };
}
