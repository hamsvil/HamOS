 
 
import { useState } from 'react';
import { AiWorkerService } from '../../../services/aiWorkerService';
import { useProjectStore } from '../../../store/projectStore';

interface UseInlineAIProps {
  editorRef: React.MutableRefObject<any>;
  language: string;
  path: string;
  showToast: (message: string, type: 'success' | 'error') => void;
}

export const useInlineAI = ({ editorRef, language, path, showToast }: UseInlineAIProps) => {
  const [isInlineAIVisible, setIsInlineAIVisible] = useState(false);
  const [inlineAIPrompt, setInlineAIPrompt] = useState('');
  const [inlineAIPosition, setInlineAIPosition] = useState({ top: 0, left: 0 });
  const [isGenerating, setIsGenerating] = useState(false);

  const _executeWithBackoff = async (client: any, prompt: string, retries = 3, delay = 1000): Promise<any> => {
    try {
      return await client.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
    } catch (e: any) {
      if (retries > 0 && (e.status === 429 || e.status >= 500)) {
        await new Promise(res => setTimeout(res, delay));
        return _executeWithBackoff(client, prompt, retries - 1, delay * 2);
      }
      throw e;
    }
  };

  const handleInlineAISubmit = async (overridePrompt?: string, overrideSelection?: any) => {
    const finalPrompt = overridePrompt || inlineAIPrompt;
    if (!editorRef.current || !finalPrompt.trim()) return;
    
    setIsGenerating(true);
    const selection = overrideSelection || editorRef.current.getSelection();
    const selectedText = editorRef.current.getModel().getValueInRange(selection);
    
    // Phase 7: Semantic Line Locking
    const startLine = selection.startLineNumber;
    const endLine = selection.endLineNumber;
    const linesToLock = Array.from({ length: endLine - startLine + 1 }, (_, i) => startLine + i);
    const _currentLocked = useProjectStore.getState().lockedLines;
    useProjectStore.getState().setLockedLines(path, linesToLock);
    
    try {
      const fullText = editorRef.current.getModel().getValue();
      
      const prompt = `
        You are an expert coding assistant. 
        Task: Refactor or modify the selected code based on the user's instruction.
        
        User Instruction: "${finalPrompt}"
        
        Full File Context:
        \`\`\`${language}
        ${fullText}
        \`\`\`
        
        Selected Code to Modify:
        \`\`\`${language}
        ${selectedText}
        \`\`\`
        
        Return ONLY the modified version of the "Selected Code". Do not return the entire file. No markdown blocks, no explanations. Just the code that should replace the selection.
      `;

      const response = await AiWorkerService.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        fallbackProviders: ['anthropic', 'openai']
      });

      let modifiedCode = response.text.trim();
      
      // Strip markdown code blocks if present (robust multi-pass)
      const codeBlockRegex = /```(?:[a-zA-Z0-9]+)?\n([\s\S]*?)```/g;
      let match;
      let lastMatch;
      while ((match = codeBlockRegex.exec(modifiedCode)) !== null) {
        lastMatch = match;
      }
      
      if (lastMatch) {
        modifiedCode = lastMatch[1].trim();
      } else if (modifiedCode.startsWith('```')) {
        // Fallback: manual strip
        modifiedCode = modifiedCode.replace(/^```(?:[a-zA-Z0-9]+)?\n/, '').replace(/\n```$/, '').trim();
      }
      
      // Native Shadow Diff Integration
      // Instead of directly executing edits, we construct the full new file content
      // and set it to the shadow buffer. This automatically triggers the DiffEditor view
      // allowing the user to Accept or Reject the changes natively.
      const model = editorRef.current.getModel();
      const fullNewContent = 
        model.getValueInRange({ startLineNumber: 1, startColumn: 1, endLineNumber: selection.startLineNumber, endColumn: selection.startColumn }) +
        modifiedCode +
        model.getValueInRange({ startLineNumber: selection.endLineNumber, startColumn: selection.endColumn, endLineNumber: model.getLineCount(), endColumn: model.getLineMaxColumn(model.getLineCount()) });
      
      useProjectStore.getState().setShadowBuffer(path, fullNewContent);
      
      setIsInlineAIVisible(false);
      setInlineAIPrompt('');
      
    } catch (error) {
      console.error("Inline AI Error:", error);
      showToast("Failed to generate code. Please try again.", "error");
    } finally {
      setIsGenerating(false);
      const _currentLocked = useProjectStore.getState().lockedLines;
      useProjectStore.getState().setLockedLines(path, []);
    }
  };

  return {
    isInlineAIVisible,
    setIsInlineAIVisible,
    inlineAIPrompt,
    setInlineAIPrompt,
    inlineAIPosition,
    setInlineAIPosition,
    isGenerating,
    handleInlineAISubmit,
  };
};
