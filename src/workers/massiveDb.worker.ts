/* eslint-disable no-useless-assignment */
import sqlite3InitModule from '@sqlite.org/sqlite-wasm';

let db: any = null;
let sqlite3Instance: any = null;

async function initDb(forceRecreate = false) {
  try {
    if (!sqlite3Instance) {
      sqlite3Instance = await sqlite3InitModule();
    }
    const sqlite3 = sqlite3Instance;
    
    if ('opfs' in sqlite3) {
      if (forceRecreate) {
        try {
          const root = await navigator.storage.getDirectory();
          // @ts-ignore - entries() is an async iterator
          for await (const [name] of root.entries()) {
            if (name.startsWith('ham_os_massive.sqlite3')) {
              await root.removeEntry(name);
            }
          }
          // console.log('Deleted corrupted OPFS database and related files');
        } catch (e) {
          console.warn('Failed to delete OPFS database', e);
        }
      }
      db = new sqlite3.oo1.OpfsDb('/ham_os_massive.sqlite3');
      // console.log('SQLite OPFS Database initialized in Worker');
    } else {
      db = new sqlite3.oo1.DB('/ham_os_massive.sqlite3', 'ct');
      // console.log('SQLite Memory Database initialized in Worker (OPFS not supported)');
    }
    
    setupTables();
    self.postMessage({ type: 'INIT_SUCCESS' });
  } catch (err: any) {
    console.error('Failed to initialize SQLite WASM in Worker', err);
    self.postMessage({ type: 'ERROR', payload: err.message });
  }
}

async function handleDbError(err: any, id: string, type: string) {
  const errMsg = err.message || String(err);
  console.error(`DB Error in ${type}:`, errMsg);
  
  if (errMsg.includes('SQLITE_CORRUPT') || errMsg.includes('disk I/O error') || errMsg.includes('database disk image is malformed')) {
    console.warn('Database corruption detected. Initiating auto-healing...');
    if (db) {
      try { db.close(); } catch (e) {}
      db = null;
    }
    await initDb(true);
    self.postMessage({ id, type: 'ERROR', payload: 'Database corrupted and auto-healed. Please retry the operation.' });
  } else {
    self.postMessage({ id, type: 'ERROR', payload: errMsg });
  }
}

function setupTables() {
  if (!db) return;
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS vector_embeddings (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL,
      embedding BLOB NOT NULL,
      metadata TEXT,
      timestamp INTEGER
    );
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS doc_relationships (
      doc_id_a TEXT NOT NULL,
      doc_id_b TEXT NOT NULL,
      relationship_type TEXT NOT NULL,
      score REAL DEFAULT 1.0,
      PRIMARY KEY (doc_id_a, doc_id_b)
    );
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS ast_cache (
      file_path TEXT PRIMARY KEY,
      ast_json TEXT NOT NULL,
      hash TEXT NOT NULL
    );
  `);

  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_vector_embeddings_timestamp ON vector_embeddings(timestamp);
  `);
  
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_doc_relationships_doc_id_b ON doc_relationships(doc_id_b);
  `);
}

self.onmessage = async (e: MessageEvent) => {
  const { id, type, payload } = e.data;
  
  if (type === 'INIT') {
    await initDb();
  } else if (type === 'INSERT_EMBEDDING') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { docId, content, embeddingArray, metadata } = payload;
      const embeddingBlob = new Uint8Array(embeddingArray.buffer);
      db.exec({
        sql: 'INSERT OR REPLACE INTO vector_embeddings (id, content, embedding, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
        bind: [docId, content, embeddingBlob, JSON.stringify(metadata), Date.now()]
      });
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'BATCH_INSERT_EMBEDDINGS') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { items } = payload;
      db.exec('BEGIN TRANSACTION');
      for (const item of items) {
        const { docId, content, embeddingArray, metadata } = item;
        const embeddingBlob = new Uint8Array(embeddingArray.buffer);
        db.exec({
          sql: 'INSERT OR REPLACE INTO vector_embeddings (id, content, embedding, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
          bind: [docId, content, embeddingBlob, JSON.stringify(metadata), Date.now()]
        });
      }
      db.exec('COMMIT');
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      try { db.exec('ROLLBACK'); } catch (e) {}
      await handleDbError(err, id, type);
    }
  } else if (type === 'GET_ALL_EMBEDDINGS') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const results: any[] = [];
      db.exec({
        sql: 'SELECT id, content, embedding, metadata FROM vector_embeddings',
        rowMode: 'object',
        callback: (row: any) => {
          results.push({
            id: row.id,
            content: row.content,
            embedding: new Float32Array(row.embedding.buffer),
            metadata: JSON.parse(row.metadata)
          });
        }
      });
      self.postMessage({ id, type: 'SUCCESS', payload: results });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'GET_ALL_DOC_METADATA') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const results: any[] = [];
      db.exec({
        sql: 'SELECT id, metadata, timestamp FROM vector_embeddings',
        rowMode: 'object',
        callback: (row: any) => {
          results.push({
            id: row.id,
            metadata: row.metadata ? JSON.parse(row.metadata) : {},
            timestamp: row.timestamp
          });
        }
      });
      self.postMessage({ id, type: 'SUCCESS', payload: results });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'DELETE_EMBEDDING') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { docId } = payload;
      db.exec({
        sql: 'DELETE FROM vector_embeddings WHERE id = ?',
        bind: [docId]
      });
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'PRUNE_OLD_EMBEDDINGS') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { limit } = payload;
      // Get count
      let count = 0;
      db.exec({
        sql: 'SELECT COUNT(*) as count FROM vector_embeddings',
        rowMode: 'object',
        callback: (row: any) => { count = row.count; }
      });

      if (count > limit) {
        const toDelete = count - limit;
        const deletedIds: string[] = [];
        db.exec({
          sql: 'SELECT id FROM vector_embeddings ORDER BY timestamp ASC LIMIT ?',
          bind: [toDelete],
          rowMode: 'object',
          callback: (row: any) => { deletedIds.push(row.id); }
        });

        db.exec({
          sql: 'DELETE FROM vector_embeddings WHERE id IN (SELECT id FROM vector_embeddings ORDER BY timestamp ASC LIMIT ?)',
          bind: [toDelete]
        });
        self.postMessage({ id, type: 'SUCCESS', payload: { deleted: toDelete, deletedIds } });
      } else {
        self.postMessage({ id, type: 'SUCCESS', payload: { deleted: 0, deletedIds: [] } });
      }
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'SET_AST_CACHE') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { filePath, astJson, hash } = payload;
      db.exec({
        sql: 'INSERT OR REPLACE INTO ast_cache (file_path, ast_json, hash) VALUES (?, ?, ?)',
        bind: [filePath, astJson, hash]
      });
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'GET_AST_CACHE') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { filePath } = payload;
      let result = null;
      db.exec({
        sql: 'SELECT ast_json, hash FROM ast_cache WHERE file_path = ?',
        bind: [filePath],
        rowMode: 'object',
        callback: (row: any) => {
          result = {
            astJson: row.ast_json,
            hash: row.hash
          };
        }
      });
      self.postMessage({ id, type: 'SUCCESS', payload: result });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'INSERT_RELATIONSHIP') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { docIdA, docIdB, type: relType, score } = payload;
      db.exec({
        sql: 'INSERT OR REPLACE INTO doc_relationships (doc_id_a, doc_id_b, relationship_type, score) VALUES (?, ?, ?, ?)',
        bind: [docIdA, docIdB, relType, score || 1.0]
      });
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'GET_RELATED_DOCS') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { docId } = payload;
      const results: any[] = [];
      db.exec({
        sql: 'SELECT doc_id_b, relationship_type FROM doc_relationships WHERE doc_id_a = ?',
        bind: [docId],
        rowMode: 'object',
        callback: (row: any) => {
          results.push({ docId: row.doc_id_b, type: row.relationship_type });
        }
      });
      self.postMessage({ id, type: 'SUCCESS', payload: results });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  } else if (type === 'LINK_DOCS') {
    if (!db) return self.postMessage({ id, type: 'ERROR', payload: 'DB not initialized' });
    try {
      const { docIdA, docIdB, relationshipType } = payload;
      db.exec({
        sql: 'INSERT OR REPLACE INTO doc_relationships (doc_id_a, doc_id_b, relationship_type) VALUES (?, ?, ?)',
        bind: [docIdA, docIdB, relationshipType]
      });
      self.postMessage({ id, type: 'SUCCESS' });
    } catch (err: any) {
      await handleDbError(err, id, type);
    }
  }
};
