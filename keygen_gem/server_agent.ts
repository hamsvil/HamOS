import fs from 'fs';
import path from 'path';
import { generateGeminiKey } from './generator';
import { validateGeminiKey } from './validator';

/**
 * [AGENTIC SUPREME PROTOCOL: SERVER CORE]
 * Sovereign Server-Side Swarm for true 24/7 Autonomous Discovery.
 * This runs independently of the browser tab, surviving app closures.
 */
export class ServerGeminiAgent {
  private isRunning: boolean = false;
  private readonly vaultPath: string;
  private activeSentinels: number = 0;
  private targetSwarmSize: number = 500; // Kapasitas penuh untuk OSINT masif
  private readonly MAX_CLONES = 1000;

  constructor() {
    this.vaultPath = path.join(process.cwd(), 'logs', 'valid_keys.log');
    const logDir = path.dirname(this.vaultPath);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  public async start() {
    if (this.isRunning) return;
    this.isRunning = true;
    
    console.log(`[ServerAgent] Sovereign Core Engaged. Initial Target: ${this.targetSwarmSize} Clones.`);
    this.logToVault(`[${new Date().toISOString()}] SERVER_BOOT: Dynamic Swarm Engaged (Max: ${this.MAX_CLONES}).`);

    this.maintainSwarm();
  }

  public adjustSwarmSize(newSize: number) {
    const size = Math.min(newSize, this.MAX_CLONES);
    if (this.targetSwarmSize === size) return;
    
    console.log(`[ServerAgent] Adjusting Swarm Size: ${this.targetSwarmSize} -> ${size}`);
    this.targetSwarmSize = size;
    
    if (this.isRunning) {
      this.maintainSwarm();
    }
  }

  private maintainSwarm() {
    if (!this.isRunning) return;

    // Scale up if needed
    while (this.activeSentinels < this.targetSwarmSize) {
      this.activeSentinels++;
      this.spawnSentinel(this.activeSentinels);
    }
    // Scaling down happens naturally as sentinels check targetSwarmSize in their loops
  }

  private async spawnSentinel(id: number) {
    while (this.isRunning) {
      // Scale down check: if this sentinel's ID is beyond target, exit loop
      if (id > this.targetSwarmSize) {
        this.activeSentinels--;
        // console.log(`[ServerAgent] Sentinel ${id} standing down.`);
        return;
      }

      try {
        const candidate = generateGeminiKey("alphanumeric", 39);
        const result = await validateGeminiKey(candidate);

        if (result.isValid) {
          const timestamp = new Date().toISOString();
          const entry = `[${timestamp}] !SWARM_DISCOVERY! (Sentinel ${id}) VALID KEY: ${candidate}\n`;
          this.logToVault(entry);
          console.log(`\x1b[32m[ServerAgent] JACKPOT! Key captured by Sentinel ${id} in Dynamic Swarm.\x1b[00m`);
        }

        // Delay to prevent CPU spike (50 agents = 100ms, 500 agents = 500ms jitter)
        const jitter = this.targetSwarmSize > 100 ? 200 : 50;
        await new Promise(r => setTimeout(r, jitter)); 
      } catch (e) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  private logToVault(msg: string) {
    try {
      fs.appendFileSync(this.vaultPath, msg);
    } catch (e) {
      console.error("[ServerAgent] Failed to write to vault:", e);
    }
  }

  public stop() {
    this.isRunning = false;
    console.log("[ServerAgent] Sovereign Core Disengaged.");
  }
}

// Singleton for server-side
export const serverAgent = new ServerGeminiAgent();
