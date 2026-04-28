 
 
import { useToast } from '../../../context/ToastContext';
import { ProjectData, StudioUI } from '../types';

interface UseAiActionsProps {
  handleSend: (e?: React.FormEvent, prompt?: string) => void;
  setInput: (input: string) => void;
  isLocalMode: boolean;
  ui: StudioUI;
  generatedProject: ProjectData | null;
}

export function useAiActions({
  handleSend,
  setInput,
  isLocalMode,
  ui,
  generatedProject
}: UseAiActionsProps) {
  const { showToast } = useToast();

  const handlePlanningClick = () => {
    if (!generatedProject) {
      showToast("Belum ada proyek yang aktif. Silakan buat atau jelaskan proyek yang ingin Anda bangun terlebih dahulu.", "warning");
      return;
    }
    const planningPrompt = "Buatkan rencana eksekusi detail untuk pengembangan proyek ini. Apa saja yang perlu dikerjakan selanjutnya? Berikan daftar tugas (todo list) yang konkret.";
    handleSend(undefined, planningPrompt);
  };

  const handleMicClick = () => {
    if (isLocalMode) {
      showToast("Voice mode is currently only available in Cloud Mode.", "info");
      return;
    }
    ui.setIsLiveSessionOpen(true);
  };

  const handleSuggestionClick = (text: string) => {
    setInput(text);
  };

  const handleSelectTemplate = (prompt: string) => {
    handleSend(undefined, prompt);
  };

  const handleExplainCode = (code: string) => {
    const explainPrompt = `Tolong jelaskan potongan kode ini secara rinci, termasuk fungsionalitas intinya, bagaimana cara kerjanya, dan potensi kasus penggunaannya:\n\n\`\`\`\n${code}\n\`\`\``;
    handleSend(undefined, explainPrompt);
  };

  return {
    handlePlanningClick,
    handleMicClick,
    handleSuggestionClick,
    handleSelectTemplate,
    handleExplainCode
  };
}
