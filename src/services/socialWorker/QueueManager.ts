import { openDB, IDBPDatabase } from 'idb';

export class QueueManager {
  private static DB_NAME = 'social_worker_queue';
  private static STORE_NAME = 'post_queue';

  private static async getDB(): Promise<IDBPDatabase> {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
      },
    });
  }

  static async addToQueue(post: any) {
    const db = await this.getDB();
    await db.put(this.STORE_NAME, post);
  }

  static async getQueue() {
    const db = await this.getDB();
    return db.getAll(this.STORE_NAME);
  }

  static async removeFromQueue(id: string) {
    const db = await this.getDB();
    await db.delete(this.STORE_NAME, id);
  }
}
