 
import { useEffect, useRef } from 'react';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';

export function useBrowserEvents(activeTabId: string, setLogs: React.Dispatch<React.SetStateAction<{level: string, message: string}[]>>, setNetworkRequests: React.Dispatch<React.SetStateAction<any[]>>, setCookies: (cookies: any[]) => void, iframeRefs: React.MutableRefObject<Map<string, HTMLIFrameElement>>) {
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'CONSOLE_LOG' || event.data?.type === 'HAM_CONSOLE_LOG') {
        const message = event.data.message || (event.data.payload && event.data.payload.args ? event.data.payload.args.join(' ') : '');
        const level = event.data.level || event.data.logType || 'log';
        
        setLogs(prev => [...prev, { level, message }]);
        hamEventBus.dispatch({
          id: `log_${Date.now()}`,
          type: HamEventType.BROWSER_STATE,
          timestamp: Date.now(),
          source: 'BROWSER',
          payload: { level, message: `Iframe Log: ${message}` }
        });
      } else if (event.data?.type === 'NETWORK_REQUEST') {
        setNetworkRequests(prev => [...prev, event.data]);
        hamEventBus.dispatch({
          id: `log_${Date.now()}`,
          type: HamEventType.BROWSER_STATE,
          timestamp: Date.now(),
          source: 'BROWSER',
          payload: { level: 'info', message: `Network Request: ${event.data.url}` }
        });
      } else if (event.data?.type === 'DOM_SNAPSHOT_RESULT') {
        hamEventBus.dispatch({
          id: `dom_snap_${Date.now()}`,
          type: HamEventType.BROWSER_STATE,
          timestamp: Date.now(),
          source: 'BROWSER',
          payload: { action: 'DOM_SNAPSHOT', snapshot: event.data.snapshot }
        });
      } else if (event.data?.type === 'COOKIES_CHANGED') {
        setCookies(event.data.cookies || []);
      } else if (event.data?.type === 'GET_DOM_SNAPSHOT') {
        const iframe = iframeRefs.current.get(activeTabId);
        if (iframe && iframe.contentWindow) {
          try {
            const currentDoc = iframe.contentWindow.document;
            const extractData = () => {
              const currentIframe = iframeRefs.current.get(activeTabId);
              if (!currentIframe || !currentIframe.contentWindow) return;
              
              const currentDoc = currentIframe.contentWindow.document;
              const snapshot = {
                url: currentIframe.contentWindow.location.href,
                title: currentDoc.title,
                semanticData: {
                  title: currentDoc.title,
                  meta: Array.from(currentDoc.querySelectorAll('meta')).map(m => ({ 
                    name: m.name || m.getAttribute('property'), 
                    content: m.content 
                  })).filter(m => m.name && m.content).slice(0, 50),
                  text: currentDoc.body ? currentDoc.body.innerText.replace(/\s+/g, ' ').trim().substring(0, 10000) : '',
                  links: Array.from(currentDoc.querySelectorAll('a')).map(a => ({ 
                    text: a.innerText.substring(0, 100), 
                    href: a.href 
                  })).slice(0, 50)
                },
                timestamp: Date.now()
              };
              
              hamEventBus.dispatch({
                id: `dom_snap_${Date.now()}`,
                type: HamEventType.BROWSER_STATE,
                timestamp: Date.now(),
                source: 'BROWSER',
                payload: { action: 'DOM_SNAPSHOT', snapshot }
              });
            };

            if ('requestIdleCallback' in window) {
              (window as any).requestIdleCallback(extractData, { timeout: 2000 });
            } else {
              setTimeout(extractData, 100);
            }
          } catch (e) {
            iframe.contentWindow.postMessage({ type: 'GET_DOM_SNAPSHOT' }, '*');
          }
        }
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [activeTabId, setLogs, setNetworkRequests, setCookies, iframeRefs]);
}
