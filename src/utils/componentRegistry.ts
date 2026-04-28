class ComponentRegistry {
  private listeners: Map<string, Set<() => void>> = new Map();

  register(id: string, refreshFn: () => void) {
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(refreshFn);
  }

  unregister(id: string, refreshFn: () => void) {
    const set = this.listeners.get(id);
    if (set) {
      set.delete(refreshFn);
      if (set.size === 0) {
        this.listeners.delete(id);
      }
    }
  }

  refresh(id: string) {
    const set = this.listeners.get(id);
    if (set) {
      set.forEach(fn => fn());
    }
  }

  refreshAll() {
    this.listeners.forEach(set => {
      set.forEach(fn => fn());
    });
  }
}

export const componentRegistry = new ComponentRegistry();
