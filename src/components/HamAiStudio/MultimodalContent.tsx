 
import * as React from 'react';
import { Image, Play, Volume2, Download, X } from 'lucide-react';

interface MultimodalContentProps {
  type: 'image' | 'video' | 'audio';
  url: string;
  alt?: string;
}

export default function MultimodalContent({ type, url, alt }: MultimodalContentProps) {
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [isError, setIsError] = React.useState(false);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = url;
    link.download = `ham-media-${Date.now()}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isError) {
    return (
      <div className="my-4 p-4 rounded-xl border border-red-500/20 bg-red-500/5 text-red-400 text-xs flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
          <X size={14} />
        </div>
        <p>Gagal memuat media: {url}</p>
      </div>
    );
  }

  return (
    <div className="my-4 rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] overflow-hidden shadow-xl group">
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bg-secondary)] border-b border-[var(--border-color)]">
        <div className="flex items-center gap-2">
          {type === 'image' && <Image size={14} className="text-blue-400" />}
          {type === 'video' && <Play size={14} className="text-emerald-400" />}
          {type === 'audio' && <Volume2 size={14} className="text-amber-400" />}
          <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-secondary)]">{type}</span>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleDownload}
            className="p-1.5 rounded-md text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
            title="Download"
          >
            <Download size={14} />
          </button>
        </div>
      </div>
      
      <div className="relative min-h-[100px] flex items-center justify-center bg-[var(--bg-primary)]">
        {!isLoaded && !isError && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
          </div>
        )}
        
        {type === 'image' && (
          <img 
            src={url} 
            alt={alt || "Ham Media"} 
            className={`max-w-full h-auto transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoad={() => setIsLoaded(true)}
            onError={() => setIsError(true)}
            referrerPolicy="no-referrer"
          />
        )}
        
        {type === 'video' && (
          <video 
            src={url} 
            controls 
            className={`max-w-full h-auto transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
            onLoadedData={() => setIsLoaded(true)}
            onError={() => setIsError(true)}
          />
        )}
        
        {type === 'audio' && (
          <div className={`w-full p-6 transition-opacity duration-500 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}>
            <audio 
              src={url} 
              controls 
              className="w-full"
              onLoadedData={() => setIsLoaded(true)}
              onError={() => setIsError(true)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
