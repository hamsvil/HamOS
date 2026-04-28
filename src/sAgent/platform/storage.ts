import fs from 'node:fs';
import path from 'node:path';

const STORAGE_FILE = path.resolve(process.cwd(), 'sovereign_storage.json');

const load = (): Record<string, any> => {
  if (fs.existsSync(STORAGE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STORAGE_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
};

const save = (data: Record<string, any>) => {
  fs.writeFileSync(STORAGE_FILE, JSON.stringify(data, null, 2));
};

export const getItem = async <T>(key: string): Promise<T | null> => {
  const data = load();
  return data[key] ?? null;
};

export const setItem = async <T>(key: string, value: T): Promise<void> => {
  const data = load();
  data[key] = value;
  save(data);
};

export const removeItem = async (key: string): Promise<void> => {
  const data = load();
  delete data[key];
  save(data);
};

export const listKeys = async (): Promise<string[]> => {
  const data = load();
  return Object.keys(data);
};
