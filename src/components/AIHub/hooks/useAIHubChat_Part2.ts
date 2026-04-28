 
 
import { useCallback } from 'react';
import { executeShellCommand } from '../../../services/shellService';
import { useToast } from '../../../context/ToastContext';

export const useAIHubChat_Part2 = (props: any) => {
  const {
    saveMessageToDB,
    showToast,
    abortController,
    setAbortController,
    setIsLoading,
    setLastError,
    history,
    setHistory,
    handleSend
  } = props;

  const handleShellExecute = useCallback(async (cmd: string) => {
    try {
      showToast('Mengeksekusi Perintah Shell...', 'info');
      const { output, isError } = await executeShellCommand(cmd);
      if (isError) {
        showToast('Eksekusi Gagal', 'error');
        await saveMessageToDB('ai', `[ERROR TERMINAL]:\n\`\`\`\n${output}\n\`\`\``);
      } else {
        showToast('Eksekusi Berhasil', 'success');
        await saveMessageToDB('ai', `[OUTPUT TERMINAL]:\n\`\`\`\n${output}\n\`\`\``);
      }
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
    const lastUserMsg = [...history].reverse().find((m: any) => m.role === 'user');
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

  return {
    handleCancel,
    handleShellExecute,
    retryLastMessage
  };
};
