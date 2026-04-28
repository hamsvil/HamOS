import { PersistenceLayer } from './PersistenceLayer';

/**
 * LongTerm Memory - Persistent storage for important facts and summaries
 */
export class LongTerm {
  private data: Record<string, any> = {};
  private readonly STORAGE_KEY = 'long_term_memory';

  public async init() {
    this.data = await PersistenceLayer.load<Record<string, any>>(this.STORAGE_KEY) || {};
  }

  public async remember(key: string, value: any) {
    this.data[key] = value;
    await PersistenceLayer.save(this.STORAGE_KEY, this.data);
  }

  public recall(key: string) {
    return this.data[key];
  }

  public getAll() {
    return { ...this.data };
  }
}
