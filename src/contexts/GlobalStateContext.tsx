import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';

export type StateScope = 'conversations' | 'settings' | 'ui';

interface GlobalState {
  conversations: Record<string, any>;
  settings: Record<string, any>;
  ui: Record<string, any>;
}

interface GlobalStateContextType {
  state: GlobalState;
  setValue: (scope: StateScope, key: string, value: any) => void;
  clearScope: (scope: StateScope) => Promise<void>;
  lastSaved: Date | null;
  saveStatus: 'saved' | 'saving' | 'error';
}

const LOCAL_STORAGE_KEY = 'ham_global_state';
const FALLBACK_TOKEN = 'c9b3d0a2f9c32506d0c972a590bf127c8e8240413b0b3bcdc274208c77047417';
const LISA_TOKEN = import.meta.env.VITE_LISA_TOKEN || FALLBACK_TOKEN;

const initialState: GlobalState = {
  conversations: {},
  settings: {},
  ui: {},
};

export const GlobalStateContext = createContext<GlobalStateContextType | undefined>(undefined);

export const GlobalStateProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<GlobalState>(() => {
    const cached = localStorage.getItem(LOCAL_STORAGE_KEY);
    return cached ? JSON.parse(cached) : initialState;
  });
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error'>('saved');
  const [version, setVersion] = useState(0);
  
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pendingChangesRef = useRef<Partial<GlobalState>>({});

  useEffect(() => {
    const socket = io('/ui-update', {
      path: '/terminal-socket/',
    });

    socket.on('state:sync', (data: { scope: string, data: any }) => {
      setState(prev => ({
        ...prev,
        [data.scope]: {
          ...prev[data.scope as keyof GlobalState],
          ...data.data
        }
      }));
    });

    socket.on('component:refresh', (data: { componentName: string }) => {
      if (data.componentName === '*') {
        setVersion(v => v + 1);
      }
    });

    return () => {
      socket.off('state:sync');
      socket.off('component:refresh');
      socket.disconnect();
    };
  }, []);

  const syncWithServer = useCallback(async () => {
    try {
      const response = await fetch('/api/state/load?scope=all', {
        headers: {
          'Authorization': `Bearer ${LISA_TOKEN}`
        }
      });
      if (response.ok) {
        const serverState = await response.json();
        const newState = { ...state, ...serverState };
        setState(newState);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      }
    } catch (error) {
      console.warn('[GlobalState] Server sync failed, using localStorage', error);
    }
  }, []);

  useEffect(() => {
    syncWithServer();
  }, [syncWithServer]);

  const persistToServer = useCallback(async (updates: Partial<GlobalState>) => {
    setSaveStatus('saving');
    try {
      const response = await fetch('/api/state/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${LISA_TOKEN}`
        },
        body: JSON.stringify(updates)
      });
      if (response.ok) {
        setSaveStatus('saved');
        setLastSaved(new Date());
      } else {
        setSaveStatus('error');
      }
    } catch (error) {
      console.error('[GlobalState] Save failed', error);
      setSaveStatus('error');
    }
  }, []);

  const setValue = useCallback((scope: StateScope, key: string, value: any) => {
    setState(prev => {
      const newState = {
        ...prev,
        [scope]: {
          ...prev[scope],
          [key]: value
        }
      };
      
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      
      // Debounce server save
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      
      pendingChangesRef.current = {
        ...pendingChangesRef.current,
        [scope]: newState[scope]
      };

      saveTimeoutRef.current = setTimeout(() => {
        persistToServer(pendingChangesRef.current);
        pendingChangesRef.current = {};
      }, 800);

      return newState;
    });
  }, [persistToServer]);

  const clearScope = useCallback(async (scope: StateScope) => {
    setState(prev => {
      const newState = {
        ...prev,
        [scope]: {}
      };
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(newState));
      return newState;
    });

    try {
      const response = await fetch(`/api/state/clear?scope=${scope}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${LISA_TOKEN}`
        }
      });
      if (!response.ok) {
        console.error('[GlobalState] Clear scope failed on server');
      }
    } catch (error) {
      console.error('[GlobalState] Clear scope failed', error);
    }
  }, []);

  return (
    <GlobalStateContext.Provider value={{ state, setValue, clearScope, lastSaved, saveStatus }}>
      {children}
    </GlobalStateContext.Provider>
  );
};
