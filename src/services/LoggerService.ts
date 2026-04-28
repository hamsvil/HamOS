/* eslint-disable no-useless-assignment */
import { getReactiveDb } from '../db/reactiveDb';

export type LogLevel = 'info' | 'warn' | 'error';

export interface LogEntry {
  id: string;
  timestamp: number;
  level: LogLevel;
  context: string;
  message: string;
  details?: any;
}

import { generateUUID } from '../utils/uuid';

export class LoggerService {
  private static instance: LoggerService;
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  public static getInstance(): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService();
    }
    return LoggerService.instance;
  }

  private async addLog(level: LogLevel, context: string, message: string, details?: any) {
    try {
        const entry: LogEntry = {
          id: generateUUID(),
          timestamp: Date.now(),
          level,
          context,
          message,
          details: details instanceof Error ? { name: details.name, message: details.message, stack: details.stack } : details
        };

        // Console output for immediate debugging
        if (level === 'error') {
          console.error(`[${context}] ${message}`, details || '');
        } else if (level === 'warn') {
          console.warn(`[${context}] ${message}`, details || '');
        } else {
          // console.log(`[${context}] ${message}`, details || '');
        }

        // Save to RxDB
        const db = await getReactiveDb();
        if (db) {
            await db.system_logs.insert(entry);
            
            // Cleanup old logs if exceeding MAX_LOGS
            const count = await db.system_logs.count().exec();
            if (count > this.MAX_LOGS) {
                const oldestLogs = await db.system_logs.find().sort({ timestamp: 'asc' }).limit(count - this.MAX_LOGS).exec();
                if (oldestLogs.length > 0) {
                    await db.system_logs.bulkRemove(oldestLogs.map(l => l.id));
                }
            }
        }
    } catch (e) {
        console.error('LoggerService internal error', e);
    }
  }

  public static info(context: string, message: string, details?: any) {
    LoggerService.getInstance().addLog('info', context, message, details);
  }

  public static warn(context: string, message: string, details?: any) {
    LoggerService.getInstance().addLog('warn', context, message, details);
  }

  public static error(context: string, message: string, details?: any) {
    LoggerService.getInstance().addLog('error', context, message, details);
  }

  public async getLogs(): Promise<LogEntry[]> {
    try {
        const db = await getReactiveDb();
        if (!db) return [];
        const logs = await db.system_logs.find().sort({ timestamp: 'desc' }).exec();
        return logs.map(l => l.toJSON());
    } catch (e) {
        console.error('Failed to get logs from RxDB', e);
        return [];
    }
  }

  public async clearLogs() {
    try {
        const db = await getReactiveDb();
        if (db) {
            await db.system_logs.find().remove();
        }
    } catch (e) {
        console.error('Failed to clear logs from RxDB', e);
    }
  }
}
