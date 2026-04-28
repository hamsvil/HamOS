/**
 * ════════════════════════════════════════════════════════════════
 * SWARM DIS — Digital Immune System Bridge (Phase 5)
 * ════════════════════════════════════════════════════════════════
 *
 * Menghubungkan AutonomousAgent swarm ke HamAiStudio sebagai
 * lapisan penyembuhan mandiri (self-healing). Bekerja di atas
 * SAERE v7 yang sudah ada — DIS tidak menggantikannya, tapi
 * melengkapinya dengan kecerdasan swarm yang lebih dalam.
 *
 * ALUR KERJA:
 *   1. Mendengarkan error via hamEventBus (SYSTEM_ERROR) +
 *      window event 'saere-notification' + global unhandledrejection
 *   2. Melakukan dedup + circuit-breaker (max 5 fix/menit)
 *   3. Routing error ke agent spesialis:
 *      - Security/Audit → The Sentinel (agent3)
 *      - Logic/State    → The Logic Gate (agent2)
 *      - UI/Component   → The Weaver (agent1)
 *      - Performance    → The Accelerator (agent4)
 *      - Runtime catch-all → The Surgeon (agent5)
 *   4. Mempublikasikan hasil ke Blackboard dan hamEventBus
 *      sebagai AI_ACTION_LOG agar UI bisa merender aktivitas.
 * ════════════════════════════════════════════════════════════════
 */

import { SwarmOrchestrator } from './SwarmOrchestrator';
import { Blackboard } from './Blackboard';
import { PersistenceLayer } from './PersistenceLayer';

export interface DISEvent {
  id: string;
  errorSnippet: string;
  agentId: string;
  agentName: string;
  status: 'queued' | 'healing' | 'resolved' | 'skipped';
  resolution?: string;
  timestamp: number;
  durationMs?: number;
}

export interface DISStatus {
  active: boolean;
  healing: boolean;
  totalIntercepted: number;
  totalResolved: number;
  totalSkipped: number;
  recentEvents: DISEvent[];
  lastActivity: number | null;
}

type DISListener = (status: DISStatus) => void;

// ─── Routing rules: keyword → agentId ───────────────────────────
const ERROR_ROUTING: Array<{ keywords: string[]; agentId: string; agentName: string }> = [
  { keywords: ['security', 'auth', 'xss', 'injection', 'csrf', 'cors', 'permission', 'unauthorized', 'forbidden'], agentId: 'agent3', agentName: 'The Sentinel' },
  { keywords: ['state', 'redux', 'context', 'race', 'null', 'undefined', 'cannot read', 'is not a function', 'typeerror'], agentId: 'agent2', agentName: 'The Logic Gate' },
  { keywords: ['render', 'component', 'hook', 'react', 'dom', 'ui', 'style', 'css', 'layout'], agentId: 'agent1', agentName: 'The Weaver' },
  { keywords: ['performance', 'memory', 'leak', 'slow', 'timeout', 'bundle', 'chunk'], agentId: 'agent4', agentName: 'The Accelerator' },
  { keywords: ['network', 'fetch', 'api', 'http', 'request', 'response', '404', '500', 'cors'], agentId: 'agent6', agentName: 'The Courier' },
  { keywords: ['database', 'sql', 'query', 'schema', 'migration', 'drizzle'], agentId: 'agent7', agentName: 'The Architect' },
];
const FALLBACK_AGENT = { agentId: 'agent5', agentName: 'The Surgeon' };

function routeError(msg: string): { agentId: string; agentName: string } {
  const lower = msg.toLowerCase();
  for (const rule of ERROR_ROUTING) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return { agentId: rule.agentId, agentName: rule.agentName };
    }
  }
  return FALLBACK_AGENT;
}

// ─── Circuit Breaker ─────────────────────────────────────────────
const CIRCUIT_WINDOW_MS = 60_000;
const CIRCUIT_MAX_FIXES = 5;
const DEDUP_WINDOW_MS = 30_000;
const MAX_RECENT_EVENTS = 50;

export class SwarmDIS {
  private static _instance: SwarmDIS | null = null;

  private orchestrator: SwarmOrchestrator | null = null;
  private blackboard: Blackboard;
  private _active = false;
  private _healing = false;
  private _booted = false;
  private queue: string[] = [];
  private processing = false;
  private recentHashes: Map<string, number> = new Map();
  private fixTimestamps: number[] = [];
  private status: DISStatus = {
    active: false, healing: false,
    totalIntercepted: 0, totalResolved: 0, totalSkipped: 0,
    recentEvents: [], lastActivity: null,
  };
  private listeners: Set<DISListener> = new Set();
  private unsubHamBus: (() => void) | null = null;
  private unsubSAERE: ((e: Event) => void) | null = null;
  private persistKey = 'swarm-dis-status';

  constructor() {
    this.blackboard = Blackboard.getInstance();
  }

  public static getInstance(): SwarmDIS {
    if (!this._instance) this._instance = new SwarmDIS();
    return this._instance;
  }

  // ─── Public API ──────────────────────────────────────────────────

  /** Aktifkan DIS. Akan melakukan lazy-boot swarm saat error pertama masuk. */
  public async activate(): Promise<void> {
    if (this._active) return;
    this._active = true;

    // Load persisted status
    await this.loadPersistedStatus();
    await this.blackboard.loadFromStorage();

    this._wireEventBus();
    this._wireSAERENotification();
    this._wireWindowErrors();

    this.emit();
    console.log('[SwarmDIS] Digital Immune System AKTIF.');
  }

  /** Nonaktifkan DIS dan lepaskan semua listener. */
  public deactivate(): void {
    if (!this._active) return;
    this._active = false;
    this._healing = false;
    this.unsubHamBus?.();
    if (this.unsubSAERE) window.removeEventListener('saere-notification', this.unsubSAERE);
    this.emit();
    console.log('[SwarmDIS] Digital Immune System NONAKTIF.');
  }

  public getStatus(): DISStatus {
    return { ...this.status, active: this._active, healing: this._healing };
  }

  public subscribe(listener: DISListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ─── Internal Wiring ────────────────────────────────────────────

  private _wireEventBus(): void {
    // Dynamically import hamEventBus (browser only, safe to import via dynamic)
    import('../../ham-synapse/core/event_bus').then(({ hamEventBus }) => {
      import('../../ham-synapse/core/types').then(({ HamEventType }) => {
        this.unsubHamBus = hamEventBus.subscribe(HamEventType.SYSTEM_ERROR, (event) => {
          const msg = event.payload?.message ?? JSON.stringify(event.payload ?? '');
          this._ingest(`[hamEventBus] ${msg}`);
        });
      });
    }).catch(() => {/* Node env — skip browser-only eventbus */});
  }

  private _wireSAERENotification(): void {
    if (typeof window === 'undefined') return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const msg = typeof detail === 'string' ? detail : JSON.stringify(detail ?? '');
      this._ingest(`[SAERE] ${msg}`);
    };
    this.unsubSAERE = handler;
    window.addEventListener('saere-notification', handler);
  }

  private _wireWindowErrors(): void {
    if (typeof window === 'undefined') return;
    window.addEventListener('unhandledrejection', (e) => {
      if (!this._active) return;
      this._ingest(`[UnhandledRejection] ${String(e.reason)}`);
    });
  }

  // ─── Ingestion & Queue ───────────────────────────────────────────

  private _ingest(rawMsg: string): void {
    if (!this._active) return;
    const snippet = rawMsg.slice(0, 300);
    const hash = this._hash(snippet);
    const now = Date.now();

    // Dedup: lewati jika error yang sama muncul dalam 30 detik
    const lastSeen = this.recentHashes.get(hash);
    if (lastSeen && now - lastSeen < DEDUP_WINDOW_MS) {
      return;
    }
    this.recentHashes.set(hash, now);
    // Cleanup old hashes
    for (const [k, v] of this.recentHashes) {
      if (now - v > DEDUP_WINDOW_MS * 2) this.recentHashes.delete(k);
    }

    // Circuit breaker: cek jumlah fix dalam 1 menit
    this.fixTimestamps = this.fixTimestamps.filter(t => now - t < CIRCUIT_WINDOW_MS);
    if (this.fixTimestamps.length >= CIRCUIT_MAX_FIXES) {
      console.warn('[SwarmDIS] Circuit breaker aktif — terlalu banyak perbaikan dalam 1 menit.');
      return;
    }

    this.status.totalIntercepted++;
    this.queue.push(snippet);
    this._drainQueue();
    this.emit();
  }

  private async _drainQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) return;
    this.processing = true;
    this._healing = true;
    this.emit();

    while (this.queue.length > 0) {
      const errorMsg = this.queue.shift()!;
      await this._healError(errorMsg);
    }

    this.processing = false;
    this._healing = false;
    this.emit();
  }

  private async _healError(errorMsg: string): Promise<void> {
    const { agentId, agentName } = routeError(errorMsg);
    const eventId = `dis-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const startTime = Date.now();

    const event: DISEvent = {
      id: eventId,
      errorSnippet: errorMsg.slice(0, 150),
      agentId, agentName,
      status: 'healing',
      timestamp: startTime,
    };
    this._addEvent(event);

    // Post ke blackboard agar agent lain aware
    this.blackboard.post('SwarmDIS', 'error-intercepted', errorMsg, { agentId, eventId });

    try {
      // Lazy boot swarm
      if (!this._booted) {
        await this._bootSwarm();
      }

      const task = `[DIGITAL IMMUNE SYSTEM — SELF-HEALING REQUEST]
Sebuah runtime error terdeteksi di HamAiStudio. Analisis dan berikan diagnosis + solusi konkret.

ERROR:
${errorMsg}

INSTRUKSI:
1. Identifikasi root cause dari error ini.
2. Berikan solusi/patch spesifik (baris kode jika perlu).
3. Jika error adalah false-positive atau tidak perlu perbaikan, katakan demikian.
4. Format respons: DIAGNOSIS | SOLUSI | PRIORITAS (HIGH/MED/LOW)
Jawab singkat dan actionable.`;

      const resolution = await this.orchestrator!.delegateTask(agentId, task);

      event.status = 'resolved';
      event.resolution = resolution.slice(0, 500);
      event.durationMs = Date.now() - startTime;
      this.status.totalResolved++;
      this.fixTimestamps.push(Date.now());

      // Publish hasil ke blackboard
      this.blackboard.post(agentId, 'dis-resolution', resolution, { eventId, durationMs: event.durationMs });

      // Emit ke hamEventBus sebagai AI_ACTION_LOG
      this._emitResolutionLog(agentName, errorMsg, resolution);

      // Persist updated status
      await this.persistStatus();

    } catch (e: any) {
      event.status = 'skipped';
      event.resolution = `[HEALING FAILED] ${e.message}`;
      event.durationMs = Date.now() - startTime;
      this.status.totalSkipped++;
      console.warn(`[SwarmDIS] Healing gagal untuk event ${eventId}:`, e.message);
    }

    this.status.lastActivity = Date.now();
    this._updateEvent(event);
    this.emit();
  }

  private async _bootSwarm(): Promise<void> {
    if (this._booted) return;
    this.orchestrator = new SwarmOrchestrator();
    await this.orchestrator.bootSwarm({});
    this._booted = true;
    console.log('[SwarmDIS] Swarm berhasil di-boot untuk DIS.');
  }

  private _emitResolutionLog(agentName: string, error: string, resolution: string): void {
    import('../../ham-synapse/core/event_bus').then(({ hamEventBus }) => {
      import('../../ham-synapse/core/types').then(({ HamEventType }) => {
        hamEventBus.dispatch({
          id: `dis-log-${Date.now()}`,
          type: HamEventType.AI_ACTION_LOG,
          timestamp: Date.now(),
          source: `SwarmDIS/${agentName}`,
          payload: {
            action: 'DIS_RESOLUTION',
            agentName,
            errorSnippet: error.slice(0, 100),
            resolution: resolution.slice(0, 200),
          },
        });
      });
    }).catch(() => {});
  }

  // ─── Persistence ─────────────────────────────────────────────────

  private async loadPersistedStatus(): Promise<void> {
    try {
      const saved = await PersistenceLayer.load<Partial<DISStatus>>(this.persistKey);
      if (saved) {
        this.status.totalIntercepted = saved.totalIntercepted ?? 0;
        this.status.totalResolved = saved.totalResolved ?? 0;
        this.status.totalSkipped = saved.totalSkipped ?? 0;
        this.status.recentEvents = saved.recentEvents ?? [];
        this.status.lastActivity = saved.lastActivity ?? null;
      }
    } catch { /* ignore */ }
  }

  private async persistStatus(): Promise<void> {
    try {
      await PersistenceLayer.save(this.persistKey, {
        totalIntercepted: this.status.totalIntercepted,
        totalResolved: this.status.totalResolved,
        totalSkipped: this.status.totalSkipped,
        recentEvents: this.status.recentEvents.slice(-20),
        lastActivity: this.status.lastActivity,
      });
    } catch { /* ignore */ }
  }

  // ─── Helpers ─────────────────────────────────────────────────────

  private _hash(str: string): string {
    let h = 0;
    for (let i = 0; i < str.length; i++) {
      h = Math.imul(31, h) + str.charCodeAt(i) | 0;
    }
    return String(h);
  }

  private _addEvent(event: DISEvent): void {
    this.status.recentEvents.unshift(event);
    if (this.status.recentEvents.length > MAX_RECENT_EVENTS) {
      this.status.recentEvents = this.status.recentEvents.slice(0, MAX_RECENT_EVENTS);
    }
  }

  private _updateEvent(updated: DISEvent): void {
    const idx = this.status.recentEvents.findIndex(e => e.id === updated.id);
    if (idx !== -1) this.status.recentEvents[idx] = updated;
  }

  private emit(): void {
    const s = this.getStatus();
    for (const l of this.listeners) {
      try { l(s); } catch { /* swallow */ }
    }
  }
}
