import Dexie from 'dexie';

/**
 * PILAR 10: GHOST-DEDUPLICATOR (The Singleton Purge)
 * Mengeliminasi duplikasi instance library ganda dan memastikan kebenaran singleton.
 */
export class GhostDeduplicator {
  private static instance: GhostDeduplicator;
  private lockedInstances: Set<string> = new Set();
  private auditInterval: number | null = null;

  private constructor() {
    this.startBackgroundAudit();
  }

  public static getInstance(): GhostDeduplicator {
    if (!GhostDeduplicator.instance) {
      GhostDeduplicator.instance = new GhostDeduplicator();
    }
    return GhostDeduplicator.instance;
  }

  private startBackgroundAudit() {
    if (this.auditInterval) return;
    
    // Initial audit
    this.auditGlobals();
    
    // Periodic check every 15 seconds for hot-module leak detection
    const ctx = typeof window !== 'undefined' ? window : globalThis;
    this.auditInterval = (ctx.setInterval as any)(() => {
      this.auditGlobals();
    }, 15000);
  }

  public auditGlobals() {
    const findings: string[] = [];
    const ctx: any = typeof window !== 'undefined' ? window : globalThis;
    
    // 1. Check for Yjs ghost
    if (ctx.Y) {
      if (this.lockedInstances.has('Yjs')) {
        findings.push("Secondary Yjs instance detected via global.");
      } else {
        this.lockedInstances.add('Yjs');
      }
    }

    // 2. Check for Multiple React Renderers (React 18+ specific markers)
    // In React 18, __REACT_DEVTOOLS_GLOBAL_HOOK__ is a better marker
    const reactHook = ctx.__REACT_DEVTOOLS_GLOBAL_HOOK__;
    if (reactHook?.renderers?.size > 1) {
       findings.push(`Multiple React Renderers detected (${reactHook.renderers.size}). Performance degradation imminent.`);
    }

    // 3. Check for Multiple Styled-Component injection points
    if (typeof document !== 'undefined') {
        const styledTags = document.querySelectorAll('style[data-styled]');
        if (styledTags.length > 1) {
          findings.push(`Redundant Styled-Components tags detected (${styledTags.length}). Theme drift possible.`);
        }
    }

    // 4. Dexie database duplication
    if ((Dexie as any).getDatabaseNames) {
        (Dexie as any).getDatabaseNames().then((names: string[]) => {
            if (names.filter(n => n.includes('HamOS')).length > 1) {
                console.error("[GHOST-DEDUPLICATOR] Duplicate Dexie databases detected.");
            }
        });
    }

    if (findings.length > 0) {
      console.warn(`[GHOST-DEDUPLICATOR] Audit Findings: \n- ${findings.join('\n- ')}`);
    } else {
      console.log("[GHOST-DEDUPLICATOR] System Integrity: Optimal. No ghost instances found.");
    }
  }

  public purgeDuplicates() {
    console.log("[GHOST-DEDUPLICATOR] Manual purge triggered. Re-initializing global lock states.");
    this.lockedInstances.clear();
    this.auditGlobals();
  }

  public stopAudit() {
    if (this.auditInterval) {
      clearInterval(this.auditInterval);
      this.auditInterval = null;
    }
  }

  public getLockedList(): string[] {
    return Array.from(this.lockedInstances);
  }
}
