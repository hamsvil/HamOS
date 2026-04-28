 
import { useState, useEffect, useRef, useCallback } from 'react';
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { browserPilotService } from '../services/BrowserPilotService';

export function useBrowserPilot(activeTabId: string, activeTab: any, tabs: any[], navigateTab: any, addTab: any, closeTab: any, reloadTab: any, showToast: any, searchUrl: string, iframeRefs: React.MutableRefObject<Map<string, HTMLIFrameElement>>) {
  const lastBroadcastState = useRef<string>('');
  const broadcastTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastProcessedEventId = useRef<string | null>(null);

  useEffect(() => {
    if (broadcastTimeout.current) clearTimeout(broadcastTimeout.current);
    
    broadcastTimeout.current = setTimeout(() => {
      if (activeTab) {
        const currentState = JSON.stringify({
          id: activeTab.id,
          url: activeTab.url,
          title: activeTab.title,
          isLoading: activeTab.isLoading,
          tabCount: tabs.length
        });

        if (currentState !== lastBroadcastState.current) {
          lastBroadcastState.current = currentState;
          hamEventBus.dispatch({
            id: `browser_state_${Date.now()}`,
            type: HamEventType.BROWSER_STATE,
            timestamp: Date.now(),
            source: 'BROWSER',
            payload: {
              activeTab: {
                id: activeTab.id,
                url: activeTab.url,
                title: activeTab.title,
                isLoading: activeTab.isLoading
              },
              tabCount: tabs.length
            }
          });
        }
      }
    }, 200);

    return () => {
      if (broadcastTimeout.current) clearTimeout(broadcastTimeout.current);
    };
  }, [activeTab, tabs.length]);

  const handleBrowserAction = useCallback((action: string, payload: any) => {
    browserPilotService.executeAction(action, payload, {
      activeTabId,
      navigateTab,
      addTab,
      closeTab,
      reloadTab,
      showToast,
      searchUrl,
      getIframe: (id: string) => iframeRefs.current.get(id) || null
    });
  }, [activeTabId, navigateTab, addTab, closeTab, reloadTab, showToast, searchUrl, iframeRefs]);

  useEffect(() => {
    const unsubscribeControl = hamEventBus.subscribe(HamEventType.BROWSER_CONTROL, (event) => {
      if (event.id === lastProcessedEventId.current) return;
      lastProcessedEventId.current = event.id;
      const { action, payload } = event.payload;
      handleBrowserAction(action, payload);
    });

    const unsubscribeStop = hamEventBus.subscribe(HamEventType.AI_STOP, (event) => {
      if (event.id === lastProcessedEventId.current) return;
      lastProcessedEventId.current = event.id;
      handleBrowserAction('EMERGENCY_KILL', {});
    });

    return () => {
      unsubscribeControl();
      unsubscribeStop();
    };
  }, [handleBrowserAction]);

  return { handleBrowserAction };
}
