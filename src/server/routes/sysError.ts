import express from 'express';
import fs from 'fs';
import path from 'path';
import { SwarmOrchestrator } from '../../sAgent/coreAgents/SwarmOrchestrator';

export const sysErrorRouter = express.Router();
const ERROR_LOG_PATH = path.join(process.cwd(), 'erorr_console.log');
const seenErrors = new Set<string>();

// Ensure file exists at startup
if (!fs.existsSync(ERROR_LOG_PATH)) {
  fs.writeFileSync(ERROR_LOG_PATH, `[${new Date().toISOString()}] LOG SYSTEM INITIALIZED\n----------------------------------\n`);
}

// Global orchestrator specifically for the Auto-Fix system
let autoFixSwarm: SwarmOrchestrator | null = null;
let isFixing = false;

async function getOrchestrator() {
  if (!autoFixSwarm) {
    autoFixSwarm = new SwarmOrchestrator();
    await autoFixSwarm.bootSwarm({});
  }
  return autoFixSwarm;
}

sysErrorRouter.post('/', async (req, res) => {
  const { message, source, lineno, colno, errorStack } = req.body;

  const ERROR_LOG_PATH = path.resolve(process.cwd(), 'erorr_console.log');
  const isRealError = !message.startsWith('[LOG]') && !message.startsWith('[WARN]');

  // Normalisasi string error untuk mencek duplikat (Hanya untuk error asli agar log biasa tidak terlewat)
  const errorKey = `${message}-${source}-${lineno}-${colno}`;

  if (isRealError && seenErrors.has(errorKey)) {
    // Ignore duplicate errors to prevent redundant API calls / loops
    return res.json({ status: 'ignored', reason: 'duplicate' });
  }

  if (isRealError) {
    seenErrors.add(errorKey);
  }

  // Batasi error memory agar tidak leak
  if (seenErrors.size > 1000) {
    seenErrors.clear();
  }

  // Formatting log
  const logEntry = `[${new Date().toISOString()}] ${message}\nSOURCE: ${source}:${lineno || '?'}:${colno || '?'}\nSTACK:\n${errorStack || 'N/A'}\n----------------------------------\n`;
  
  try {
    const fd = fs.openSync(ERROR_LOG_PATH, 'a');
    fs.appendFileSync(fd, logEntry);
    fs.fsyncSync(fd);
    fs.closeSync(fd);
    // console.log(`[SysError] New entry written to erorr_console.log!`);
  } catch (e) {
    console.error('Failed to write to erorr_console.log', e);
  }

  // Hanya trigger auto-fix jika itu benar-benar error (bukan log/warn)
  if (!isRealError) {
    return res.json({ status: 'logged' });
  }

  // Jika sedang memperbaiki error, hindari menumpuk task perbaikan yang menyebabkan limit kuota
  if (isFixing) {
    return res.json({ status: 'logged', note: 'Swarm is currently busy fixing another issue.' });
  }

  // Autonomous Swarm Trigger
  isFixing = true;
  res.json({ status: 'logged', action: 'Auto-fix swarm activated' });

  // Do not block the request response
  setImmediate(async () => {
    try {
      console.log(`\n================================`);
      console.log(`🚨 SUPREME PROTOCOL: ERROR DETECTED`);
      console.log(`🚨 Triggering Autonomous Sub-Agents for Auto-Fix!`);
      const swarm = await getOrchestrator();
      
      const debugPrompt = `
Sistem mendeteksi error di lingkungan preview UI.
Tugas Anda adalah:
1. Menganalisis log error ini.
2. Mencari file yang berhubungan menggunakan alat FileSystemBridge.
3. Melakukan perbaikan (write file / edit) tanpa instruksi tambahan dari saya.

Berikut adalah log runtime aplikasi:
PESAN ERROR: ${message}
FILE: ${source} (Line: ${lineno}, Col: ${colno})
STACK: ${errorStack || 'Tidak tersedia'}

Selesaikan secepat dan seakurat mungkin.
`;

      console.log(`[AutoFix] >>> Menyebar instruksi perbaikan kepada tim...`);
      // 4 Agents Standby for bugfix:
      // - agent6: The Inquisitor (Root cause analyzer)
      // - agent7: The Mechanic (The actual code Fixer)
      // - agent1: The Weaver (Structure integrity)
      // - agent3: The Sentinel (Security verification)

      console.log(`[AutoFix] 🛠️ Agent 6 (The Inquisitor) menganalisis masalah...`);
      const res6 = await swarm.delegateTask('agent6', debugPrompt + "\\nAnalisis masalah dan tentukan file mana yang menyebabkan error.");
      console.log(`[AutoFix] The Inquisitor Response:\n${res6}\n`);

      // Cooldown API Limit 15 detik
      await new Promise(r => setTimeout(r, 15000));

      console.log(`[AutoFix] 🔧 Agent 7 (The Mechanic) menerapkan perbaikan...`);
      const prompt7 = `
Hasil analisis Inquisitor:
${res6}

Error aslinya: ${message}

Tugasmu: Gunakan alat FileSystemBridge untuk membaca kode yang bermasalah, lalu lakukan perbaikan menggunakan alat writeFile atau searchCode jika perlu. Perbaiki kodenya sekarang. Beritahu file apa yang kamu ganti.`;
      
      const res7 = await swarm.delegateTask('agent7', prompt7);
      console.log(`[AutoFix] The Mechanic Response:\n${res7}\n`);

      // Cooldown API Limit 15 detik
      await new Promise(r => setTimeout(r, 15000));

      console.log(`[AutoFix] 🕸️ Agent 1 (The Weaver) memeriksa kompatibilitas import dan logika...`);
      const res1 = await swarm.delegateTask('agent1', `Perbaikan sudah dilakukan: ${res7}\n\nTugasmu: Mengecek apakah perbaikan tersebut mematahkan arsitektur React atau Express. Gunakan FileSystemBridge untuk melihat hasil akhirnya. Fokus menjaga integritas, jika ada syntax keliru, perbaiki lagi.`);
      console.log(`[AutoFix] The Weaver Response:\n${res1}\n`);

      // Cooldown API Limit 15 detik
      await new Promise(r => setTimeout(r, 15000));

      console.log(`[AutoFix] 🛡️ Agent 3 (The Sentinel) melakukan validasi fatal...`);
      const res3 = await swarm.delegateTask('agent3', `Perubahan yang telah berjalan: \nInquisitor: ${res6}\nMechanic: ${res7}\nWeaver: ${res1}\n\nTugas terakhirmu: Verifikasi tidak ada security leak atau fatal loop crash. Jika aman, respon: STATUS AMAN. Jika ada masalah, tambal langsung kode tersebut.`);
      console.log(`[AutoFix] The Sentinel Response:\n${res3}\n`);

      console.log(`[AutoFix] ✅ Misi Auto-Fix selesai!`);
      console.log(`================================\n`);

    } catch (swarmErr) {
      console.error(`[AutoFix] Swarm Orchestration Error:`, swarmErr);
    } finally {
      isFixing = false; // Release the lock
    }
  });
});
