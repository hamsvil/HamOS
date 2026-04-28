import { useProjectStateStore } from '../store/projectState';

let debounceTimer: NodeJS.Timeout | null = null;
let currentVersion = 1;
const syncChannel = new BroadcastChannel('project_state_sync');

export const persistentState = {
  async hydrate() {
    try {
      const res = await fetch('/api/state');
      if (res.ok) {
        const state = await res.json();
        currentVersion = state.version || 1;
        useProjectStateStore.getState().hydrate(state);
      }
    } catch (error) {
      console.error('Failed to hydrate state:', error);
    }
  },

  persist(partial: any, retry = true) {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch('/api/state', {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'If-Match': String(currentVersion)
          },
          body: JSON.stringify(partial),
        });
        
        if (res.status === 409 && retry) {
          await this.hydrate();
          this.persist(partial, false);
        } else if (res.ok) {
          const newState = await res.json();
          currentVersion = newState.version;
          syncChannel.postMessage({ type: 'STATE_UPDATED', state: newState });
        }
      } catch (error) {
        console.error('Failed to persist state:', error);
      }
    }, 500);
  },

  init() {
    this.hydrate();
    
    useProjectStateStore.subscribe((state) => {
      const { theme, layout, openTabs, settings } = state;
      this.persist({ theme, layout, openTabs, settings });
    });

    syncChannel.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATED') {
        useProjectStateStore.getState().hydrate(event.data.state);
        currentVersion = event.data.state.version;
      }
    };
  }
};
