 
import { useState, useEffect, useRef, useCallback } from 'react';
import { generateUUID } from '../../../utils/uuid';
import { 
    initChatDB, 
    saveChatSession, 
    getChatSessions, 
    deleteChatSession, 
    saveChatMessage, 
    getChatMessages, 
    clearChatMessages,
    saveCheckpoint,
    getCheckpoints,
    restoreCheckpoint
} from '../../../services/chatDbService';
import { safeStorage } from '../../../utils/storage';
import { geminiKeyManager } from '../../../services/geminiKeyManager';
import { GLOBAL_AI_CAPABILITIES } from '../../../config/aiCapabilities';
import { ChatMessage, ChatSession, FileAttachment } from '../../../types/ai';
import { useConfirm } from '../../../context/ConfirmContext';
import { useAIHubStore } from '../../../store/aiHubStore';

export function useAIHubSession() {
  const { 
    history, 
    setHistory, 
    sessions, 
    setSessions, 
    currentSessionId, 
    setCurrentSessionId,
    createNewSession: storeCreateNewSession,
    deleteSession: storeDeleteSession,
    clearAllHistory: storeClearAllHistory
  } = useAIHubStore();

  const [showHistory, setShowHistory] = useState(false);
  const [checkpoints, setCheckpoints] = useState<any[]>([]);
  const { confirm } = useConfirm();

  const loadCheckpoints = async () => {
    const cps = await getCheckpoints(currentSessionId);
    setCheckpoints(cps);
  };

  const createCheckpoint = async (_type: 'auto' | 'manual' = 'auto') => {
    try {
        await saveCheckpoint(currentSessionId, history);
        loadCheckpoints();
    } catch (e) {
        console.error('Checkpoint failed:', e);
    }
  };

  const performRestore = async (checkpoint: any) => {
    if (await confirm('Restore ke checkpoint ini? Riwayat saat ini akan tertimpa.')) {
        const success = await restoreCheckpoint(currentSessionId, checkpoint.snapshot);
        if (success) {
            await loadHistoryFromDB(currentSessionId);
        }
    }
  };

  useEffect(() => {
    const initSession = async () => {
      await initChatDB();
      
      // If store already has sessions (from persistence), we don't need to create a new one
      if (sessions.length > 0) {
        if (currentSessionId) {
          loadHistoryFromDB(currentSessionId);
        }
        return;
      }

      const sessionStarted = safeStorage.getItem('quantum_session_started');
      if (sessionStarted) {
        const lastSessionId = safeStorage.getItem('quantum_last_session_id');
        if (lastSessionId) {
          setCurrentSessionId(lastSessionId);
          loadSessionsFromDB();
          return;
        }
      }

      const newId = storeCreateNewSession();
      safeStorage.setItem('quantum_session_started', 'true');
      safeStorage.setItem('quantum_last_session_id', newId);
      loadSessionsFromDB();
    };
    
    initSession();
  }, []);

  useEffect(() => {
    if (currentSessionId && currentSessionId !== 'default') {
      loadHistoryFromDB(currentSessionId);
      safeStorage.setItem('quantum_last_session_id', currentSessionId);
    }
  }, [currentSessionId]);

  const loadSessionsFromDB = async () => {
    const allSessions = await getChatSessions();
    if (allSessions.length > 0) {
      setSessions(allSessions as ChatSession[]);
    }
  };

  const loadHistoryFromDB = async (sid: string) => {
    const msgs = await getChatMessages(sid);
    setHistory(msgs as ChatMessage[]);
  };

  const updateSessionTitle = async (sid: string, firstMsg: string) => {
    try {
      const res = await geminiKeyManager.executeWithRetry(async (client) => {
        const result = await client.models.generateContent({
          model: 'gemini-2.5-flash',
          config: {
            systemInstruction: `Kamu adalah asisten pengelola riwayat chat. Berikan judul saja tanpa tanda kutip.\n\n${GLOBAL_AI_CAPABILITIES}`
          },
          contents: [{ role: 'user', parts: [{ text: `Buat judul singkat (maks 5 kata) untuk percakapan yang dimulai dengan: "${firstMsg}"` }] }]
        });
        return result;
      });
      const title = res.text?.trim() || 'Percakapan';
      await saveChatSession(sid, title);
      loadSessionsFromDB();
    } catch (e) {
      console.error('Failed to update title:', e);
    }
  };

  const historyLengthRef = useRef(history.length);
  const currentSessionIdRef = useRef(currentSessionId);

  useEffect(() => {
    historyLengthRef.current = history.length;
  }, [history.length]);

  useEffect(() => {
    currentSessionIdRef.current = currentSessionId;
  }, [currentSessionId]);

  const saveMessageToDB = useCallback(async (role: 'user' | 'ai', content: string, image?: string, audio?: string, video?: string, files?: FileAttachment[], timestampOverride?: number, skipStateUpdate?: boolean) => {
    const timestamp = timestampOverride || Date.now();
    const sessionId = currentSessionIdRef.current;
    
    const id = await saveChatMessage(sessionId, role, content, image, audio, video, files, timestamp);
    
    const msg: ChatMessage = { id: id as string, role, content, image, audio, video, files, timestamp, sessionId };

    if (!skipStateUpdate) {
      setHistory(prev => [...prev, msg]);
    }

    if (role === 'user' && historyLengthRef.current === 0) {
      updateSessionTitle(sessionId, content || (files && files.length > 0 ? `File: ${files[0].name}` : 'Media Content'));
    }

     
    return id as any;
  }, []);

  const createNewSession = async () => {
    const newId = storeCreateNewSession();
    await saveChatSession(newId, 'Percakapan Baru');
    loadSessionsFromDB();
    setShowHistory(false);
  };

  const clearAllHistory = async () => {
    if (await confirm('Hapus seluruh riwayat percakapan secara permanen?')) {
      for (const session of sessions) {
          await deleteChatSession(session.id);
      }
      storeClearAllHistory();
      const newId = currentSessionId; // Store already reset it
      await saveChatSession(newId, 'Percakapan Baru');
      loadSessionsFromDB();
    }
  };

  const deleteSession = async (sid: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteChatSession(sid);
      storeDeleteSession(sid);
      loadSessionsFromDB();
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  return {
    history, setHistory,
    sessions, setSessions,
    currentSessionId, setCurrentSessionId,
    showHistory, setShowHistory,
    checkpoints,
    createCheckpoint,
    performRestore,
    loadCheckpoints,
    loadSessionsFromDB,
    loadHistoryFromDB,
    saveMessageToDB,
    createNewSession,
    clearAllHistory,
    deleteSession
  };
}

