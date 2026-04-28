/* eslint-disable no-useless-assignment */
/**
 * SelfHealingOrchestrator — Thin Compatibility Bridge
 *
 * File ini dipertahankan hanya untuk backward-compatibility dengan
 * semua komponen yang sudah mengimpor dari sini (e.g. GlobalRecoverySystem).
 * SELURUH implementasi aktual telah dipindahkan ke ResilienceEngine.ts agar
 * tidak ada duplikasi kode, duplikasi window-listener, atau duplikasi
 * circuit-breaker state.
 *
 * Mapping enum:
 *   OrchestratorStatus.HEALTHY    ↔  ServiceStatus.ONLINE
 *   OrchestratorStatus.UNSTABLE   ↔  ServiceStatus.DEGRADED
 *   OrchestratorStatus.CRITICAL   ↔  ServiceStatus.CIRCUIT_OPEN
 *   OrchestratorStatus.RECOVERING ↔  ServiceStatus.RECOVERING
 *   OrchestratorStatus.OFFLINE    ↔  ServiceStatus.OFFLINE
 */
import { Observable, map } from 'rxjs';
import { resilienceEngine, ServiceStatus } from './ResilienceEngine';

// ── Enum (kept for backward-compat) ──────────────────────────────────────────

export enum OrchestratorStatus {
  HEALTHY    = 'HEALTHY',
  UNSTABLE   = 'UNSTABLE',
  CRITICAL   = 'CRITICAL',
  RECOVERING = 'RECOVERING',
  OFFLINE    = 'OFFLINE',
}

// ── Config interface (kept for backward-compat) ───────────────────────────────

export interface OrchestratorConfig {
  maxRetries: number;
  backoffDelay: number;
  timeoutMs: number;
  failureThreshold: number;
}

// ── Mapping helpers ───────────────────────────────────────────────────────────

function toOrchestratorStatus(s: ServiceStatus): OrchestratorStatus {
  switch (s) {
    case ServiceStatus.ONLINE:       return OrchestratorStatus.HEALTHY;
    case ServiceStatus.DEGRADED:     return OrchestratorStatus.UNSTABLE;
    case ServiceStatus.CIRCUIT_OPEN: return OrchestratorStatus.CRITICAL;
    case ServiceStatus.RECOVERING:   return OrchestratorStatus.RECOVERING;
    case ServiceStatus.OFFLINE:      return OrchestratorStatus.OFFLINE;
    default:                         return OrchestratorStatus.HEALTHY;
  }
}

// ── Bridge class ─────────────────────────────────────────────────────────────

class SelfHealingOrchestratorBridge {
  /**
   * Returns an Observable<OrchestratorStatus> mapped from the unified ResilienceEngine.
   * Tidak ada listener window.online/offline tambahan — hanya satu per app.
   */
  public getStatus(): Observable<OrchestratorStatus> {
    return resilienceEngine.getStatus().pipe(map(toOrchestratorStatus));
  }

  public getCurrentStatus(): OrchestratorStatus {
    return toOrchestratorStatus(resilienceEngine.getCurrentStatus());
  }

  /**
   * Delegates to ResilienceEngine.execute with CRITICAL-state guard
   * mapped from OrchestratorStatus.CRITICAL → ServiceStatus.CIRCUIT_OPEN.
   */
  public async execute<T>(
    id: string,
    operation: () => Promise<T>,
    fallbackData?: T,
    customTimeout?: number,
  ): Promise<T> {
    return resilienceEngine.execute(id, operation, fallbackData, customTimeout);
  }

  /** Delegates to ResilienceEngine.immortalRead */
  public async immortalRead<T>(
    operation: () => Promise<T>,
    fallbackData: T,
  ): Promise<T> {
    return resilienceEngine.immortalRead(operation, fallbackData);
  }
}

export const selfHealingOrchestrator = new SelfHealingOrchestratorBridge();
