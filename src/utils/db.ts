/* eslint-disable no-useless-assignment */
import Dexie, { Table } from 'dexie';

export interface BrowserTab {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  isLoading: boolean;
  history: string[];
  historyIndex: number;
  lastAccessed: number;
  canGoBack: boolean;
  canGoForward: boolean;
  isIncognito: boolean;
}

export interface BrowserCookie {
  id?: number;
  url: string;
  name: string;
  value: string;
  domain: string;
  path: string;
  expires: number;
}

export interface AppSettings {
  id?: number;
  key: string;
  value: any;
}

export class QuantumDatabase extends Dexie {
  cookies!: Table<BrowserCookie, number>;
  settings!: Table<AppSettings, number>;
  browserTabs!: Table<BrowserTab, string>;

  constructor() {
    super('QuantumDatabase');
    this.version(1).stores({
      cookies: '++id, url, name',
      settings: '++id, &key',
      browserTabs: 'id'
    });
  }
}

export const db = new QuantumDatabase();
