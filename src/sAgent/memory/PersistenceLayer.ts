import { storage } from '../platform';

/**
 * PersistenceLayer - Hybrid storage abstraction
 */
export class PersistenceLayer {
  public static async save(key: string, data: any): Promise<void> {
    await storage.setItem(key, data);
  }

  public static async load<T>(key: string): Promise<T | null> {
    return await storage.getItem<T>(key);
  }

  public static async delete(key: string): Promise<void> {
    await storage.removeItem(key);
  }
}
