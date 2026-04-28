 
import React, { useEffect, useRef, useState } from 'react';
import { ProjectFile } from './types';
import { Loader2, RefreshCw, WifiOff } from 'lucide-react';
import { generatePreviewContent } from './WebProjectRenderer/PreviewGenerator';
import { CDN_URLS } from '../../constants/dependencies';
import { useToast } from '../../context/ToastContext';

declare const Babel: {
  transform: (code: string, options: { presets: (string | [string, Record<string, unknown>])[], filename: string }) => { code: string };
};

interface WebProjectRendererProps {
  files: ProjectFile[];
  webProjectUrl: string | null;
  breakpoints?: number[];
  showToolbar?: boolean;
}

const WebProjectRenderer: React.FC<WebProjectRendererProps> = ({ files, webProjectUrl, breakpoints = [], showToolbar = true }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [key, setKey] = useState(0); // To force re-render of iframe
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [srcDocContent, setSrcDocContent] = useState<string>('');
  const { showToast } = useToast();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // If we have a server-side URL, use it directly (it's the most "real" preview)
    if (webProjectUrl) {
      setIsLoading(false);
      return;
    }

    if (isOffline) {
      setError("Offline Mode: Cannot load external dependencies for client-side preview.");
      setIsLoading(false);
      return;
    }

    const generatePreview = async () => {
      setIsLoading(true);
      setError(null);

      // PROTOKOL: Memory Safety - Cleanup previous Blob URLs
      const win = window as any as { __HAM_ASSETS__?: Record<string, string> };
      if (win.__HAM_ASSETS__) {
        Object.values(win.__HAM_ASSETS__).forEach((url) => {
          if (typeof url === 'string' && url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
          }
        });
      }

      try {
        if (!iframeRef.current) return;
        const finalHtml = await generatePreviewContent({ files, showToast });
        setSrcDocContent(finalHtml);
        setIsLoading(false);
      } catch (err: any) {
        // console.error("Preview Generation Error:", err);
        setError(err.message);
        setIsLoading(false);
      }
    };

    generatePreview();
  }, [files, webProjectUrl, key, isOffline, showToast]);

  return (
    <div className="w-full h-full bg-[var(--bg-primary)] relative flex flex-col">
      {webProjectUrl && (
        <div className="absolute top-2 right-2 z-10 bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md shadow-sm border border-green-200">
          Running from Server
        </div>
      )}
      
      <div className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-[var(--bg-primary)]/80 z-20">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-blue-500" size={24} />
              <span className="text-xs text-[var(--text-secondary)]">Building Preview...</span>
            </div>
          </div>
        )}
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-red-50 z-20 p-4">
            <div className="text-red-500 text-sm text-center flex flex-col items-center gap-2">
              {isOffline && <WifiOff size={24} />}
              <p className="font-bold mb-1">Preview Error</p>
              <p>{error}</p>
            </div>
          </div>
        )}

        {webProjectUrl ? (
          <iframe
            ref={iframeRef}
            key={key}
            src={webProjectUrl}
            title="Web Project Preview"
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            className="w-full h-full border-none bg-white"
          />
        ) : (
          <iframe
            ref={iframeRef}
            key={key}
            srcDoc={srcDocContent}
            title="Web Project Preview"
            sandbox="allow-scripts allow-forms allow-popups allow-modals"
            className="w-full h-full border-none bg-white"
          />
        )}
      </div>
      
      {showToolbar && (
        <div className="h-8 bg-[var(--bg-secondary)] border-t border-[var(--border-color)] flex items-center justify-between px-3 shrink-0">
          <span className="text-[10px] text-[var(--text-secondary)] uppercase font-semibold tracking-wider">
            {webProjectUrl ? 'Server Preview' : 'Client Preview (Babel)'}
          </span>
          <button 
            onClick={() => setKey(k => k + 1)}
            className="p-1 hover:bg-[var(--bg-tertiary)] rounded text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            title="Refresh Preview"
          >
            <RefreshCw size={12} />
          </button>
        </div>
      )}
    </div>
  );
};

export default WebProjectRenderer;
