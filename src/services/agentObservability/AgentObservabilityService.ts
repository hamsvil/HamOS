import { hamEventBus } from '../../ham-synapse/core/event_bus';
import { HamEventType } from '../../ham-synapse/core/types';
import Dexie, { Table } from 'dexie';

export interface AgentLog {
  id?: number;
  timestamp: number;
  agentId: string;
  agentName: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  message: string;
  details?: any;
}

export interface AgentResult {
  id?: number;
  timestamp: number;
  agentId: string;
  agentName: string;
  taskId: string;
  task: string;
  status: 'ok' | 'error' | 'pending';
  result: string;
  durationMs: number;
  mimeType: string;
  metadata?: any;
  pinned?: boolean;
}

class AgentObservabilityDB extends Dexie {
  agent_logs!: Table<AgentLog>;
  agent_results!: Table<AgentResult>;

  constructor() {
    super('AgentObservabilityDB');
    this.version(1).stores({
      agent_logs: '++id, timestamp, agentId, level',
      agent_results: '++id, timestamp, agentId, status, pinned'
    });
  }
}

const db = new AgentObservabilityDB();

class AgentObservabilityService {
  private static instance: AgentObservabilityService;
  private logCallbacks: Set<(log: AgentLog) => void> = new Set();
  private resultCallbacks: Set<(result: AgentResult) => void> = new Set();
  private retentionLimit = 5000;

  private constructor() {
    this.setupListeners();
  }

  public static getInstance(): AgentObservabilityService {
    if (!AgentObservabilityService.instance) {
      AgentObservabilityService.instance = new AgentObservabilityService();
    }
    return AgentObservabilityService.instance;
  }

  private setupListeners() {
    // Listen to existing HamEventBus events
    hamEventBus.subscribe(HamEventType.AI_ACTION_LOG, (event) => {
      const log: AgentLog = {
        timestamp: event.timestamp,
        agentId: event.payload.agentId || 'unknown',
        agentName: event.payload.agentName || 'Agent',
        level: event.payload.level || 'info',
        message: event.payload.message || '',
        details: event.payload.details
      };
      this.pushLog(log);
    });

    hamEventBus.subscribe(HamEventType.AI_RESPONSE, (event) => {
      const result: AgentResult = {
        timestamp: event.timestamp,
        agentId: event.payload.agentId || 'unknown',
        agentName: event.payload.agentName || 'Agent',
        taskId: event.id,
        task: event.payload.task || '',
        status: event.payload.status || 'ok',
        result: typeof event.payload.text === 'string' ? event.payload.text : JSON.stringify(event.payload),
        durationMs: event.payload.durationMs || 0,
        mimeType: event.payload.mimeType || 'text/plain',
        metadata: event.payload.metadata
      };
      this.pushResult(result);
    });
  }

  public subscribeToLog(callback: (log: AgentLog) => void): () => void {
    this.logCallbacks.add(callback);
    return () => this.logCallbacks.delete(callback);
  }

  public subscribeToResults(callback: (result: AgentResult) => void): () => void {
    this.resultCallbacks.add(callback);
    return () => this.resultCallbacks.delete(callback);
  }

  public async pushLog(log: AgentLog) {
    await db.agent_logs.add(log);
    this.logCallbacks.forEach(cb => cb(log));
    this.enforceRetention('agent_logs');
    
    // Bridge to server if needed (for SSE)
    try {
      fetch('/api/agent-obs/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(log)
      }).catch(() => {});
    } catch (e) {}
  }

  public async pushResult(result: AgentResult) {
    await db.agent_results.add(result);
    this.resultCallbacks.forEach(cb => cb(result));
    this.enforceRetention('agent_results');

    try {
      fetch('/api/agent-obs/results', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      }).catch(() => {});
    } catch (e) {}
  }

  private async enforceRetention(table: 'agent_logs' | 'agent_results') {
    const count = await db[table].count();
    if (count > this.retentionLimit) {
      const toDelete = count - this.retentionLimit;
      const oldest = await db[table].orderBy('id').limit(toDelete).primaryKeys();
      await db[table].bulkDelete(oldest);
    }
  }

  public async getLogs(limit = 200, since?: number) {
    let query = db.agent_logs.orderBy('timestamp').reverse();
    if (since) {
      return query.filter(log => log.timestamp > since).limit(limit).toArray();
    }
    return query.limit(limit).toArray();
  }

  public async getResults(limit = 100, since?: number) {
    let query = db.agent_results.orderBy('timestamp').reverse();
    if (since) {
      return query.filter(res => res.timestamp > since).limit(limit).toArray();
    }
    return query.limit(limit).toArray();
  }

  public async clearLogs() {
    await db.agent_logs.clear();
  }
  
  public async deleteResult(id: number) {
    await db.agent_results.delete(id);
  }

  public async togglePinResult(id: number) {
    const result = await db.agent_results.get(id);
    if (result) {
      await db.agent_results.update(id, { pinned: !result.pinned });
    }
  }
}

export const agentObservabilityService = AgentObservabilityService.getInstance();
