 
import React from 'react';
import { Loader2, RefreshCw, ExternalLink, Globe, Smartphone, Tablet, Monitor, RotateCw, ZoomIn, ZoomOut, Play } from 'lucide-react';
import { clsx } from 'clsx';

interface WebPreviewToolbarProps {
  url: string | null;
  deviceType: 'mobile' | 'tablet' | 'desktop';
  setInternalDeviceType: (type: 'mobile' | 'tablet' | 'desktop') => void;
  orientation: 'portrait' | 'landscape';
  toggleOrientation: () => void;
  scale: number;
  isAutoScale: boolean;
  setIsAutoScale: (val: boolean) => void;
  adjustScale: (delta: number) => void;
  handleRefresh: () => void;
  onStartServer?: () => void;
  isServerRunning?: boolean;
}

export default function WebPreviewToolbar({
  url,
  deviceType,
  setInternalDeviceType,
  orientation,
  toggleOrientation,
  scale,
  isAutoScale,
  setIsAutoScale,
  adjustScale,
  handleRefresh,
  onStartServer,
  isServerRunning
}: WebPreviewToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 bg-[#252526] border-b border-[#333]">
      {/* Window Controls (Visual) */}
      <div className="flex items-center gap-1 mr-2">
        <div className="w-3 h-3 rounded-full bg-[#ff5f56]"></div>
        <div className="w-3 h-3 rounded-full bg-[#ffbd2e]"></div>
        <div className="w-3 h-3 rounded-full bg-[#27c93f]"></div>
      </div>
      
      {/* URL Bar */}
      <div className="flex-1 flex items-center bg-[#1e1e1e] rounded-md px-3 py-1 text-xs text-gray-400 border border-[#333]">
        <Globe size={12} className="mr-2 opacity-50" />
        <span className="truncate">{url || 'Client Preview (Babel)'}</span>
        {url ? (
          <div className="ml-2 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[8px] font-black text-emerald-400 uppercase tracking-tighter">
            Live
          </div>
        ) : (
          <div className="ml-2 flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/10 border border-yellow-500/20 rounded text-[8px] font-black text-yellow-400 uppercase tracking-tighter">
            Local
          </div>
        )}
      </div>

      <div className="h-4 w-[1px] bg-[#333] mx-1" />

      {/* Device Controls */}
      <div className="flex items-center bg-[#1e1e1e] rounded-md border border-[#333] p-0.5">
        <button 
          onClick={() => setInternalDeviceType('mobile')}
          className={clsx("p-1.5 rounded transition-colors", deviceType === 'mobile' ? "bg-[#333] text-blue-400" : "text-gray-400 hover:text-white")}
          title="Mobile"
        >
          <Smartphone size={14} />
        </button>
        <button 
          onClick={() => setInternalDeviceType('tablet')}
          className={clsx("p-1.5 rounded transition-colors", deviceType === 'tablet' ? "bg-[#333] text-blue-400" : "text-gray-400 hover:text-white")}
          title="Tablet"
        >
          <Tablet size={14} />
        </button>
        <button 
          onClick={() => setInternalDeviceType('desktop')}
          className={clsx("p-1.5 rounded transition-colors", deviceType === 'desktop' ? "bg-[#333] text-blue-400" : "text-gray-400 hover:text-white")}
          title="Desktop"
        >
          <Monitor size={14} />
        </button>
      </div>

      <button 
        onClick={toggleOrientation}
        className={clsx("p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#333] transition-colors", orientation === 'landscape' && "text-blue-400")}
        title="Rotate Orientation"
      >
        <RotateCw size={14} />
      </button>

      <div className="h-4 w-[1px] bg-[#333] mx-1" />

      {/* Scale Controls */}
      <div className="flex items-center gap-1">
        <button 
          onClick={() => {
            setIsAutoScale(false);
            adjustScale(-0.1);
          }} 
          className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#333]"
        >
          <ZoomOut size={14} />
        </button>
        <button
          onClick={() => setIsAutoScale(true)}
          className={clsx(
            "text-[10px] px-1.5 py-0.5 rounded transition-colors font-mono",
            isAutoScale ? "bg-blue-500/20 text-blue-400" : "text-gray-400 hover:text-white hover:bg-[#333]"
          )}
          title="Auto Fit"
        >
          {Math.round(scale * 100)}%
        </button>
        <button 
          onClick={() => {
            setIsAutoScale(false);
            adjustScale(0.1);
          }} 
          className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#333]"
        >
          <ZoomIn size={14} />
        </button>
      </div>

      <div className="h-4 w-[1px] bg-[#333] mx-1" />

      {/* Actions */}
      <button 
        onClick={handleRefresh}
        className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#333] transition-colors"
        title="Refresh"
      >
        <RefreshCw size={14} />
      </button>
      
      {!url && onStartServer && (
        <button 
          onClick={onStartServer}
          disabled={isServerRunning}
          className={clsx(
            "p-1.5 rounded-md transition-colors flex items-center gap-1",
            isServerRunning ? "text-blue-400 bg-blue-500/10" : "text-green-400 hover:text-white hover:bg-green-500/20"
          )}
          title={isServerRunning ? "Server Starting..." : "Start Dev Server"}
        >
          {isServerRunning ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />}
        </button>
      )}

      {url && (
        <button 
          onClick={() => window.open(url, '_blank')}
          className="p-1.5 text-gray-400 hover:text-white rounded-md hover:bg-[#333] transition-colors"
          title="Open in New Tab"
        >
          <ExternalLink size={14} />
        </button>
      )}
    </div>
  );
}
