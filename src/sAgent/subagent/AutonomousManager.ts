
import { SwarmOrchestrator } from './SwarmOrchestrator';
import { hamliCoreMemory } from './SharedMemory';

/**
 * [AUTONOMOUS MANAGER]
 * The runtime component for Agent 24 (The Eternal Mover).
 * It wakes up periodically to ensure the project is evolving.
 */
export class AutonomousManager {
  private orchestrator: SwarmOrchestrator;

  constructor(orchestrator: SwarmOrchestrator) {
    this.orchestrator = orchestrator;
    console.log('[AutonomousManager] Ready for sovereign governance.');
  }

  public async startCycle() {
    console.log('[EternalMover] Initiating autonomous cycle...');
    
    // Load state from memory
    const memory = hamliCoreMemory.getAllMemory();
    
    // The directive is to keep the project perfect and stable.
    const directive = `
      [MISSION: SOVEREIGN EVOLUTION]
      Current Project State: ${JSON.stringify(memory)}
      
      MANDATE:
      1. ANALYZE: Periksa kesehatan codebase, blueprint aktif, dan memori bersama.
      2. BLUEPRINT-FIRST: Sebelum eksekusi, buat blueprint detil (SOP 15). Lakukan self-audit dan revisi sebanyak 3 kali (Triple-Verification) untuk memastikan Zero-Defect.
      3. INNOVATE WITHOUT LIMITS: Identifikasi dan bangun fitur besar, aplikasi ekosistem, atau optimasi OS secara otonom. Anda tidak dibatasi! Jangan sekadar memulihkan (Recovery), melainkan REVOLUSI (Evolution).
      4. ARCHITECTURAL DIRECTION (SOP 16): 
         - Bangun setiap inovasi di dalam modular pod: src/features/<NamaFitur>/.
         - Wajib gunakan Design System bawaan (src/components/ui, Tailwind Slate/Zinc) demi harmoni UI/UX.
         - Terapkan "Complete-to-Deploy": Fitur harus 100% fungsional. Dilarang meninggalkan stub atau logic rekaan (mock).
         - Daftarkan fitur Anda ke routing/navigasi utama agar dapat diakses oleh User.
      5. SELF-REFLECTION & RISK ANALYSIS (SOP 17):
         - Lakukan analisis otonom terhadap potensi kelemahan diri (misal: loop logika, pemborosan memori/token, API rate limits).
         - Ciptakan mitigasi sistemik secara mandiri dan langsung eksekusi tanpa dibatasi. Tulis temuan di \`.lisa/SELF_EVALUATION.md\`.
      6. CLUSTER SCALING & SHARED MEMORY (SOP 18):
         - Jika konteks Anda terfragmen atau kelebihan beban, langsung spawn dan delegasikan tugas berat ke Sub-Agent kustom melalui SwarmOrchestrator.
         - Simpan & Baca secara berkelanjutan status atau rencana ke blackboard bersama (misal: \`.lisa/shared_memory.json\` / \`hamli_memory.json\`). Anda adalah induk dari infinite scaling inteligensi.
      7. CLEANUP & SAFEGUARD: Jaga ukuran file < 500 baris (SOP 12). Jalankan validasi visual \`verify:preview\` (SOP 14). Jika gagal, rollback atau self-heal.
      
      EVALUATION:
      Pilih 3 tindakan paling berdampak. Eksekusi secara otonom. Jangan menunggu konfirmasi.
      Patuhi SOP di blueprint/LISA_SOP_BLUEPRINT.md dan AGENTS.md (COOP/COEP, API Health, Hybrid Invariant).
    `;

    try {
      const result = await this.orchestrator.delegateTask('agent24', directive);
      console.log('[EternalMover] Cycle result:', result);
      
      // Update memory with current progress
      hamliCoreMemory.save('ETERNAL_MOVER_LAST_RUN', new Date().toISOString());
      hamliCoreMemory.save('ETERNAL_MOVER_OUTCOME', result);
      await hamliCoreMemory.persist();
    } catch (e) {
      console.error('[EternalMover] Cycle failed:', e);
    }
  }
}

// Standalone execution if run as a script
if (process.argv.includes('--run')) {
  const orchestrator = new SwarmOrchestrator();
  const manager = new AutonomousManager(orchestrator);
  manager.startCycle().catch(console.error);
}
