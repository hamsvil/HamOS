import { useContext, useMemo } from 'react';
import { GlobalStateContext, StateScope } from '../contexts/GlobalStateContext';

export function useGlobalState(scope: StateScope) {
  const context = useContext(GlobalStateContext);
  if (!context) {
    throw new Error('useGlobalState must be used within a GlobalStateProvider');
  }

  const { state, setValue, clearScope } = context;

  return useMemo(() => ({
    data: state[scope],
    setValue: (key: string, value: any) => setValue(scope, key, value),
    clear: () => clearScope(scope)
  }), [state, scope, setValue, clearScope]);
}

export function useConversations() {
  return useGlobalState('conversations');
}

export function useSettings() {
  return useGlobalState('settings');
}

export function useUIState() {
  return useGlobalState('ui');
}
