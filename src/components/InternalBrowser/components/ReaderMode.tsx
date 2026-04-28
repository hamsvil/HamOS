 
import React, { useState, useEffect } from 'react';
import { BookOpen, X, Loader2, AlertCircle } from 'lucide-react';

export const ReaderMode: React.FC<{ url: string, onClose: () => void }> = ({ url, onClose }) => {
  const [content, setContent] = useState<string>('');
  const [title, setTitle] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContent = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(`/ham-api/reader?url=${encodeURIComponent(url)}`);
        if (!response.ok) throw new Error('Network response was not ok');
        const data = await response.json();
        
        if (data.error) {
           throw new Error(data.error);
        }

        setTitle(data.title || 'Untitled');
        setContent(data.content || '<p>Could not extract readable content from this page.</p>');
      } catch (err: any) {
        setError(err.message || 'Failed to load reader mode content');
      } finally {
        setIsLoading(false);
      }
    };

    fetchContent();
  }, [url]);

  return (
    <div className="absolute inset-0 z-50 bg-[var(--bg-primary)] p-8 overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-8 sticky top-0 bg-[var(--bg-primary)] py-4 border-b border-[var(--border-color)] z-10">
          <div className="flex items-center gap-2">
            <BookOpen size={20} className="text-violet-500" />
            <h2 className="text-lg font-bold text-[var(--text-primary)]">Reader Mode</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[var(--bg-secondary)] rounded-full text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
            <X size={20} />
          </button>
        </div>
        
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <Loader2 className="w-8 h-8 text-violet-500 animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Extracting readable content...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-red-500">
            <AlertCircle className="w-8 h-8" />
            <p className="text-sm">{error}</p>
          </div>
        ) : (
          <div className="prose prose-invert prose-violet max-w-none">
            <h1 className="text-3xl font-bold mb-8 text-[var(--text-primary)]">{title}</h1>
            <div 
              className="text-[var(--text-secondary)] leading-relaxed space-y-4"
              dangerouslySetInnerHTML={{ __html: content }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};
