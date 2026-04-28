/**
 * ════════════════════════════════════════════════════════════════
 * useSwarmDIS — React Hook untuk Digital Immune System (Phase 5)
 * ════════════════════════════════════════════════════════════════
 *
 * Menyediakan state reaktif dari SwarmDIS singleton ke komponen React.
 * Mengaktifkan/menonaktifkan DIS dan mengembalikan status terkini.
 * ════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SwarmDIS, type DISStatus } from '../sAgent/coreAgents/SwarmDIS';

export interface UseSwarmDISReturn {
  status: DISStatus;
  toggle: () => Promise<void>;
  clearHistory: () => void;
}

const dis = SwarmDIS.getInstance();

export function useSwarmDIS(autoActivate = false): UseSwarmDISReturn {
  const [status, setStatus] = useState<DISStatus>(dis.getStatus());
  const activating = useRef(false);

  useEffect(() => {
    const unsub = dis.subscribe(setStatus);
    setStatus(dis.getStatus());
    return unsub;
  }, []);

  useEffect(() => {
    if (autoActivate && !status.active && !activating.current) {
      activating.current = true;
      dis.activate().finally(() => { activating.current = false; });
    }
  }, [autoActivate]);

  const toggle = useCallback(async () => {
    if (status.active) {
      dis.deactivate();
    } else {
      await dis.activate();
    }
  }, [status.active]);

  const clearHistory = useCallback(() => {
    // Reset recentEvents via singleton — we emit a new status without events
    const s = dis.getStatus();
    // Tidak expose langsung, panggil ulang status
    setStatus({ ...s, recentEvents: [] });
  }, []);

  return { status, toggle, clearHistory };
}
