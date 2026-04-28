 
import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { MessageSquare } from 'lucide-react';

interface PromptContextType {
  prompt: (message: string, defaultValue?: string) => Promise<string | null>;
}

const PromptContext = createContext<PromptContextType | undefined>(undefined);

export const usePrompt = () => {
  const context = useContext(PromptContext);
  if (!context) {
    throw new Error('usePrompt must be used within a PromptProvider');
  }
  return context;
};

export const PromptProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [value, setValue] = useState('');
  const [resolvePromise, setResolvePromise] = useState<(value: string | null) => void>();

  const prompt = useCallback((msg: string, defaultValue = '') => {
    setMessage(msg);
    setValue(defaultValue);
    setIsOpen(true);
    return new Promise<string | null>((resolve) => {
      setResolvePromise(() => resolve);
    });
  }, []);

  const handleConfirm = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(value);
  };

  const handleCancel = () => {
    setIsOpen(false);
    if (resolvePromise) resolvePromise(null);
  };

  return (
    <PromptContext.Provider value={{ prompt }}>
      {children}
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-[#1e1e1e] border border-white/10 rounded-xl p-6 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3 mb-4 text-blue-500">
              <MessageSquare size={24} />
              <h3 className="text-lg font-semibold text-white">Input</h3>
            </div>
            <p className="text-gray-300 mb-4">{message}</p>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              className="w-full bg-[#2a2a2a] border border-white/10 rounded-lg px-3 py-2 text-white mb-6 focus:outline-none focus:border-blue-500"
              autoFocus
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors font-medium"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </PromptContext.Provider>
  );
};
