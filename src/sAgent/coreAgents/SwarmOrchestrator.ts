import { BaseAgent } from './BaseAgent';
import { AGENT_ROLES } from './AgentRoles';
import { fileSystemTools, FileSystemBridge } from './FileSystemBridge';
import { supremeTools, supremeImplementations } from './SupremeToolsBridge';
import { getDynamicGeminiKeys } from '../../config/hardcodedKeys';
import { KeyRotator } from './KeyRotator';

// [Architect Node Guard] 
if (typeof window === 'undefined') {
  (global as any).indexedDB = { open: () => ({ onsuccess: null, onerror: null }) };
}

// ─── Tipe Publik ──────────────────────────────────────────────
export interface AgentTask {
  agentId: string;
  task: string;
}

export interface ParallelResult {
  agentId: string;
  agentName: string;
  status: 'ok' | 'error';
  result: string;
  durationMs: number;
}

export interface DecomposedTask {
  domain: string;
  agentId: string;
  task: string;
}

// Mapping domain keyword → agentId
const DOMAIN_ROUTING: Record<string, string> = {
  ui:          'agent1', frontend:    'agent1', design:  'agent1', css:       'agent1',
  component:   'agent1', animation:   'agent1', layout:  'agent1',
  logic:       'agent2', state:       'agent2', algorithm: 'agent2', data:    'agent2',
  api:         'agent2', typescript:  'agent2', service: 'agent2',
  security:    'agent3', auth:        'agent3', validation: 'agent3', xss:    'agent3',
  performance: 'agent4', speed:       'agent4', memory:  'agent4', bundle:    'agent4',
  cache:       'agent4', optimization:'agent4',
  storage:     'agent5', database:    'agent5', indexeddb: 'agent5', file:    'agent5',
  persistence: 'agent5', vfs:         'agent5',
  test:        'agent6', qa:          'agent6', bug:     'agent6', edge:      'agent6',
  build:       'agent7', devops:      'agent7', config:  'agent7', dependency:'agent7',
  package:     'agent7', vite:        'agent7', deploy:  'agent7',
  doc:         'agent8', documentation:'agent8', cleanup:'agent8', comment:   'agent8',
  refactor:    'agent8', readme:      'agent8',
};

// Default routing jika domain tidak terdeteksi
const DEFAULT_AGENT = 'agent2';

export class SwarmOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();
  private agentNames: Map<string, string> = new Map();

  constructor() {
    console.log('[SwarmOrchestrator] Inisialisasi sistem...');
  }

  // ─────────────────────────────────────────────────────────────
  // BOOT
  // ─────────────────────────────────────────────────────────────
  public async bootSwarm(apiKeys: Record<string, string>) {
    const fallbackKeys = await getDynamicGeminiKeys();
    KeyRotator.getInstance().registerKeys(fallbackKeys);

    const combinedTools = [...fileSystemTools, ...supremeTools];
    const combinedImplementations = { ...FileSystemBridge, ...supremeImplementations };

    if (typeof window === 'undefined') {
      combinedImplementations.readFile = async (p: string) => {
        const nodeFS = await import('node:fs');
        const nodePath = await import('node:path');
        const fullPath = nodePath.resolve(process.cwd(), p.startsWith('/') ? p.slice(1) : p);
        return nodeFS.readFileSync(fullPath, 'utf8');
      };
      combinedImplementations.writeFile = async (p: string, content: string) => {
        const nodeFS = await import('node:fs');
        const nodePath = await import('node:path');
        const fullPath = nodePath.resolve(process.cwd(), p.startsWith('/') ? p.slice(1) : p);
        const dir = nodePath.dirname(fullPath);
        if (!nodeFS.existsSync(dir)) nodeFS.mkdirSync(dir, { recursive: true });
        nodeFS.writeFileSync(fullPath, content);
        return true;
      };
      combinedImplementations.listFiles = async (d: string) => {
        const nodeFS = await import('node:fs');
        const nodePath = await import('node:path');
        const fullPath = nodePath.resolve(process.cwd(), d.startsWith('/') ? d.slice(1) : d);
        return nodeFS.readdirSync(fullPath);
      };
    }

    AGENT_ROLES.forEach((roleConfig, index) => {
      const priorityKeys: string[] = [];
      const envKey = process.env[`GEMINI_API_KEY_${index + 1}`];
      if (envKey) priorityKeys.push(envKey);
      if (process.env.GEMINI_API_KEY && !priorityKeys.includes(process.env.GEMINI_API_KEY))
        priorityKeys.push(process.env.GEMINI_API_KEY);
      const oldPrimary = apiKeys[roleConfig.id] || apiKeys['default'];
      if (oldPrimary && !priorityKeys.includes(oldPrimary)) priorityKeys.push(oldPrimary);

      const keysForAgent = KeyRotator.getInstance().getCombinedQueue(priorityKeys);
      if (keysForAgent.length === 0) keysForAgent.push('NO_KEY_PROVIDED');

      const agent = new BaseAgent(
        { id: roleConfig.id, name: roleConfig.name, role: roleConfig.role,
          systemInstruction: roleConfig.systemInstruction,
          apiKeys: keysForAgent, priorityKeys },
        combinedTools, combinedImplementations
      );

      this.agents.set(roleConfig.id, agent);
      this.agentNames.set(roleConfig.id, roleConfig.name);
      console.log(`[SwarmOrchestrator] ${roleConfig.id} (${roleConfig.name}) berhasil di-booting.`);
    });
  }

  // ─────────────────────────────────────────────────────────────
  // 1. SEQUENTIAL DELEGATE (tetap ada untuk tugas single agent)
  // ─────────────────────────────────────────────────────────────
  public async delegateTask(agentId: string, taskDescription: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) throw new Error(`Agent ${agentId} tidak ditemukan atau belum di-booting.`);
    console.log(`[SwarmOrchestrator] Mendelegasikan tugas ke ${agentId}...`);
    return agent.executeTask(taskDescription);
  }

  // ─────────────────────────────────────────────────────────────
  // 2. PARALLEL DELEGATE ★ BARU ★
  //    Jalankan banyak (agentId, task) pasang secara BERSAMAAN
  //    concurrency: max agent yang boleh berjalan serentak (default: semua)
  // ─────────────────────────────────────────────────────────────
  public async parallelDelegate(
    tasks: AgentTask[],
    concurrency = 5 // Capped to 5 by default to prevent OOM / server deadlock in massive swarms
  ): Promise<ParallelResult[]> {
    console.log(`[SwarmOrchestrator] ⚡ PARALLEL DELEGATE: ${tasks.length} tugas, concurrency=${concurrency}`);

    const results: ParallelResult[] = [];
    const queue = [...tasks];
    const running: Promise<void>[] = [];

    const runOne = async (item: AgentTask) => {
      const t0 = Date.now();
      const agent = this.agents.get(item.agentId);
      const name = this.agentNames.get(item.agentId) || item.agentId;
      if (!agent) {
        results.push({ agentId: item.agentId, agentName: name, status: 'error',
          result: `Agent ${item.agentId} tidak ditemukan.`, durationMs: 0 });
        return;
      }
      console.log(`[SwarmOrchestrator] ↗ Mulai: ${item.agentId} (${name})`);
      try {
        const res = await agent.executeTask(item.task);
        results.push({ agentId: item.agentId, agentName: name, status: 'ok',
          result: res, durationMs: Date.now() - t0 });
        console.log(`[SwarmOrchestrator] ✅ Selesai: ${item.agentId} (${Date.now() - t0}ms)`);
      } catch (e: any) {
        results.push({ agentId: item.agentId, agentName: name, status: 'error',
          result: `ERROR: ${e.message}`, durationMs: Date.now() - t0 });
        console.error(`[SwarmOrchestrator] ❌ Gagal: ${item.agentId} — ${e.message}`);
      }
    };

    // Concurrency pool
    while (queue.length > 0) {
      while (running.length < concurrency && queue.length > 0) {
        const item = queue.shift()!;
        const p = runOne(item).then(() => { running.splice(running.indexOf(p), 1); });
        running.push(p);
      }
      if (running.length >= concurrency) await Promise.race(running);
    }
    await Promise.all(running);

    return results;
  }

  // ─────────────────────────────────────────────────────────────
  // 3. ARCHITECT DECOMPOSE ★ BARU ★
  //    Pecah satu tugas kompleks → sub-tugas per domain → paralel
  //    Architect menganalisis task, deteksi domain, routing ke agent
  // ─────────────────────────────────────────────────────────────
  public async architectDecompose(
    complexTask: string,
    subTasks?: DecomposedTask[]
  ): Promise<ParallelResult[]> {
    let tasks: AgentTask[];

    if (subTasks && subTasks.length > 0) {
      // Sub-tasks sudah didefinisikan manual (untuk audit, dll)
      tasks = subTasks.map(st => ({ agentId: st.agentId, task: st.task }));
    } else {
      // Auto-routing berdasarkan kata kunci domain dalam task
      const lower = complexTask.toLowerCase();
      const matchedAgents = new Set<string>();

      for (const [keyword, agentId] of Object.entries(DOMAIN_ROUTING)) {
        if (lower.includes(keyword)) matchedAgents.add(agentId);
      }

      if (matchedAgents.size === 0) matchedAgents.add(DEFAULT_AGENT);

      tasks = Array.from(matchedAgents).map(agentId => ({
        agentId,
        task: complexTask,
      }));
    }

    console.log(`[Architect] Decompose → ${tasks.length} sub-tugas dikirim paralel ke: ${tasks.map(t => t.agentId).join(', ')}`);
    return this.parallelDelegate(tasks);
  }

  // ─────────────────────────────────────────────────────────────
  // 4. BROADCAST (tetap ada, sudah paralel via Promise.all)
  // ─────────────────────────────────────────────────────────────
  public async broadcastTask(taskDescription: string): Promise<Record<string, string>> {
    console.log(`[SwarmOrchestrator] 📡 Broadcast ke seluruh Swarm...`);
    const allTasks: AgentTask[] = Array.from(this.agents.keys()).map(id => ({
      agentId: id, task: taskDescription,
    }));
    const results = await this.parallelDelegate(allTasks);
    const out: Record<string, string> = {};
    for (const r of results) out[r.agentId] = r.result;
    return out;
  }

  // ─────────────────────────────────────────────────────────────
  // UTIL
  // ─────────────────────────────────────────────────────────────
  public getAgentIds(): string[] {
    return Array.from(this.agents.keys());
  }

  public getAgentName(agentId: string): string {
    return this.agentNames.get(agentId) || agentId;
  }

  // ─────────────────────────────────────────────────────────────
  // 5. CROSS-AGENT MEMORY BUS ★ BARU ★
  // ─────────────────────────────────────────────────────────────
  public shareMemory(key: string, value: any): void {
    const fs = require('fs');
    const path = require('path');
    const memoryPath = path.resolve(process.cwd(), '.lisa/SHARED_MEMORY.json');
    
    let memory: Record<string, any> = {};
    if (fs.existsSync(memoryPath)) {
      try {
        memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      } catch (e) {
        console.error('[SwarmOrchestrator] Failed to read SHARED_MEMORY.json', e);
      }
    }
    
    memory[key] = value;
    const dir = path.dirname(memoryPath);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log(`[SwarmOrchestrator] Shared memory updated for key: ${key}`);
  }

  public readSharedMemory(key?: string): any {
    const fs = require('fs');
    const path = require('path');
    const memoryPath = path.resolve(process.cwd(), '.lisa/SHARED_MEMORY.json');
    
    if (!fs.existsSync(memoryPath)) return key ? undefined : {};
    
    try {
      const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
      return key ? memory[key] : memory;
    } catch (e) {
      console.error('[SwarmOrchestrator] Failed to read SHARED_MEMORY.json', e);
      return key ? undefined : {};
    }
  }
}
