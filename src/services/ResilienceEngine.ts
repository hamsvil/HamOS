/* eslint-disable no-useless-assignment */
/**
 * ResilienceEngine — Unified Resilience & Self-Healing Layer
 *
 * Menggabungkan semua kemampuan SelfHealingOrchestrator ke dalam satu
 * implementasi tunggal. SelfHealingOrchestrator.ts sekarang merupakan
 * thin bridge yang mendelegasikan ke sini — tidak ada duplikasi kode.
 *
 * Fitur:
 *  - Circuit Breaker dengan auto-reset 60 s
 *  - Exponential Back-off Retry via RxJS
 *  - Timeout per-operasi
 *  - Status ONLINE / DEGRADED / CIRCUIT_OPEN / RECOVERING
 *  - Satu pasang window.online/offline listener per aplikasi
 *  - immortalRead (serve from cache saat circuit terbuka)
 */
import {
  BehaviorSubject,
  Observable,
  from,
  of,
  throwError,
  timeout,
  catchError,
  delay,
  retry,
  tap,
  defer,
} from 'rxjs';
import { LoggerService } from './LoggerService';

export enum ServiceStatus {
  ONLINE       = 'ONLINE',
  OFFLINE      = 'OFFLINE',
  DEGRADED     = 'DEGRADED',
  CIRCUIT_OPEN = 'CIRCUIT_OPEN',
  RECOVERING   = 'RECOVERING',
}

export interface ResilienceConfig {
  maxRetries: number;
  backoffDelay: number;
  enableOfflineFallback: boolean;
  timeoutMs: number;
  circuitBreakerThreshold: number;
  /** Waktu tunggu (ms) sebelum circuit auto-reset ke RECOVERING. Default: 60000 */
  circuitResetDelayMs: number;
}

class ResilienceEngine {
  private status$ = new BehaviorSubject<ServiceStatus>(ServiceStatus.ONLINE);
  private failureCount: Record<string, number> = {};
  private circuitResetTimers: Record<string, ReturnType<typeof setTimeout>> = {};
  private networkListenerAttached = false;

  private config: ResilienceConfig = {
    maxRetries: 3,
    backoffDelay: 1000,
    enableOfflineFallback: true,
    timeoutMs: 30_000,
    circuitBreakerThreshold: 5,
    circuitResetDelayMs: 60_000,
  };

  constructor() {
    this.attachNetworkListener();
  }

  // ── Network listener (attached once) ──────────────────────────────────────

  private attachNetworkListener(): void {
    if (typeof window === 'undefined' || this.networkListenerAttached) return;
    this.networkListenerAttached = true;

    window.addEventListener('online', () => {
      LoggerService.info('ResilienceEngine', 'Network ONLINE — restoring service');
      if (
        this.status$.value === ServiceStatus.OFFLINE ||
        this.status$.value === ServiceStatus.CIRCUIT_OPEN
      ) {
        this.status$.next(ServiceStatus.RECOVERING);
        // Give the service a moment to stabilise before marking fully ONLINE
        setTimeout(() => {
          if (this.status$.value === ServiceStatus.RECOVERING) {
            this.status$.next(ServiceStatus.ONLINE);
            LoggerService.info('ResilienceEngine', 'Service fully ONLINE after recovery');
          }
        }, 3000);
      } else {
        this.status$.next(ServiceStatus.ONLINE);
      }
    });

    window.addEventListener('offline', () => {
      LoggerService.warn('ResilienceEngine', 'Network OFFLINE');
      this.status$.next(ServiceStatus.OFFLINE);
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────────

  public getStatus(): Observable<ServiceStatus> {
    return this.status$.asObservable();
  }

  public getCurrentStatus(): ServiceStatus {
    return this.status$.value;
  }

  /**
   * The Immortal Wrapper — wraps any async operation with full resilience.
   *
   * @param id          Unique identifier for this operation (used in logs & circuit breaker tracking)
   * @param operation   Async function to execute
   * @param fallbackData Optional value returned when all retries are exhausted
   * @param customTimeout Per-call timeout override in ms
   */
  public async execute<T>(
    id: string,
    operation: () => Promise<T>,
    fallbackData?: T,
    customTimeout?: number,
  ): Promise<T> {
    const currentStatus = this.status$.value;

    // Circuit is open — serve fallback immediately instead of hammering the service
    if (currentStatus === ServiceStatus.CIRCUIT_OPEN) {
      LoggerService.warn('ResilienceEngine', `Circuit OPEN for ${id} — using fallback`);
      if (fallbackData !== undefined) return fallbackData;
      throw new Error(`Circuit breaker is OPEN for "${id}". Service currently unavailable.`);
    }

    // Offline — skip network calls entirely when offline fallback is enabled
    if (
      currentStatus === ServiceStatus.OFFLINE &&
      this.config.enableOfflineFallback &&
      fallbackData !== undefined
    ) {
      LoggerService.warn('ResilienceEngine', `OFFLINE — serving fallback for ${id}`);
      return fallbackData;
    }

    LoggerService.info('ResilienceEngine', `Executing: ${id}`);

    return new Promise<T>((resolve, reject) => {
      defer(() => from(operation()))
        .pipe(
          timeout(customTimeout ?? this.config.timeoutMs),
          retry({
            count: this.config.maxRetries,
            delay: (error, retryCount) => {
              const wait = this.config.backoffDelay * Math.pow(2, retryCount - 1);
              LoggerService.warn(
                'ResilienceEngine',
                `Retry ${retryCount}/${this.config.maxRetries} for "${id}" in ${wait} ms`,
                error,
              );
              return of(null).pipe(delay(wait));
            },
          }),
          tap({
            next: () => {
              // Success — reset failure counter and heal status
              this.failureCount[id] = 0;
              if (
                this.status$.value === ServiceStatus.DEGRADED ||
                this.status$.value === ServiceStatus.RECOVERING
              ) {
                this.status$.next(ServiceStatus.ONLINE);
                LoggerService.info('ResilienceEngine', `Service restored for "${id}"`);
              }
            },
            error: () => {
              this.failureCount[id] = (this.failureCount[id] ?? 0) + 1;
              const count = this.failureCount[id];

              if (count >= this.config.circuitBreakerThreshold) {
                LoggerService.error('ResilienceEngine', `Circuit OPEN for "${id}" after ${count} failures`);
                this.status$.next(ServiceStatus.CIRCUIT_OPEN);

                // Clear any pending reset timer for this id
                if (this.circuitResetTimers[id]) clearTimeout(this.circuitResetTimers[id]);

                // Auto-reset: CIRCUIT_OPEN → RECOVERING → ONLINE
                this.circuitResetTimers[id] = setTimeout(() => {
                  LoggerService.info('ResilienceEngine', `Circuit resetting for "${id}" — entering RECOVERING`);
                  this.status$.next(ServiceStatus.RECOVERING);
                  this.failureCount[id] = 0;
                  delete this.circuitResetTimers[id];

                  setTimeout(() => {
                    if (this.status$.value === ServiceStatus.RECOVERING) {
                      this.status$.next(ServiceStatus.ONLINE);
                    }
                  }, 5000);
                }, this.config.circuitResetDelayMs);
              } else {
                this.status$.next(ServiceStatus.DEGRADED);
              }
            },
          }),
          catchError((err) => {
            LoggerService.error('ResilienceEngine', `Final failure for "${id}"`, err);
            if (this.config.enableOfflineFallback && fallbackData !== undefined) {
              LoggerService.info('ResilienceEngine', `Falling back for "${id}"`);
              this.status$.next(ServiceStatus.DEGRADED);
              return of(fallbackData);
            }
            return throwError(() => err);
          }),
        )
        .subscribe({
          next: (val) => resolve(val as T),
          error: (err) => reject(err),
        });
    });
  }

  /**
   * immortalRead — Safe read with cache fallback.
   * Skips the network when OFFLINE or CIRCUIT_OPEN, returns localCache instead.
   */
  public async immortalRead<T>(
    operation: () => Promise<T>,
    localCache: T,
  ): Promise<T> {
    const status = this.status$.value;
    if (status === ServiceStatus.OFFLINE || status === ServiceStatus.CIRCUIT_OPEN) {
      LoggerService.warn('ResilienceEngine', `immortalRead: Service ${status} — serving from cache`);
      return localCache;
    }
    try {
      return await operation();
    } catch {
      return localCache;
    }
  }

  /**
   * updateConfig — Merge partial config at runtime.
   */
  public updateConfig(partial: Partial<ResilienceConfig>): void {
    this.config = { ...this.config, ...partial };
  }
}

export const resilienceEngine = new ResilienceEngine();
