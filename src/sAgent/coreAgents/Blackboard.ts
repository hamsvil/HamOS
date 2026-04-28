/**
 * ════════════════════════════════════════════════════════════════
 * BLACKBOARD — Shared scratchpad antar-agent (Phase 3 + Phase 4)
 * ════════════════════════════════════════════════════════════════
 *
 * Pola klasik "Blackboard System": semua agent menulis temuannya
 * ke papan bersama, dan bisa membaca temuan agent lain sebelum
 * mengeksekusi sub-task. Memungkinkan kolaborasi tanpa langsung
 * memanggil agent lain (loose coupling).
 *
 * - Hybrid: jalan di Node maupun browser (in-memory map).
 * - Thread-safe untuk JS single-thread (semua mutasi sinkron).
 * - [Phase 4] Persistence lintas-sesi via PersistenceLayer:
 *     Browser → Dexie / IndexedDB
 *     Node    → JSON file di .sAgent_memory/
 * ════════════════════════════════════════════════════════════════
 */

import { PersistenceLayer } from './PersistenceLayer';

export interface BlackboardEntry {
  id: string;
  agentId: string;
  topic: string;
  content: string;
  timestamp: number;
  meta?: Record<string, any>;
}

export type BlackboardListener = (entry: BlackboardEntry) => void;

const DEFAULT_PERSIST_KEY = 'blackboard-global';

export class Blackboard {
  private static _instance: Blackboard | null = null;
  private entries: BlackboardEntry[] = [];
  private listeners: Set<BlackboardListener> = new Set();
  private maxEntries: number;
  private nextId = 1;
  private persistKey: string;
  private persistEnabled: boolean;
  private _loaded = false;

  constructor(maxEntries = 200, persistKey = DEFAULT_PERSIST_KEY, persist = true) {
    this.maxEntries = maxEntries;
    this.persistKey = persistKey;
    this.persistEnabled = persist;
  }

  /** Singleton bila dibutuhkan global, namun instance baru tetap diizinkan untuk isolasi. */
  public static getInstance(): Blackboard {
    if (!this._instance) this._instance = new Blackboard();
    return this._instance;
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4: Persistence API
  // ─────────────────────────────────────────────────────────────

  /**
   * Muat entries dari storage persisten (IDB/JSON).
   * Panggil sekali di awal sesi sebelum mulai post().
   * Idempotent — aman dipanggil berkali-kali.
   */
  public async loadFromStorage(): Promise<void> {
    if (!this.persistEnabled || this._loaded) return;
    try {
      const saved = await PersistenceLayer.load<BlackboardEntry[]>(this.persistKey);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        this.entries = saved.slice(-this.maxEntries);
        this.nextId = Math.max(0, ...this.entries.map(e => parseInt(e.id.replace('bb-', '')) || 0)) + 1;
        console.log(`[Blackboard] Loaded ${this.entries.length} entries from ${PersistenceLayer.backend}`);
      }
    } catch (e) {
      console.warn('[Blackboard] loadFromStorage gagal:', e);
    }
    this._loaded = true;
  }

  /** Simpan entries saat ini ke storage persisten. */
  private async persist(): Promise<void> {
    if (!this.persistEnabled) return;
    try {
      await PersistenceLayer.save(this.persistKey, this.entries);
    } catch (e) {
      console.warn('[Blackboard] persist gagal:', e);
    }
  }

  /** Hapus data persisten untuk blackboard ini. */
  public async clearStorage(): Promise<void> {
    await PersistenceLayer.delete(this.persistKey);
    this._loaded = false;
  }

  // ─────────────────────────────────────────────────────────────
  // Core API (Phase 3, tidak berubah)
  // ─────────────────────────────────────────────────────────────

  /** Reset isi blackboard (untuk test atau session baru). */
  public clear(): void {
    this.entries = [];
    this.nextId = 1;
  }

  /** Tulis temuan ke papan. Otomatis persist ke IDB/JSON (async fire-and-forget). */
  public post(agentId: string, topic: string, content: string, meta?: Record<string, any>): BlackboardEntry {
    const entry: BlackboardEntry = {
      id: `bb-${this.nextId++}`,
      agentId,
      topic,
      content,
      timestamp: Date.now(),
      meta,
    };
    this.entries.push(entry);
    if (this.entries.length > this.maxEntries) {
      this.entries.splice(0, this.entries.length - this.maxEntries);
    }
    for (const listener of this.listeners) {
      try { listener(entry); } catch { /* swallow — listener tidak boleh menjatuhkan poster */ }
    }
    // Phase 4: fire-and-forget persist setiap kali ada entry baru
    this.persist().catch(() => {});
    return entry;
  }

  /**
   * Baca entries. Filter opsional:
   *   - topic: substring match (case-insensitive)
   *   - agentId: exact match
   *   - sinceMs: hanya entries yang lebih baru dari timestamp ini
   *   - limit: maksimum jumlah entries (default 50, ambil yang TERBARU)
   */
  public read(filter: {
    topic?: string;
    agentId?: string;
    sinceMs?: number;
    limit?: number;
  } = {}): BlackboardEntry[] {
    const limit = filter.limit ?? 50;
    let result = this.entries;
    if (filter.agentId) result = result.filter(e => e.agentId === filter.agentId);
    if (filter.topic) {
      const t = filter.topic.toLowerCase();
      result = result.filter(e => e.topic.toLowerCase().includes(t));
    }
    if (filter.sinceMs) result = result.filter(e => e.timestamp >= filter.sinceMs!);
    return result.slice(-limit);
  }

  /** Snapshot ringkas (untuk inject ke prompt agent). */
  public snapshot(filter: { topic?: string; limit?: number } = {}): string {
    const entries = this.read({ ...filter, limit: filter.limit ?? 10 });
    if (entries.length === 0) return '(blackboard kosong)';
    return entries
      .map(e => `[${e.agentId}@${e.topic}] ${e.content.slice(0, 300)}`)
      .join('\n');
  }

  /** Subscribe ke entry baru. Return unsubscribe function. */
  public subscribe(listener: BlackboardListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  public size(): number {
    return this.entries.length;
  }

  /** Export semua entries (untuk persistence atau debug). */
  public export(): BlackboardEntry[] {
    return [...this.entries];
  }

  /** Import entries (dari file/snapshot eksternal). */
  public import(entries: BlackboardEntry[]): void {
    this.entries = [...entries];
    this.nextId = Math.max(0, ...entries.map(e => parseInt(e.id.replace('bb-', '')) || 0)) + 1;
    // Sync ke storage setelah import manual
    this.persist().catch(() => {});
  }

  /** Info status persistence untuk debugging. */
  public persistenceInfo(): { key: string; enabled: boolean; loaded: boolean; backend: string; size: number } {
    return {
      key: this.persistKey,
      enabled: this.persistEnabled,
      loaded: this._loaded,
      backend: PersistenceLayer.backend,
      size: this.entries.length,
    };
  }
}
