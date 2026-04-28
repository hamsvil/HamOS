import { BaseAgent } from './BaseAgent';
import { AGENT_ROLES } from '../coreAgents/AgentRoles';
import { fileSystemTools, FileSystemBridge } from './FileSystemBridge';
import { supremeTools, supremeImplementations } from './SupremeToolsBridge';
import { getDynamicGeminiKeys } from '../../config/hardcodedKeys';

// [Architect Node Guard] 
// Prevent VFS initialization in Node.js which causes ReferenceError: indexedDB is not defined.
if (typeof window === 'undefined') {
  // Deep bypass lightning-fs and idb-keyval
  (global as any).indexedDB = { open: () => ({ onsuccess: null, onerror: null }) };
}

export class SwarmOrchestrator {
  private agents: Map<string, BaseAgent> = new Map();

  constructor() {
    console.log('[SwarmOrchestrator] Inisialisasi sistem...');
  }

  /**
   * Menginisialisasi 8 Agent dengan API Key masing-masing
   * @param apiKeys Record berisi mapping agentId -> apiKey
   */
  public async bootSwarm(apiKeys: Record<string, string>) {
    const fallbackKeys = await getDynamicGeminiKeys();
    
    // Combine tools
    const combinedTools = [
       ...fileSystemTools,
       ...supremeTools
    ];

    // Combine implementations
    const combinedImplementations = {
      ...FileSystemBridge,
      ...supremeImplementations
    };

    AGENT_ROLES.forEach((roleConfig, index) => {
      const keysForAgent: string[] = [];

      // 1. Keys from environment variables (GEMINI_API_KEY_1 to GEMINI_API_KEY_8)
      const envKey = process.env[`GEMINI_API_KEY_${index + 1}`];
      if (envKey) {
        keysForAgent.push(envKey);
      }

      // 2. Global fallback key
      if (process.env.GEMINI_API_KEY && !keysForAgent.includes(process.env.GEMINI_API_KEY)) {
        keysForAgent.push(process.env.GEMINI_API_KEY);
      }

      // 3. Keys passed via apiKeys parameter (from user config)
      let oldPrimary = apiKeys[roleConfig.id];
      if (!oldPrimary && apiKeys['default']) {
        oldPrimary = apiKeys['default'];
      }
      if (oldPrimary && !keysForAgent.includes(oldPrimary)) {
        keysForAgent.push(oldPrimary);
      }

      // 4. Local fallback Keys from hardcodedKeys configuration (Dynamic)
      // We pass ALL valid keys to every agent to enable the Rolling API Key system in BaseAgent.
      fallbackKeys.forEach(fallback => {
        if (!keysForAgent.includes(fallback)) {
          keysForAgent.push(fallback);
        }
      });

      // Ensure at least one key is present (even if it's a placeholder to satisfy the constructor)
      if (keysForAgent.length === 0) {
        keysForAgent.push("NO_KEY_PROVIDED");
      }

      const agent = new BaseAgent(
        {
          id: roleConfig.id,
          name: roleConfig.name,
          role: roleConfig.role,
          systemInstruction: roleConfig.systemInstruction,
          apiKeys: keysForAgent,
        },
        combinedTools,
        combinedImplementations
      );

      this.agents.set(roleConfig.id, agent);
      console.log(`[SwarmOrchestrator] ${roleConfig.id} (${roleConfig.name}) berhasil di-booting.`);
    });
  }

  /**
   * Architect mendelegasikan tugas ke agent spesifik
   */
  public async delegateTask(agentId: string, taskDescription: string): Promise<string> {
    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent ${agentId} tidak ditemukan atau belum di-booting.`);
    }

    console.log(`[SwarmOrchestrator] Mendelegasikan tugas ke ${agentId}...`);
    const result = await agent.executeTask(taskDescription);
    return result;
  }

  /**
   * Broadcast tugas ke semua agent (misal: untuk code review massal)
   */
  public async broadcastTask(taskDescription: string): Promise<Record<string, string>> {
    console.log(`[SwarmOrchestrator] Memulai broadcast tugas ke seluruh Swarm...`);
    const results: Record<string, string> = {};
    
    // [HAMLI CORE SYNC] Save current project state to shared memory before broadcast
    const { hamliCoreMemory } = await import('./SharedMemory');
    hamliCoreMemory.save('SWARM_STATUS', { lastBroadcast: new Date().toISOString(), totalAgents: this.agents.size });

    // Use sequential execution with delays to avoid 429 Tsunami
    for (const agent of Array.from(this.agents.values())) {
      try {
        console.log(`[SwarmOrchestrator] Sequencing broadcast to ${agent.getId()}...`);
        const res = await agent.executeTask(taskDescription);
        results[agent.getId()] = res;
        // Sync individual result to shared hive mind
        hamliCoreMemory.save(`TASK_RESULT_${agent.getId()}`, { status: "COMPLETED", data: res });
        
        // Ratelimit buffer: 1.5s between agents
        await new Promise(r => setTimeout(r, 1500));
      } catch (e: any) {
        results[agent.getId()] = `ERROR: ${e.message}`;
        hamliCoreMemory.save(`TASK_ERROR_${agent.getId()}`, { error: e.message });
      }
    }

    await hamliCoreMemory.persist();
    return results;
  }
}
