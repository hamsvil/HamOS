 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ShieldCheck, Globe, Sparkles } from 'lucide-react';
import { ReaderMode } from './ReaderMode';

interface BrowserContentProps {
  id?: string;
  url: string;
  isActive: boolean;
  reloadKey?: number;
  zoomLevel?: number;
  isReaderMode?: boolean;
  onCloseReaderMode?: () => void;
  onLoadStart: () => void;
  onLoadEnd: () => void;
  onError: (error: any) => void;
  onUrlChange?: (url: string) => void;
  incognitoMode?: boolean;
}

interface VisionTarget {
  x: number;
  y: number;
  width: number;
  height: number;
  label?: string;
  color?: string;
}

const getProxyUrl = (targetUrl: string) => {
  if (!targetUrl || targetUrl === 'about:blank') return targetUrl;
  try {
    new URL(targetUrl);
    return `/ham-api/proxy?url=${encodeURIComponent(targetUrl)}`;
  } catch (e) {
    return targetUrl;
  }
};

export const BrowserContent = React.memo(React.forwardRef<HTMLIFrameElement, BrowserContentProps>(({
  id, url, isActive, reloadKey, zoomLevel = 1, isReaderMode = false, onCloseReaderMode, onLoadStart, onLoadEnd, onError, onUrlChange, incognitoMode = false
}, forwardedRef) => {
  const [visionTarget, setVisionTarget] = useState<VisionTarget | null>(null);
  const [isIframeLoading, setIsIframeLoading] = useState(true);
  const [hasError, setHasError] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [useProxyOverride, setUseProxyOverride] = useState<boolean | null>(null);
  const internalIframeRef = useRef<HTMLIFrameElement>(null);
  const iframeRef = (forwardedRef as React.MutableRefObject<HTMLIFrameElement>) || internalIframeRef;
  const loadTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  // PROTOKOL FIX: Track vision target timer with a ref so it can be properly cancelled.
  // Previously the `return () => clearTimeout(timer)` was inside an event subscriber callback
  // which is NOT a React cleanup function — it was silently ignored, causing a timer memory leak.
  const visionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Stable refs for callbacks to prevent stale closures in message handlers
  const retryCountRef = useRef(retryCount);
  const useProxyOverrideRef = useRef(useProxyOverride);
  const isIframeLoadingRef = useRef(isIframeLoading);
  const urlRef = useRef(url);
  const onUrlChangeRef = useRef(onUrlChange);
  const onLoadEndRef = useRef(onLoadEnd);
  const onErrorRef = useRef(onError);

  useEffect(() => { retryCountRef.current = retryCount; }, [retryCount]);
  useEffect(() => { useProxyOverrideRef.current = useProxyOverride; }, [useProxyOverride]);
  useEffect(() => { isIframeLoadingRef.current = isIframeLoading; }, [isIframeLoading]);
  useEffect(() => { urlRef.current = url; }, [url]);
  useEffect(() => { onUrlChangeRef.current = onUrlChange; }, [onUrlChange]);
  useEffect(() => { onLoadEndRef.current = onLoadEnd; }, [onLoadEnd]);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);

  const effectiveUrl = useProxyOverride === true
    ? `/ham-api/proxy?url=${encodeURIComponent(url)}`
    : useProxyOverride === false
      ? url
      : getProxyUrl(url);

  const handleSelfHealing = useCallback((strategy: 'direct' | 'proxy' | 'reload') => {
    setHasError(false);
    setIsIframeLoading(true);
    setRetryCount(c => c + 1);
    if (strategy === 'direct') setUseProxyOverride(false);
    if (strategy === 'proxy') setUseProxyOverride(true);
  }, []);

  // PROTOKOL FIX: Effect 1 — only reset on URL/reloadKey change.
  // BUG FIX: Previously deps included [url, reloadKey, retryCount, useProxyOverride] causing
  // infinite reset loop — retryCount(0) was called every time handleSelfHealing set retryCount.
  useEffect(() => {
    setIsIframeLoading(true);
    setHasError(false);
    setRetryCount(0);
    setUseProxyOverride(null);
    onLoadStart();

    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    loadTimeoutRef.current = setTimeout(() => {
      console.warn(`[Quantum Browser] Initial load timeout (15000ms) for ${url}. Triggering proxy self-healing.`);
      handleSelfHealing('proxy');
    }, 15000);

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [url, reloadKey]);

  // PROTOKOL FIX: Effect 2 — adaptive timeout on retry (retryCount > 0).
  // Separated from Effect 1 to prevent reset loop.
  useEffect(() => {
    if (retryCount === 0) return;

    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);

    const adaptiveTimeout = 15000 + (retryCount * 5000);

    loadTimeoutRef.current = setTimeout(() => {
      console.warn(`[Quantum Browser] Retry timeout (${adaptiveTimeout}ms), attempt ${retryCount} for ${url}.`);

      if (retryCount < 3) {
        if (useProxyOverride === true) {
          handleSelfHealing('direct');
        } else {
          handleSelfHealing('reload');
        }
      } else {
        setHasError(true);
        setIsIframeLoading(false);
        onError(new Error('Connection Timeout (Adaptive)'));
      }
    }, adaptiveTimeout);

    return () => {
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, [retryCount, useProxyOverride]);

  // PROTOKOL FIX: Vision target subscription with proper timer cleanup.
  // The timer ref is used to cancel any pending "clear vision" timeout before
  // setting a new one — preventing stale timers from accumulating.
  useEffect(() => {
    const unsubVision = hamEventBus.subscribe(HamEventType.AI_VISION_TARGET, (event) => {
      setVisionTarget(event.payload);
      if (event.payload) {
        if (visionTimerRef.current) clearTimeout(visionTimerRef.current);
        visionTimerRef.current = setTimeout(() => {
          setVisionTarget(null);
          visionTimerRef.current = null;
        }, 3000);
      }
    });

    const unsubStop = hamEventBus.subscribe(HamEventType.AI_STOP, () => {
      if (visionTimerRef.current) {
        clearTimeout(visionTimerRef.current);
        visionTimerRef.current = null;
      }
      setVisionTarget(null);
    });

    return () => {
      unsubVision();
      unsubStop();
      if (visionTimerRef.current) {
        clearTimeout(visionTimerRef.current);
        visionTimerRef.current = null;
      }
    };
  }, []);

  // PROTOKOL FIX: Message handler uses stable refs instead of stale closure values.
  // Previously `retryCount` and `useProxyOverride` were captured at effect creation time
  // and were stale for any subsequent retries within the same effect lifecycle.
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.source !== iframeRef.current?.contentWindow) return;

      if (event.data?.type === 'PROXY_HEARTBEAT' || event.data?.type === 'HEARTBEAT_PONG' || event.data?.type === 'FUNCTIONAL_HEARTBEAT') {
        if (loadTimeoutRef.current) {
          clearTimeout(loadTimeoutRef.current);
          if (isIframeLoadingRef.current) {
            const adaptiveTimeout = 15000 + (retryCountRef.current * 5000);
            loadTimeoutRef.current = setTimeout(() => {
              setHasError(true);
              setIsIframeLoading(false);
              onErrorRef.current(new Error('Neural Link Lost (Functional Timeout)'));
            }, adaptiveTimeout);
          }
        }

        if (event.data?.type === 'FUNCTIONAL_HEARTBEAT' && event.data.isReady && isIframeLoadingRef.current) {
          // console.log("[Quantum Browser] Functional readiness detected via heartbeat.");
          handleLoadViaRef();
        }
        return;
      }

      if (event.data?.type === 'URL_CHANGED' && onUrlChangeRef.current) {
        const newUrl = event.data.url;
        if (newUrl && newUrl !== 'about:blank') {
          // Dispatch to hamEventBus
          hamEventBus.dispatch({
            id: `url_change_${Date.now()}`,
            type: HamEventType.BROWSER_STATE,
            timestamp: Date.now(),
            source: 'INTERNAL_BROWSER',
            payload: { url: newUrl }
          });
          
          if (newUrl.includes('/api/proxy?url=')) {
            try {
              const urlParams = new URLSearchParams(new URL(newUrl).search);
              const originalUrl = urlParams.get('url');
              if (originalUrl && originalUrl !== urlRef.current) {
                onUrlChangeRef.current(originalUrl);
              }
            } catch (e) { /* invalid URL, skip */ }
          } else if (newUrl !== urlRef.current && newUrl !== getProxyUrl(urlRef.current)) {
            onUrlChangeRef.current(newUrl);
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
    };
  }, []); // Stable: uses refs for all dynamic values

  // Extracted load logic using refs — safe to call from stable message handler
  const handleLoadViaRef = useCallback(() => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    setIsIframeLoading(false);
    setHasError(false);
    onLoadEndRef.current();

    // Inject interceptor script after load
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const targetUrl = urlRef.current;
      iframeRef.current.contentWindow.postMessage({
        type: 'INJECT_SCRIPT',
        script: `
          (function() {
            // Forward URL changes
            window.parent.postMessage({ type: 'URL_CHANGED', url: window.location.href }, '*');
            
            // Console interception
            ['log', 'warn', 'error'].forEach(level => {
              const original = console[level];
              console[level] = (...args) => {
                window.parent.postMessage({ type: 'CONSOLE_LOG', level, message: args.join(' ') }, '*');
                original.apply(console, args);
              };
            });

            // Fetch interception
            const originalFetch = window.fetch;
            window.fetch = async (...args) => {
              const res = await originalFetch(...args);
              window.parent.postMessage({ type: 'NETWORK_REQUEST', url: args[0], status: res.status }, '*');
              return res;
            };
          })();
        `
      }, '*');
    }

    if (iframeRef.current) {
      try {
        const currentUrl = iframeRef.current.contentWindow?.location.href;
        if (currentUrl && currentUrl !== 'about:blank' && onUrlChangeRef.current) {
          if (currentUrl.includes('/api/proxy?url=')) {
            const urlParams = new URLSearchParams(new URL(currentUrl).search);
            const originalUrl = urlParams.get('url');
            if (originalUrl && originalUrl !== urlRef.current) {
              onUrlChangeRef.current(originalUrl);
            }
          } else if (currentUrl !== urlRef.current && currentUrl !== getProxyUrl(urlRef.current)) {
            onUrlChangeRef.current(currentUrl);
          }
        }

        const doc = iframeRef.current.contentDocument || iframeRef.current.contentWindow?.document;
        if (doc && doc.body) {
          const bodyText = doc.body.innerText?.trim();
          const childCount = doc.body.children.length;

          if (bodyText && bodyText.startsWith('{"error":"Proxy failed"')) {
            console.warn("[Quantum Browser] Proxy failed. Triggering auto-failover.");
            if (retryCountRef.current < 3) {
              handleSelfHealing(useProxyOverrideRef.current === true ? 'direct' : 'proxy');
            } else {
              setHasError(true);
              if (onErrorRef.current) onErrorRef.current(new Error('Proxy Failed'));
            }
            return;
          }

          const hasVisibleContent = () => {
            if (bodyText && bodyText.length > 0) return true;
            if (childCount > 0) {
              for (let i = 0; i < doc.body.children.length; i++) {
                const rect = doc.body.children[i].getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) return true;
              }
            }
            if (doc.querySelector('canvas')) return true;
            if (doc.querySelector('video')) return true;
            if (doc.querySelector('svg')) return true;
            return false;
          };

          if (!hasVisibleContent()) {
            console.warn("[Quantum Browser] Blank screen detected. Triggering auto-failover.");
            if (retryCountRef.current < 3) {
              handleSelfHealing(useProxyOverrideRef.current === true ? 'direct' : 'proxy');
            } else {
              setHasError(true);
              if (onErrorRef.current) onErrorRef.current(new Error('Blank Screen Detected'));
            }
          }
        }
      } catch (e) {
        // Cross-origin error expected, ignore
      }
    }
  }, [handleSelfHealing]);

  const handleLoad = useCallback(() => {
    handleLoadViaRef();
  }, [handleLoadViaRef]);

  const handleIframeError = useCallback((e: any) => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    console.error("Quantum Browser Load Error:", e);

    if (retryCountRef.current < 3) {
      handleSelfHealing(useProxyOverrideRef.current === true ? 'direct' : 'proxy');
    } else {
      setHasError(true);
      setIsIframeLoading(false);
      onErrorRef.current(e);
    }
  }, [handleSelfHealing]);

  return (
    <div className="w-full h-full bg-[var(--bg-primary)] relative overflow-hidden">
      <AnimatePresence mode="wait">
        {isIframeLoading && !isReaderMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-40 bg-[var(--bg-primary)] flex flex-col items-center justify-center gap-4"
          >
            <div className="relative">
              <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
              <Globe className="w-4 h-4 text-[var(--text-secondary)] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xs font-medium text-[var(--text-primary)] animate-pulse">Establishing Secure Neural Uplink...</span>
              <span className="text-[10px] text-[var(--text-secondary)] opacity-50 truncate max-w-[200px]">{url}</span>
              {retryCount > 0 && (
                <span className="text-[10px] text-amber-500 font-bold mt-1">Self-Healing Attempt: {retryCount}</span>
              )}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1 bg-green-500/10 rounded-full border border-green-500/20">
              <ShieldCheck size={10} className="text-green-500" />
              <span className="text-[9px] font-bold text-green-500 uppercase tracking-widest">Singularity Engine v9 Active</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {hasError && !isReaderMode && (
        <div className="absolute inset-0 z-30 bg-[var(--bg-primary)] flex flex-col items-center justify-center p-8 text-center gap-4">
          <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
            <ShieldCheck size={32} className="text-red-500 opacity-50" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-bold text-red-500">Connection Interrupted</h3>
            <p className="text-xs text-[var(--text-secondary)] max-w-xs">The Singularity Engine could not establish a secure connection to the target node. This may be due to security protocols, network instability, or cross-origin restrictions.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 mt-2">
            <button
              onClick={() => handleSelfHealing('reload')}
              className="px-4 py-2 bg-blue-500/10 text-blue-500 border border-blue-500/30 text-xs font-bold rounded-lg hover:bg-blue-500/20 transition-colors"
            >
              Retry Connection
            </button>
            <button
              onClick={() => handleSelfHealing('proxy')}
              className="px-4 py-2 bg-violet-500/10 text-violet-500 border border-violet-500/30 text-xs font-bold rounded-lg hover:bg-violet-500/20 transition-colors"
            >
              Force Proxy
            </button>
            <button
              onClick={() => handleSelfHealing('direct')}
              className="px-4 py-2 bg-amber-500/10 text-amber-500 border border-amber-500/30 text-xs font-bold rounded-lg hover:bg-amber-500/20 transition-colors"
            >
              Direct Connect
            </button>
          </div>
        </div>
      )}

      {isReaderMode ? (
        <ReaderMode url={url} onClose={() => onCloseReaderMode?.()} />
      ) : (
        <div
          className="w-full h-full origin-top-left transition-transform duration-300"
          style={{
            transform: `scale(${zoomLevel})`,
            width: `${100 / zoomLevel}%`,
            height: `${100 / zoomLevel}%`
          }}
        >
          <iframe
            id={id}
            ref={iframeRef}
            key={`${reloadKey || 0}-${retryCount}-${useProxyOverride}`}
            src={effectiveUrl}
            className={`w-full h-full border-0 transition-opacity duration-500 ${isIframeLoading ? 'opacity-0' : 'opacity-100'}`}
            onLoad={handleLoad}
            onError={handleIframeError}
            title="Browser Content"
            referrerPolicy="no-referrer"
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-downloads"
          />
        </div>
      )}

      {/* AI Vision Overlay Layer */}
      {visionTarget && !isReaderMode && (
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="absolute pointer-events-none border-2 z-50 transition-all duration-300 ease-out"
          style={{
            left: `${visionTarget.x}px`,
            top: `${visionTarget.y}px`,
            width: `${visionTarget.width}px`,
            height: `${visionTarget.height}px`,
            borderColor: visionTarget.color || '#a78bfa',
            backgroundColor: `${visionTarget.color || '#a78bfa'}22`,
            boxShadow: `0 0 20px ${visionTarget.color || '#a78bfa'}66`
          }}
        >
          {visionTarget.label && (
            <div
              className="absolute -top-7 left-0 px-2.5 py-1 bg-violet-600 text-white text-[10px] font-bold rounded-t-md whitespace-nowrap shadow-lg flex items-center gap-1.5"
              style={{ backgroundColor: visionTarget.color || '#7c3aed' }}
            >
              <Sparkles size={10} className="animate-pulse" />
              {visionTarget.label}
            </div>
          )}

          <div className="absolute inset-0 overflow-hidden">
            <div className="w-full h-1 bg-white/40 absolute top-0 animate-[scan_2s_infinite]" />
          </div>
        </motion.div>
      )}

      <style>{`
        @keyframes scan {
          0% { top: 0; opacity: 0; }
          20% { opacity: 1; }
          80% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}));
