 
import React, { useEffect, useState, useRef } from 'react';
import { Loader2, AlertTriangle, ExternalLink, Activity, ShieldCheck } from 'lucide-react';
import { webcontainerService } from '../../services/webcontainerService';
import DeviceFrame from './DeviceFrame';
import { clsx } from 'clsx';
import { ProjectFile } from './types';
import WebProjectRenderer from './WebProjectRenderer';
import { useProjectStore } from '../../store/projectStore';
import WebPreviewToolbar from './WebPreviewToolbar';
import { useSupremeProtocol } from '../../hooks/useSupremeProtocol';

interface WebPreviewProps {
  projectName: string;
  urlOverride?: string | null;
  files?: ProjectFile[];
  onStartServer?: () => void;
  isServerRunning?: boolean;
  deviceType?: 'mobile' | 'tablet' | 'desktop';
  orientation?: 'portrait' | 'landscape';
  scale?: number;
  showToolbar?: boolean;
  isNativeMode?: boolean;
}

export default function WebPreview({ 
  projectName, 
  urlOverride, 
  files, 
  onStartServer, 
  isServerRunning,
  deviceType: externalDeviceType,
  orientation: externalOrientation,
  scale: externalScale,
  showToolbar = true,
  isNativeMode = false
}: WebPreviewProps) {
  useSupremeProtocol();
  const [url, setUrl] = useState<string | null>(urlOverride || null);
  const [isLoading, setIsLoading] = useState(!urlOverride && !files);
  const [error, setError] = useState<string | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [rendererKey, setRendererKey] = useState(0);

  // Device simulation state
  const [internalDeviceType, setInternalDeviceType] = useState<'mobile' | 'tablet' | 'desktop'>('desktop');
  const [internalOrientation, setInternalOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [internalScale, setInternalScale] = useState(1);
  const [isAutoScale, setIsAutoScale] = useState(true);
  const [autoScale, setAutoScale] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  const deviceType = externalDeviceType || internalDeviceType;
  const orientation = externalOrientation || internalOrientation;
  const scale = isAutoScale ? autoScale : (externalScale || internalScale);

  // Auto-scale logic
  useEffect(() => {
    if (!containerRef.current || deviceType === 'desktop') return;

    const updateScale = () => {
      const container = containerRef.current;
      if (!container) return;

      const { width, height } = container.getBoundingClientRect();
      const padding = 60;
      const availableWidth = width - padding;
      const availableHeight = height - padding;

      let deviceW = 375;
      let deviceH = 812;

      if (deviceType === 'tablet') {
        deviceW = 768;
        deviceH = 1024;
      }

      if (orientation === 'landscape') {
        [deviceW, deviceH] = [deviceH, deviceW];
      }

      const scaleW = availableWidth / deviceW;
      const scaleH = availableHeight / deviceH;
      const fitScale = Math.min(scaleW, scaleH, 1);

      setAutoScale(fitScale);
    };

    const observer = new ResizeObserver(updateScale);
    observer.observe(containerRef.current);
    updateScale();

    return () => observer.disconnect();
  }, [deviceType, orientation]);

  useEffect(() => {
    if (urlOverride) {
      setUrl(urlOverride);
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    const initPreview = async () => {
      try {
        if (!files) setIsLoading(true);
        setError(null);

        // NATIVE MODE: Background check for Local Web Server
        if ((window as any).Android && (window as any).Android.isNativeMode()) {
             const port = 8080;
             const projectPath = `http://localhost:${port}`;
             
             // Run check in background
             fetch(projectPath, { method: 'HEAD', mode: 'no-cors' })
                 .then(() => {
                     if (isMounted) setUrl(projectPath);
                 })
                 .catch(e => {
                     // console.warn("Native LocalWebServer not reachable, falling back to WebContainer logic", e);
                 });
        }

        // Phase 4: Omni-Node Bridge Integration
        const usePhantom = await webcontainerService.shouldUsePhantom();
        const phantomUrl = webcontainerService.getPreviewUrl();

        if (usePhantom && phantomUrl && isMounted) {
          setUrl(phantomUrl);
          setIsLoading(false);
          return;
        }

        // Set a timeout to stop loading if server takes too long
        const timeoutId = setTimeout(() => {
            if (isMounted && !url) {
                if (!files) {
                  setIsLoading(false);
                  setError("Connection timed out. The server took too long to start.");
                }
                // If we have files, we just stay on Babel preview, no error needed
            }
        }, 15000); // 15 seconds timeout

        // Listen for server-ready event from WebContainer
        webcontainerService.onServerReady((port, serverUrl) => {
          if (isMounted) {
            clearTimeout(timeoutId);
            setUrl(serverUrl);
            setIsLoading(false);
          }
        });
        
      } catch (err: any) {
        if (isMounted) {
          // console.error("WebPreview Error:", err);
          if (!files) {
             setError(err.message || "Failed to connect to WebContainer server.");
             setIsLoading(false);
          }
        }
      }
    };

    initPreview();

    return () => {
      isMounted = false;
    };
  }, [projectName, urlOverride, files]);

  const setDomTelemetry = useProjectStore(state => state.setDomTelemetry);
  const addPreviewError = useProjectStore(state => state.addPreviewError);
  const clearPreviewErrors = useProjectStore(state => state.clearPreviewErrors);

  /**
   * Handles messages received from the preview iframe.
   * Validates origin (where possible) and sanitizes payload structure
   * to prevent XSS or log pollution.
   */
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Security Check: Validate origin if possible, or ensure data structure is strict
      // In WebContainer/Blob URL cases, origin might be null or opaque, so we validate the payload structure strictly
      if (!event.data || typeof event.data !== 'object') return;

      if (event.data.type === 'PREVIEW_READY') {
        setIsLoading(false);
        return;
      }

      if (event.data.type === 'HAM_DOM_TELEMETRY' || event.data.type === 'PREVIEW_DOM_UPDATE') {
        setDomTelemetry(event.data.dom || event.data.structure);
        return;
      }

      // Strict Payload Validation
      const isConsole = event.data.type === 'PREVIEW_CONSOLE' || event.data.type === 'HAM_CONSOLE_LOG';
      const isError = event.data.type === 'PREVIEW_ERROR' || event.data.type === 'HAM_RUNTIME_ERROR';

      if (!isConsole && !isError) return;

      if (isConsole) {
        const payload = event.data.payload || { method: event.data.method, args: event.data.args };
        if (!payload || typeof payload !== 'object') return;
        
        const { method, args } = payload;
        const safeMethod = ['log', 'warn', 'error', 'info'].includes(method) ? method : 'log';
        const safeArgs = Array.isArray(args) ? args : [args];

        if (safeMethod === 'error') {
            addPreviewError(safeArgs.join(' '));
        }

        const color = safeMethod === 'error' ? '#ef4444' : safeMethod === 'warn' ? '#f59e0b' : '#3b82f6';
        // console.log(`%c[Preview ${safeMethod}]`, `color: ${color}; font-weight: bold;`, ...safeArgs);
      }
      
      if (isError) {
        const payload = event.data.payload || { message: event.data.message };
        if (!payload || typeof payload !== 'object') return;
        const errorMsg = payload.message || 'Unknown error';
        addPreviewError(errorMsg);
        // console.error(`%c[Preview Error]`, 'color: #ef4444; font-weight: bold;', errorMsg);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [setDomTelemetry, addPreviewError]);

  /**
   * Reloads the preview iframe content.
   * Uses a safe approach to handle cross-origin restrictions.
   */
  const handleRefresh = React.useCallback(() => {
    clearPreviewErrors();
    if (url && iframeRef.current) {
      // Reload the iframe content properly
      try {
        if (iframeRef.current.contentWindow) {
            iframeRef.current.contentWindow.location.reload();
        } else {
            // Fallback
            /* eslint-disable-next-line no-self-assign */
      iframeRef.current.src = iframeRef.current.src;
        }
      } catch (e) {
        // Cross-origin might block contentWindow access
        /* eslint-disable-next-line no-self-assign */
      iframeRef.current.src = iframeRef.current.src;
      }
    } else {
      // Refresh Babel renderer
      setRendererKey(k => k + 1);
    }
  }, [url]);

  const handleGoBack = React.useCallback(() => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
        try {
            iframeRef.current.contentWindow.history.back();
        } catch (e) {
            // console.warn("Cannot go back due to cross-origin restrictions");
            handleRefresh();
        }
    }
  }, [handleRefresh]);

  /**
   * Sends a message to the preview iframe.
   */
  const sendMessageToIframe = React.useCallback((message: any) => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      iframeRef.current.contentWindow.postMessage(message, '*');
    }
  }, []);

  /**
   * Injects a robust bridge into the iframe for native/preview testing.
   */
  const injectNativeBridge = React.useCallback(() => {
    if (!iframeRef.current || !iframeRef.current.contentWindow) return;

    const bridgeScript = `
      (function() {
        if (window.HamBridge) return;
        window.HamBridge = {
          send: (type, payload) => window.parent.postMessage({ type, payload }, '*'),
          log: (method, ...args) => window.parent.postMessage({ type: 'PREVIEW_CONSOLE', payload: { method, args } }, '*'),
          error: (message) => window.parent.postMessage({ type: 'PREVIEW_ERROR', payload: { message } }, '*'),
          ready: () => window.parent.postMessage({ type: 'PREVIEW_READY' }, '*')
        };
        
        // Signal ready when window is fully loaded
        if (document.readyState === 'complete') {
          window.HamBridge.ready();
        } else {
          window.addEventListener('load', () => window.HamBridge.ready());
        }
        
        // Native Mode Overrides
        ${isNativeMode ? `
        window.Android = {
          isNativeMode: () => true,
          showToast: (msg) => window.HamBridge.log('info', 'Toast: ' + msg),
          vibrate: (ms) => { /* console.log("[Native Vibrate]", ms + "ms") */ },
          getDeviceId: () => "simulated-device-id-12345",
          closeApp: () => window.HamBridge.log('warn', 'App close requested')
        };
        ` : ''}
        // console.log("%c[Ham AI Studio] Bridge Injected", "color: #03DAC5; font-weight: bold;");
      })();
    `;

    sendMessageToIframe({ type: 'INJECT_HAM_BRIDGE', script: bridgeScript });
  }, [isNativeMode, sendMessageToIframe]);

  const toggleOrientation = React.useCallback(() => {
    setInternalOrientation(prev => prev === 'portrait' ? 'landscape' : 'portrait');
  }, []);

  const adjustScale = React.useCallback((delta: number) => {
    setInternalScale(prev => {
      const newScale = Math.round((prev + delta) * 10) / 10;
      return Math.max(0.5, Math.min(2, newScale));
    });
  }, []);

  return (
    <div className="flex flex-col h-full bg-[#1e1e1e] border-l border-[#333]">
      {/* Toolbar */}
      {showToolbar && (
        <WebPreviewToolbar
          url={url}
          deviceType={deviceType}
          setInternalDeviceType={setInternalDeviceType}
          orientation={orientation}
          toggleOrientation={toggleOrientation}
          scale={scale}
          isAutoScale={isAutoScale}
          setIsAutoScale={setIsAutoScale}
          adjustScale={adjustScale}
          handleRefresh={handleRefresh}
          onStartServer={onStartServer}
          isServerRunning={isServerRunning}
        />
      )}

      {/* Preview Area */}
      <div ref={containerRef} className="flex-1 relative bg-[#111] overflow-auto">
        {/* Background Grid Pattern */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
             style={{ 
               backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', 
               backgroundSize: '20px 20px',
               backgroundAttachment: 'fixed'
             }} 
        />

        {/* Engine v7 Status Overlay */}
        <div className="absolute top-4 right-4 z-[60] flex items-center gap-2 pointer-events-none bg-black/40 backdrop-blur-md px-2 py-1 rounded-full border border-violet-500/30">
          <Activity size={10} className="text-violet-400 animate-pulse" />
          <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Singularity Engine v7</span>
          <ShieldCheck size={10} className="text-emerald-400" />
        </div>

        {isLoading && !url && !files && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e] text-gray-400 z-50">
            <Loader2 size={32} className="animate-spin mb-4 text-blue-500" />
            <p className="text-sm font-medium">Waiting for WebContainer Server...</p>
            <p className="text-xs opacity-50 mt-2">Run 'npm run dev' or 'node server.js' in the terminal</p>
          </div>
        )}

        {error && !files && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#1e1e1e] text-red-400 z-50 p-6 text-center">
            <AlertTriangle size={32} className="mb-4" />
            <p className="text-sm font-bold">Preview Error</p>
            <p className="text-xs mt-2 opacity-80">{error}</p>
            <div className="flex gap-2 mt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-md text-xs font-medium transition-colors"
                >
                  Retry
                </button>
                {url && (
                    <button 
                      onClick={() => window.open(url, '_blank')}
                      className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-md text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <ExternalLink size={12} /> Open in New Tab
                    </button>
                )}
            </div>
          </div>
        )}

        <div className={clsx(
          "relative z-10 transition-all duration-300 ease-out p-4",
          deviceType === 'desktop' ? "w-full h-full" : "min-w-full min-h-full flex"
        )}>
          <div className={clsx(
            "transition-all duration-300",
            deviceType === 'desktop' ? "w-full h-full" : "m-auto"
          )}>
            <DeviceFrame deviceType={deviceType} orientation={orientation} scale={scale}>
              {url ? (
                <iframe
                  ref={iframeRef}
                  src={url}
                  className="w-full h-full border-0 bg-white"
                  title="Web Preview"
                  sandbox="allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts allow-downloads"
                  referrerPolicy="no-referrer"
                  loading="lazy"
                  onLoad={() => {
                    // console.log('Preview loaded');
                    injectNativeBridge();
                  }}
                />
              ) : files ? (
                <div className="w-full h-full flex flex-col">
                  {isNativeMode && (
                    <div className="h-6 bg-black/20 flex items-center justify-between px-4 shrink-0 text-[10px] font-medium text-white/70">
                      <span>12:30</span>
                      <div className="flex items-center gap-1.5">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M14 10h.01"/><path d="M18 6h.01"/></svg>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
                      </div>
                    </div>
                  )}
                  <div className="flex-1 overflow-hidden">
                    <WebProjectRenderer 
                      key={rendererKey}
                      files={files} 
                      webProjectUrl={null} 
                      showToolbar={false} 
                    />
                  </div>
                  {isNativeMode && (
                    <div className="h-12 bg-black/40 flex items-center justify-around px-8 shrink-0 border-t border-white/5">
                      <button onClick={handleGoBack} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                        <div className="w-3 h-3 border-2 border-white/40 rounded-sm rotate-45"></div>
                      </button>
                      <button onClick={handleRefresh} className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                        <div className="w-4 h-4 border-2 border-white/40 rounded-full"></div>
                      </button>
                      <button className="w-10 h-10 flex items-center justify-center hover:bg-white/5 rounded-full transition-colors">
                        <div className="w-3.5 h-3.5 border-2 border-white/40 rounded-md"></div>
                      </button>
                    </div>
                  )}
                </div>
              ) : null}
            </DeviceFrame>
          </div>
        </div>
      </div>
    </div>
  );
}
