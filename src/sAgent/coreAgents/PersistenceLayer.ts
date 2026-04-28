/**
 * ════════════════════════════════════════════════════════════════
 * PERSISTENCE LAYER — Phase 4: Memori Lintas-Sesi
 * ════════════════════════════════════════════════════════════════
 *
 * Menyimpan dan memuat data agent (Blackboard + AutonomousAgent memory)
 * secara persisten lintas sesi dengan strategi hybrid:
 *
 *  Browser  → Dexie (IndexedDB wrapper), zero-config, async
 *  Node.js  → JSON file di <cwd>/.sAgent_memory/
 *
 * API tunggal: PersistenceLayer<T>
 *   .save(key, data)  → simpan
 *   .load(key)        → muat (null jika belum ada)
 *   .delete(key)      → hapus
 *   .clear()          → hapus semua
 * ════════════════════════════════════════════════════════════════
 */

export interface PersistenceRecord<T = unknown> {
  key: string;
  data: T;
  savedAt: number;
  version: number;
}

const SCHEMA_VERSION = 1;
const NODE_DIR = '.sAgent_memory';
const DB_NAME = 'sAgentPersistence';
const STORE_NAME = 'records';

// ─────────────────────────────────────────────────────────────────────────────
// Browser Backend — Dexie / IndexedDB
// ─────────────────────────────────────────────────────────────────────────────

type DexieInstance = {
  table: (name: string) => {
    get: (key: string) => Promise<PersistenceRecord | undefined>;
    put: (record: PersistenceRecord) => Promise<unknown>;
    delete: (key: string) => Promise<unknown>;
    clear: () => Promise<unknown>;
  };
};

let _dexieDb: DexieInstance | null = null;

async function getDexie(): Promise<DexieInstance> {
  if (_dexieDb) return _dexieDb;
  const { default: Dexie } = await import('dexie');
  const db = new Dexie(DB_NAME) as any;
  db.version(SCHEMA_VERSION).stores({
    [STORE_NAME]: 'key, savedAt',
  });
  _dexieDb = db;
  return db;
}

const browserBackend = {
  async save<T>(key: string, data: T): Promise<void> {
    const db = await getDexie();
    const record: PersistenceRecord<T> = { key, data, savedAt: Date.now(), version: SCHEMA_VERSION };
    await db.table(STORE_NAME).put(record);
  },

  async load<T>(key: string): Promise<T | null> {
    const db = await getDexie();
    const record = await db.table(STORE_NAME).get(key) as PersistenceRecord<T> | undefined;
    return record?.data ?? null;
  },

  async delete(key: string): Promise<void> {
    const db = await getDexie();
    await db.table(STORE_NAME).delete(key);
  },

  async clear(): Promise<void> {
    const db = await getDexie();
    await db.table(STORE_NAME).clear();
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Node.js Backend — JSON File
// ─────────────────────────────────────────────────────────────────────────────

async function getNodeDirPath(): Promise<string> {
  const path = await import('node:path');
  return path.resolve(process.cwd(), NODE_DIR);
}

async function getNodeFilePath(key: string): Promise<string> {
  const path = await import('node:path');
  const dir = await getNodeDirPath();
  const safeKey = key.replace(/[^a-zA-Z0-9_-]/g, '_');
  return path.join(dir, `${safeKey}.json`);
}

async function ensureNodeDir(): Promise<void> {
  const fs = await import('node:fs/promises');
  const dir = await getNodeDirPath();
  await fs.mkdir(dir, { recursive: true });
}

const nodeBackend = {
  async save<T>(key: string, data: T): Promise<void> {
    await ensureNodeDir();
    const fs = await import('node:fs/promises');
    const filePath = await getNodeFilePath(key);
    const record: PersistenceRecord<T> = { key, data, savedAt: Date.now(), version: SCHEMA_VERSION };
    await fs.writeFile(filePath, JSON.stringify(record, null, 2), 'utf8');
  },

  async load<T>(key: string): Promise<T | null> {
    try {
      const fs = await import('node:fs/promises');
      const filePath = await getNodeFilePath(key);
      const raw = await fs.readFile(filePath, 'utf8');
      const record: PersistenceRecord<T> = JSON.parse(raw);
      return record?.data ?? null;
    } catch {
      return null;
    }
  },

  async delete(key: string): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      const filePath = await getNodeFilePath(key);
      await fs.unlink(filePath);
    } catch {
      // File mungkin tidak ada, abaikan
    }
  },

  async clear(): Promise<void> {
    try {
      const fs = await import('node:fs/promises');
      const dir = await getNodeDirPath();
      const files = await fs.readdir(dir);
      await Promise.all(files.filter(f => f.endsWith('.json')).map(f => {
        return import('node:path').then(path => fs.unlink(path.join(dir, f)));
      }));
    } catch {
      // Dir mungkin tidak ada, abaikan
    }
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Unified PersistenceLayer
// ─────────────────────────────────────────────────────────────────────────────

const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';

export const PersistenceLayer = {
  /**
   * Simpan data ke storage persisten (IDB di browser, JSON di Node).
   * @param key  Nama unik untuk entri ini (mis. "blackboard-global", "memory-agent-1")
   * @param data  Data yang akan disimpan (harus JSON-serializable)
   */
  async save<T>(key: string, data: T): Promise<void> {
    try {
      if (isBrowser) {
        await browserBackend.save(key, data);
      } else {
        await nodeBackend.save(key, data);
      }
    } catch (e) {
      console.warn(`[PersistenceLayer] save(${key}) gagal:`, e);
    }
  },

  /**
   * Muat data dari storage persisten.
   * @returns Data yang disimpan sebelumnya, atau null jika belum ada.
   */
  async load<T>(key: string): Promise<T | null> {
    try {
      if (isBrowser) {
        return await browserBackend.load<T>(key);
      } else {
        return await nodeBackend.load<T>(key);
      }
    } catch (e) {
      console.warn(`[PersistenceLayer] load(${key}) gagal:`, e);
      return null;
    }
  },

  /**
   * Hapus satu entri dari storage.
   */
  async delete(key: string): Promise<void> {
    try {
      if (isBrowser) {
        await browserBackend.delete(key);
      } else {
        await nodeBackend.delete(key);
      }
    } catch (e) {
      console.warn(`[PersistenceLayer] delete(${key}) gagal:`, e);
    }
  },

  /**
   * Hapus SEMUA entri dari storage (reset total).
   */
  async clear(): Promise<void> {
    try {
      if (isBrowser) {
        await browserBackend.clear();
      } else {
        await nodeBackend.clear();
      }
    } catch (e) {
      console.warn(`[PersistenceLayer] clear() gagal:`, e);
    }
  },

  /** Apakah berjalan di browser (IndexedDB) atau Node (JSON file). */
  get backend(): 'browser-idb' | 'node-json' {
    return isBrowser ? 'browser-idb' : 'node-json';
  },
};
