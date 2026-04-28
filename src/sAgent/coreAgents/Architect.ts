/**
 * ════════════════════════════════════════════════════════════════
 * ARCHITECT — Goal Orchestrator (Phase 2)
 * ════════════════════════════════════════════════════════════════
 *
 * Lapisan tertinggi sub-agent. Menerima goal mentah dari user,
 * lalu secara otonom:
 *   1) ROUTE     — pilih 1-N agent spesialis yang relevan
 *   2) DECOMPOSE — pecah goal jadi sub-task per agent
 *   3) DELEGATE  — eksekusi paralel ke tiap agent
 *   4) SYNTHESIZE — gabung hasil jadi jawaban tunggal yang koheren
 *
 * Tidak menyentuh BaseAgent / SwarmOrchestrator / AgentRoles.
 * ════════════════════════════════════════════════════════════════
 */
import { BaseAgent } from './BaseAgent';
import { AGENT_ROLES } from './AgentRoles';
import { AutonomousAgent } from './AutonomousAgent';
import { KeyRotator } from './KeyRotator';
import { Blackboard } from './Blackboard';
import { getDynamicGeminiKeys } from '../../config/hardcodedKeys';

export interface DelegationPlan {
  agentId: string;
  agentName: string;
  subTask: string;
  reason: string;
}

export interface DelegationResult {
  plan: DelegationPlan;
  result: string;
  durationMs: number;
  ok: boolean;
  error?: string;
}

export interface ArchitectResult {
  goal: string;
  routing: DelegationPlan[];
  delegations: DelegationResult[];
  synthesis: string;
  totalDurationMs: number;
  stats: {
    agentsUsed: number;
    agentsSucceeded: number;
    agentsFailed: number;
    parallel: boolean;
  };
}

export interface ArchitectOptions {
  parallel?: boolean;        // default true — delegasi paralel
  useAutonomous?: boolean;   // default false — pakai AutonomousAgent (lebih mahal) atau BaseAgent
  maxAgents?: number;        // default 3 — batas jumlah agent yang dipilih
  fallbackKeys?: string[];   // override key list (untuk Node testing)
  verbose?: boolean;
  blackboard?: Blackboard;   // opsional — shared scratchpad antar-agent (Phase 3)
  blackboardLimit?: number;  // jumlah entry blackboard yang di-inject ke prompt (default 8)
}

function safeParseJSON<T = any>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) { try { return JSON.parse(fenced[1]) as T; } catch {} }
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start !== -1 && end > start) {
    try { return JSON.parse(raw.slice(start, end + 1)) as T; } catch {}
  }
  const arrStart = raw.indexOf('[');
  const arrEnd = raw.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd > arrStart) {
    try { return JSON.parse(raw.slice(arrStart, arrEnd + 1)) as T; } catch {}
  }
  return fallback;
}

export class Architect {
  private agents: Map<string, BaseAgent> = new Map();
  private booted = false;
  private opts: {
    parallel: boolean;
    useAutonomous: boolean;
    maxAgents: number;
    verbose: boolean;
    blackboardLimit: number;
    fallbackKeys?: string[];
  };
  private blackboard: Blackboard;

  constructor(opts: ArchitectOptions = {}) {
    this.opts = {
      parallel: opts.parallel ?? true,
      useAutonomous: opts.useAutonomous ?? false,
      maxAgents: opts.maxAgents ?? 3,
      verbose: opts.verbose ?? true,
      blackboardLimit: opts.blackboardLimit ?? 8,
      fallbackKeys: opts.fallbackKeys,
    };
    this.blackboard = opts.blackboard ?? new Blackboard();
  }

  public getBlackboard(): Blackboard {
    return this.blackboard;
  }

  private log(msg: string) {
    if (this.opts.verbose) console.log(`[Architect] ${msg}`);
  }

  /** Boot 8 specialized agent menggunakan KeyRotator (tidak menyentuh SwarmOrchestrator). */
  public async boot(extraKeys?: string[]): Promise<void> {
    if (this.booted) return;

    const dynamic = await getDynamicGeminiKeys().catch(() => [] as string[]);
    const all = [
      ...(extraKeys || []),
      ...(this.opts.fallbackKeys || []),
      ...dynamic,
    ].filter(k => k && k.length > 10);

    if (all.length === 0) {
      throw new Error('[Architect] Tidak ada API key tersedia. Berikan via opts.fallbackKeys atau .listkey.example.');
    }

    KeyRotator.getInstance().registerKeys(all);
    const queue = KeyRotator.getInstance().getCombinedQueue(all);

    AGENT_ROLES.forEach(role => {
      const agent = new BaseAgent({
        id: role.id,
        name: role.name,
        role: role.role,
        systemInstruction: role.systemInstruction,
        apiKeys: queue,
        priorityKeys: all,
      });
      this.agents.set(role.id, agent);
    });

    this.booted = true;
    this.log(`✓ ${this.agents.size} agent siap. Total ${all.length} key terdaftar.`);
  }

  /** Daftar agent ringkas untuk konsumsi router (id, name, role). */
  private rosterText(): string {
    return AGENT_ROLES.map(r => `- ${r.id} (${r.name}): ${r.role}`).join('\n');
  }

  /**
   * ROUTE + DECOMPOSE: minta 1 agent (Logic Gate sebagai router) memetakan
   * goal ke daftar agent + sub-task masing-masing.
   */
  /** Fallback routing tanpa LLM: pilih agent berdasarkan keyword goal. */
  private heuristicRoute(goal: string): DelegationPlan[] {
    const g = goal.toLowerCase();
    const matches: Array<{ id: string; score: number }> = [
      { id: 'agent1', score: /ui|ux|design|hero|landing|css|frontend|component|tampilan|warna/.test(g) ? 2 : 0 },
      { id: 'agent2', score: /logic|state|algoritma|data flow|architecture/.test(g) ? 2 : 0 },
      { id: 'agent3', score: /security|auth|firestore|rule|keamanan|audit|pii/.test(g) ? 2 : 0 },
      { id: 'agent4', score: /performance|speed|fast|lcp|fps|optim|cepat|kecepatan/.test(g) ? 2 : 0 },
      { id: 'agent5', score: /data|storage|vfs|database|persist|file|simpan/.test(g) ? 2 : 0 },
      { id: 'agent6', score: /test|qa|bug|edge|validasi/.test(g) ? 2 : 0 },
      { id: 'agent7', score: /devops|build|dependency|vite|esbuild|ci|deploy/.test(g) ? 2 : 0 },
      { id: 'agent8', score: /doc|readme|comment|dokumen|cleanup|refactor/.test(g) ? 2 : 0 },
    ];
    const ranked = matches.filter(m => m.score > 0).sort((a, b) => b.score - a.score).slice(0, this.opts.maxAgents);
    if (ranked.length === 0) ranked.push({ id: 'agent1', score: 1 });
    return ranked.map(m => {
      const role = AGENT_ROLES.find(r => r.id === m.id)!;
      return { agentId: m.id, agentName: role.name, subTask: goal, reason: 'heuristic-fallback' };
    });
  }

  private async route(goal: string): Promise<DelegationPlan[]> {
    const router = this.agents.get('agent2'); // The Logic Gate — paling cocok untuk decomposition
    if (!router) return this.heuristicRoute(goal);

    const prompt = `Kamu adalah Architect Router. Berikut roster agent spesialis:
${this.rosterText()}

GOAL USER: "${goal}"

Pilih 1 sampai ${this.opts.maxAgents} agent paling relevan, dan untuk tiap agent buat 1 sub-task spesifik yang sesuai dengan keahliannya.
Balas HANYA JSON array valid, tanpa teks lain:
[{"agentId":"agentX","subTask":"...","reason":"..."}]`;

    let raw = '';
    try {
      raw = await router.executeTask(prompt);
    } catch (e: any) {
      this.log(`⚠ Router LLM gagal (${e.message?.slice(0, 80)}). Pakai heuristic fallback.`);
      return this.heuristicRoute(goal);
    }
    const parsed = safeParseJSON<DelegationPlan[]>(raw, []);
    const valid = parsed
      .filter(p => p && p.agentId && p.subTask)
      .filter(p => this.agents.has(p.agentId))
      .slice(0, this.opts.maxAgents)
      .map(p => {
        const role = AGENT_ROLES.find(r => r.id === p.agentId)!;
        return { agentId: p.agentId, agentName: role.name, subTask: p.subTask, reason: p.reason || '' };
      });

    if (valid.length === 0) {
      // Fallback: kirim seluruh goal ke agent pertama (Weaver) saja
      this.log(`⚠ Routing gagal terparse, fallback ke agent1.`);
      const role = AGENT_ROLES[0];
      return [{ agentId: role.id, agentName: role.name, subTask: goal, reason: 'fallback' }];
    }
    return valid;
  }

  /** Bungkus sub-task dengan snapshot blackboard supaya agent sadar konteks bersama. */
  private buildSubTaskPrompt(plan: DelegationPlan): string {
    const snapshot = this.blackboard.snapshot({ limit: this.opts.blackboardLimit });
    if (snapshot === '(blackboard kosong)') return plan.subTask;
    return `KONTEKS BERSAMA (dari agent lain di blackboard):
${snapshot}

────────────────────────────────────────
SUB-TASK KAMU:
${plan.subTask}`;
  }

  /** Eksekusi 1 sub-task pada 1 agent. */
  private async runOne(plan: DelegationPlan): Promise<DelegationResult> {
    const agent = this.agents.get(plan.agentId);
    if (!agent) {
      return { plan, result: '', durationMs: 0, ok: false, error: 'agent not found' };
    }
    const t = Date.now();
    const promptWithBoard = this.buildSubTaskPrompt(plan);
    try {
      let result: string;
      if (this.opts.useAutonomous) {
        const auto = new AutonomousAgent(agent, { maxSteps: 2, maxRefinements: 0, verbose: false });
        const r = await auto.autoExecute(promptWithBoard);
        result = r.final;
      } else {
        result = await agent.executeTask(promptWithBoard);
      }
      this.blackboard.post(plan.agentId, plan.subTask.slice(0, 60), result.slice(0, 1000), { ok: true });
      return { plan, result, durationMs: Date.now() - t, ok: true };
    } catch (e: any) {
      this.blackboard.post(plan.agentId, plan.subTask.slice(0, 60), `[FAILED] ${e.message?.slice(0, 200)}`, { ok: false });
      return { plan, result: '', durationMs: Date.now() - t, ok: false, error: e.message };
    }
  }

  /** Synthesize: gabung hasil sub-task jadi 1 jawaban final yang koheren. */
  private async synthesize(goal: string, results: DelegationResult[]): Promise<string> {
    const ok = results.filter(r => r.ok);
    if (ok.length === 0) return '[Architect] Semua agent gagal. Tidak ada hasil yang bisa di-synthesize.';
    if (ok.length === 1) return ok[0].result; // tidak perlu LLM call tambahan

    const synthesizer = this.agents.get('agent8') || this.agents.get('agent2'); // The Scribe (dokumentasi) atau Logic Gate
    if (!synthesizer) return ok.map(r => `## ${r.plan.agentName}\n${r.result}`).join('\n\n');

    const prompt = `Gabungkan hasil dari beberapa agent menjadi 1 jawaban yang koheren, ringkas, dan menjawab GOAL.

GOAL: ${goal}

KONTRIBUSI AGENT:
${ok.map(r => `### ${r.plan.agentName} (${r.plan.agentId}) — ${r.plan.subTask}\n${r.result.slice(0, 800)}`).join('\n\n')}

Tuliskan jawaban final yang utuh, tanpa heading 'Jawaban Final', tanpa preamble.`;

    try {
      return await synthesizer.executeTask(prompt);
    } catch {
      return ok.map(r => `## ${r.plan.agentName}\n${r.result}`).join('\n\n');
    }
  }

  /** Entry point utama. */
  public async solve(goal: string): Promise<ArchitectResult> {
    if (!this.booted) await this.boot();
    const t0 = Date.now();

    this.log(`▶ ROUTE: "${goal.slice(0, 80)}"`);
    const routing = await this.route(goal);
    this.log(`✓ ROUTING: ${routing.length} agent dipilih → ${routing.map(r => r.agentId).join(', ')}`);

    this.log(`▶ DELEGATE (${this.opts.parallel ? 'parallel' : 'sequential'})`);
    let delegations: DelegationResult[];
    if (this.opts.parallel) {
      delegations = await Promise.all(routing.map(p => this.runOne(p)));
    } else {
      delegations = [];
      for (const p of routing) delegations.push(await this.runOne(p));
    }
    const okCount = delegations.filter(d => d.ok).length;
    this.log(`✓ DELEGATION: ${okCount}/${delegations.length} sukses`);

    this.log(`▶ SYNTHESIZE`);
    const synthesis = await this.synthesize(goal, delegations);
    const totalDurationMs = Date.now() - t0;
    this.log(`■ DONE in ${totalDurationMs}ms`);

    return {
      goal,
      routing,
      delegations,
      synthesis,
      totalDurationMs,
      stats: {
        agentsUsed: delegations.length,
        agentsSucceeded: okCount,
        agentsFailed: delegations.length - okCount,
        parallel: this.opts.parallel,
      },
    };
  }
}
