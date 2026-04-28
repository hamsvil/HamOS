/**
 * ════════════════════════════════════════════════════════════════
 * AUTONOMOUS AGENT — Plan → Execute → Verify → Refine wrapper
 * ════════════════════════════════════════════════════════════════
 *
 * Membungkus BaseAgent agar bekerja seperti agent otonom (mirip
 * Replit Agent / Claude Code): tidak hanya menjawab satu prompt,
 * tapi memecah goal menjadi langkah, mengeksekusi berurutan dengan
 * memori jangka pendek, lalu mengkritik & menyempurnakan hasilnya.
 *
 * BaseAgent TIDAK DIUBAH. Wrapper ini opt-in — flow lama tetap jalan
 * di AI Studio tanpa modifikasi.
 *
 * [Phase 4] Persistent Memory lintas-sesi:
 *   - MemoryEntry[] disimpan via PersistenceLayer (Dexie/IDB di browser,
 *     JSON file di Node). Kunci: "autonomous-memory-<agentId>"
 *   - loadMemory() muat dari storage, saveMemory() simpan secara async.
 * ════════════════════════════════════════════════════════════════
 */
import { BaseAgent } from './BaseAgent';
import { PersistenceLayer } from './PersistenceLayer';

export interface MemoryEntry {
  role: 'user' | 'agent' | 'system';
  content: string;
  timestamp: number;
}

export interface PlanStep {
  index: number;
  description: string;
  expectedOutput?: string;
}

export interface AutonomousResult {
  goal: string;
  plan: PlanStep[];
  executions: Array<{ step: PlanStep; result: string; durationMs: number }>;
  critique: { done: boolean; score: number; issues: string[]; summary: string };
  final: string;
  totalDurationMs: number;
  refined: boolean;
}

export interface AutonomousOptions {
  maxSteps?: number;        // default 5
  maxRefinements?: number;  // default 1
  memoryWindow?: number;    // default 10
  verbose?: boolean;        // default true
  persistMemory?: boolean;  // default true — Phase 4
}

/** Ekstrak JSON pertama dari respons LLM (toleran terhadap markdown/teks ekstra) */
function safeParseJSON<T = any>(raw: string, fallback: T): T {
  if (!raw) return fallback;
  try { return JSON.parse(raw) as T; } catch {}
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fenced) {
    try { return JSON.parse(fenced[1]) as T; } catch {}
  }
  const start = raw.indexOf('{');
  const lastBrace = raw.lastIndexOf('}');
  if (start !== -1 && lastBrace > start) {
    try { return JSON.parse(raw.slice(start, lastBrace + 1)) as T; } catch {}
  }
  return fallback;
}

export class AutonomousAgent {
  private memory: MemoryEntry[] = [];
  private _memoryLoaded = false;

  constructor(
    private base: BaseAgent,
    private opts: AutonomousOptions = {}
  ) {
    this.opts.maxSteps ??= 5;
    this.opts.maxRefinements ??= 1;
    this.opts.memoryWindow ??= 10;
    this.opts.verbose ??= true;
    this.opts.persistMemory ??= true;
  }

  private get persistKey(): string {
    return `autonomous-memory-${this.base.getId()}`;
  }

  private log(msg: string) {
    if (this.opts.verbose) console.log(`[AutonomousAgent ${this.base.getId()}] ${msg}`);
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 4: Persistent Memory API
  // ─────────────────────────────────────────────────────────────

  /**
   * Muat memori dari storage persisten (IDB/JSON).
   * Idempotent — aman dipanggil berkali-kali.
   */
  public async loadMemory(): Promise<void> {
    if (!this.opts.persistMemory || this._memoryLoaded) return;
    try {
      const saved = await PersistenceLayer.load<MemoryEntry[]>(this.persistKey);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        this.memory = saved;
        this.log(`✓ Memori dimuat dari ${PersistenceLayer.backend} (${this.memory.length} entri)`);
      }
    } catch (e) {
      this.log(`⚠ Gagal muat memori dari storage: ${e}`);
    }
    this._memoryLoaded = true;
  }

  /** Simpan memori ke storage persisten (fire-and-forget). */
  private saveMemory(): void {
    if (!this.opts.persistMemory) return;
    PersistenceLayer.save(this.persistKey, this.memory).catch(e => {
      this.log(`⚠ Gagal simpan memori: ${e}`);
    });
  }

  /** Hapus memori persisten dari storage. */
  public async clearStoredMemory(): Promise<void> {
    await PersistenceLayer.delete(this.persistKey);
    this.memory = [];
    this._memoryLoaded = false;
    this.log('Memori persisten dihapus.');
  }

  /** Info status persistence untuk debugging. */
  public persistenceInfo(): { key: string; backend: string; loaded: boolean; memorySize: number } {
    return {
      key: this.persistKey,
      backend: PersistenceLayer.backend,
      loaded: this._memoryLoaded,
      memorySize: this.memory.length,
    };
  }

  // ─────────────────────────────────────────────────────────────
  // Core Memory API (Phase 3, tidak berubah kecuali saveMemory)
  // ─────────────────────────────────────────────────────────────

  /** Snapshot memori jadi konteks untuk prompt selanjutnya */
  private memoryContext(): string {
    if (this.memory.length === 0) return '(belum ada memori)';
    const window = this.memory.slice(-this.opts.memoryWindow!);
    return window.map(m => `[${m.role}] ${m.content.slice(0, 400)}`).join('\n');
  }

  private push(role: MemoryEntry['role'], content: string) {
    this.memory.push({ role, content, timestamp: Date.now() });
    // Phase 4: persist setiap kali ada entry baru
    this.saveMemory();
  }

  /** Reset memori manual (mis. untuk task baru yang berbeda). Juga hapus dari storage. */
  public resetMemory() {
    this.memory = [];
    if (this.opts.persistMemory) {
      PersistenceLayer.delete(this.persistKey).catch(() => {});
    }
  }

  public getMemory(): MemoryEntry[] {
    return [...this.memory];
  }

  /**
   * Eksekusi goal secara otonom:
   * 1) LOAD MEMORY — muat memori persisten dari sesi sebelumnya (Phase 4)
   * 2) PLAN — pecah jadi langkah berurutan
   * 3) EXECUTE — jalankan tiap langkah, simpan ke memori
   * 4) VERIFY — agent kritik dirinya sendiri
   * 5) REFINE — jika belum selesai, perbaiki (max 1x default)
   */
  public async autoExecute(goal: string): Promise<AutonomousResult> {
    const t0 = Date.now();

    // ───────────── Phase 4: Load persistent memory ─────────────
    await this.loadMemory();

    this.push('user', `GOAL: ${goal}`);
    this.log(`▶ PLAN phase — goal: "${goal}"`);

    // ───────────── PHASE 1: PLAN ─────────────
    const planPrompt = `Kamu adalah agent otonom. Pecah goal berikut menjadi maksimum ${this.opts.maxSteps} langkah konkret yang dapat dieksekusi berurutan.

GOAL: ${goal}

KONTEKS MEMORI SESI SEBELUMNYA (jika ada):
${this.memoryContext()}

Balas HANYA dengan JSON valid format ini, tanpa teks lain:
{"steps":[{"index":1,"description":"...","expectedOutput":"..."},{"index":2,"description":"...","expectedOutput":"..."}]}`;

    const planRaw = await this.base.executeTask(planPrompt);
    const planParsed = safeParseJSON<{ steps: PlanStep[] }>(planRaw, { steps: [] });
    const plan: PlanStep[] = (planParsed.steps || [])
      .slice(0, this.opts.maxSteps)
      .map((s, i) => ({ index: s.index ?? i + 1, description: s.description, expectedOutput: s.expectedOutput }));

    if (plan.length === 0) {
      plan.push({ index: 1, description: goal });
      this.log(`⚠ Plan tidak terparse, fallback ke 1-step.`);
    }
    this.log(`✓ Plan ${plan.length} langkah dibuat.`);
    this.push('agent', `PLAN(${plan.length} steps): ${plan.map(s => s.description).join(' | ')}`);

    // ───────────── PHASE 2: EXECUTE ─────────────
    const executions: AutonomousResult['executions'] = [];
    for (const step of plan) {
      this.log(`▶ EXECUTE step ${step.index}/${plan.length}: ${step.description.slice(0, 80)}`);
      const t = Date.now();
      const stepPrompt = `Kamu sedang menjalankan langkah ${step.index} dari ${plan.length} pada GOAL: "${goal}".

KONTEKS MEMORI SEBELUMNYA:
${this.memoryContext()}

LANGKAH SAAT INI: ${step.description}
${step.expectedOutput ? `OUTPUT YANG DIHARAPKAN: ${step.expectedOutput}` : ''}

Jalankan langkah ini dan beri hasilnya. Singkat tapi konkret.`;

      let result = '';
      try {
        result = await this.base.executeTask(stepPrompt);
      } catch (e: any) {
        result = `[STEP FAILED] ${e.message}`;
      }
      const durationMs = Date.now() - t;
      executions.push({ step, result, durationMs });
      this.push('agent', `STEP ${step.index} RESULT: ${result.slice(0, 300)}`);
      this.log(`✓ Step ${step.index} selesai (${durationMs}ms).`);
    }

    // ───────────── PHASE 3: VERIFY ─────────────
    this.log(`▶ VERIFY phase`);
    const verifyPrompt = `Kamu adalah self-auditor. Evaluasi apakah eksekusi berikut benar-benar mencapai GOAL.

GOAL ASLI: ${goal}

HASIL EKSEKUSI:
${executions.map(e => `Step ${e.step.index} (${e.step.description}):\n${e.result.slice(0, 400)}`).join('\n\n')}

Balas HANYA JSON valid:
{"done":true|false,"score":0-100,"issues":["...","..."],"summary":"ringkasan 1 kalimat"}`;

    const critiqueRaw = await this.base.executeTask(verifyPrompt);
    const critique = safeParseJSON(critiqueRaw, {
      done: true, score: 70, issues: [], summary: 'Critique tidak terparse, dianggap done.'
    });
    this.log(`✓ Critique: done=${critique.done}, score=${critique.score}`);
    this.push('system', `CRITIQUE: ${JSON.stringify(critique)}`);

    // ───────────── PHASE 4: REFINE (jika perlu) ─────────────
    let final = executions[executions.length - 1]?.result || '';
    let refined = false;
    if (!critique.done && (this.opts.maxRefinements ?? 1) > 0) {
      this.log(`▶ REFINE phase (issues: ${critique.issues.length})`);
      const refinePrompt = `Audit menemukan goal BELUM tercapai sempurna.

GOAL: ${goal}
ISSUES: ${critique.issues.join('; ')}
HASIL TERAKHIR: ${final.slice(0, 800)}

Berikan JAWABAN FINAL yang sudah memperbaiki issues di atas. Langsung jawaban final, tanpa preamble.`;
      try {
        final = await this.base.executeTask(refinePrompt);
        refined = true;
        this.push('agent', `REFINED FINAL: ${final.slice(0, 300)}`);
        this.log(`✓ Refinement selesai.`);
      } catch (e: any) {
        this.log(`⚠ Refinement gagal: ${e.message}, pakai hasil sebelumnya.`);
      }
    }

    const totalDurationMs = Date.now() - t0;
    this.log(`■ DONE in ${totalDurationMs}ms — refined=${refined}`);

    return { goal, plan, executions, critique, final, totalDurationMs, refined };
  }
}
