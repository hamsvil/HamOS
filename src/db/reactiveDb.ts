 
import { createRxDatabase, RxDatabase, addRxPlugin } from 'rxdb';
import { getRxStorageDexie } from 'rxdb/plugins/storage-dexie';

export type RxDBDatabase = RxDatabase;

let dbPromise: Promise<RxDBDatabase> | null = null;

export const getReactiveDb = async (): Promise<RxDBDatabase> => {
  if (dbPromise) return dbPromise;

  dbPromise = (async () => {
    const db = await createRxDatabase({
      name: 'ham_os_reactive',
      storage: getRxStorageDexie()
    });

    await db.addCollections({
      chats: {
        schema: {
          title: 'chat schema',
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: { type: 'string', maxLength: 100 },
            role: { type: 'string' },
            content: { type: 'string' },
            timestamp: { type: 'number' },
            sessionId: { type: 'string' },
            image: { type: 'string' },
            audio: { type: 'string' },
            video: { type: 'string' },
            files: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  name: { type: 'string' },
                  data: { type: 'string' },
                  mimeType: { type: 'string' }
                }
              }
            }
          },
          required: ['id', 'role', 'content', 'timestamp', 'sessionId']
        }
      },
      chat_sessions: {
        schema: {
          title: 'chat session schema',
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: { type: 'string', maxLength: 100 },
            title: { type: 'string' },
            timestamp: { type: 'number' }
          },
          required: ['id', 'title', 'timestamp']
        }
      },
      system_logs: {
        schema: {
          title: 'system logs schema',
          version: 0,
          primaryKey: 'id',
          type: 'object',
          properties: {
            id: { type: 'string', maxLength: 100 },
            level: { type: 'string' },
            context: { type: 'string' },
            message: { type: 'string' },
            details: { type: 'object' },
            timestamp: { type: 'number' }
          },
          required: ['id', 'level', 'context', 'message', 'timestamp']
        }
      }
    });

    return db;
  })();

  return dbPromise;
};
