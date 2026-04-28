/**
 * KEYGEN GEM — BACKGROUND RUNNER
 * Menjalankan ServerGeminiAgent terus-menerus tanpa henti.
 * Cara jalankan: npx tsx keygen_gem/run.ts
 */

import { ServerGeminiAgent } from './server_agent';
import fs from 'node:fs';
import path from 'node:path';

// Pastikan folder logs ada
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) fs.mkdirSync(logsDir, { recursive: true });

const attemptLog = path.join(logsDir, 'keygen_attempts.log');
const validLog   = path.join(logsDir, 'valid_keys.log');

// ─── Config ──────────────────────────────────────────────────
// Jumlah coroutine sentinel yang berjalan paralel sekaligus
// Default 40 — bisa dinaikkan via env KEYGEN_CLONES=80
const CLONE_COUNT = parseInt(process.env.KEYGEN_CLONES || '40', 10);

// ─── Boot ────────────────────────────────────────────────────
console.log('╔══════════════════════════════════════════════════╗');
console.log('║  KEYGEN GEM — Sovereign Background Mode          ║');
console.log('║  Mode     : 24/7 TANPA JEDA                      ║');
console.log(`║  Clones   : ${String(CLONE_COUNT).padEnd(4)} sentinel paralel            ║`);
console.log(`║  Valid Log: logs/valid_keys.log                   ║`);
console.log('╚══════════════════════════════════════════════════╝');
console.log(`  Mulai: ${new Date().toLocaleString('id-ID')}\n`);

fs.appendFileSync(attemptLog,
  `\n[${new Date().toISOString()}] ===== KEYGEN BOOT (${CLONE_COUNT} clones) =====\n`
);

const agent = new ServerGeminiAgent();

// Sesuaikan jumlah clone jika berbeda dari default
agent.adjustSwarmSize(CLONE_COUNT);
agent.start();

// ─── Stats Ticker (tiap 60 detik) ────────────────────────────
let lastValidCount = 0;
setInterval(() => {
  try {
    const validContent = fs.existsSync(validLog)
      ? fs.readFileSync(validLog, 'utf8') : '';
    const currentCount = (validContent.match(/VALID KEY/g) || []).length;
    const newFound = currentCount - lastValidCount;
    lastValidCount = currentCount;

    const attemptContent = fs.existsSync(attemptLog)
      ? fs.readFileSync(attemptLog, 'utf8') : '';
    const totalAttempts = (attemptContent.match(/\[/g) || []).length;

    console.log(
      `[Stats] ${new Date().toLocaleTimeString('id-ID')} | ` +
      `Valid ditemukan: ${currentCount} total (+${newFound} baru) | ` +
      `Clones aktif: ${CLONE_COUNT}`
    );
  } catch (_) {}
}, 60_000);

// ─── Graceful Shutdown ────────────────────────────────────────
const shutdown = (sig: string) => {
  console.log(`\n[KeygenGem] Menerima ${sig}. Menghentikan swarm...`);
  agent.stop();
  fs.appendFileSync(attemptLog,
    `[${new Date().toISOString()}] ===== KEYGEN STOP (${sig}) =====\n`
  );
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));

// Cegah proses exit karena unhandled rejection
process.on('unhandledRejection', (reason) => {
  console.error('[KeygenGem] Unhandled rejection (lanjut berjalan):', reason);
});
