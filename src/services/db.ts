/* eslint-disable no-useless-assignment */
import Dexie, { Table } from 'dexie';
import { TaskProgress, UploadStatus } from '../types/tasks';

export class TaskDatabase extends Dexie {
  tasks!: Table<TaskProgress>;
  uploads!: Table<UploadStatus & { file: any }>;
  searchHistory!: Table<{ query: string; timestamp: number }>;

  constructor() {
    super('TaskDatabase');
    this.version(1).stores({
      tasks: 'id, name, progress, status, type',
      uploads: 'id, status',
      searchHistory: 'query, timestamp'
    });
  }
}

export const db = new TaskDatabase();
