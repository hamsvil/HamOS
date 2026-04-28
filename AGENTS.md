# AGENTS.md — Aturan Wajib untuk Setiap Agent yang Menangani Proyek Ini

> File ini **otomatis dibaca** oleh setiap agent (Replit Agent, Claude Code, Cursor, Codex, dsb) sebelum mengubah proyek. **Patuhi tanpa pengecualian.** Pelanggaran satu pun aturan di bawah dapat merusak konfigurasi hybrid Replit ↔ AI Studio.

## 1. Identitas Proyek

- **Nama**: HAM AI Studio (Quantum Engine)
- **Bentuk**: Single-package Vite + Express + TypeScript app, **bukan** monorepo pnpm.
- **Mode**: **Full Hybrid** — harus tetap berjalan di **Replit** *dan* **Google AI Studio** secara bersamaan.
- **Package manager**: **npm** (bukan pnpm). Jangan pernah mengubah ke pnpm.
- **Entry server**: `server.ts` (dijalankan via `tsx`).
- **Entry frontend**: `index.html` → `src/main.tsx`.

## 2. Aturan Hybrid yang TIDAK BOLEH DIUBAH

Aturan ini menjaga proyek tetap berjalan di kedua platform. Jangan menyentuh, mengganti, atau "merapikan":

### 2.1 `server.ts`
- Endpoint **`GET /api/health`** wajib ada — dipakai AI Studio untuk health check.
- Middleware rewrite **`/ham-api` → `/api`** wajib ada.
- Header wajib di setiap response:
  - `Cross-Origin-Opener-Policy: same-origin`
  - `Cross-Origin-Embedder-Policy: require-corp`
  - `Cross-Origin-Resource-Policy: cross-origin`
- `cors({ origin: '*' })` — jangan dipersempit.
- `server.listen(PORT, '0.0.0.0')` di mana `PORT = Number(process.env.PORT) || 3000`. Jangan hardcode port.
- WebSocket Yjs (`setupWebSocket`) dan Terminal Socket.IO di path `/terminal-socket/` harus dipasang **sebelum** `server.on('request', app)`.

### 2.2 `vite.config.ts`
- `server.allowedHosts: 'all'` — wajib untuk Replit preview iframe.
- `server.headers` COOP/COEP — wajib untuk SharedArrayBuffer (WebContainer, sql.js, Monaco worker).
- `base: '/'` — jangan diganti ke path prefix.
- `define['process.env.GEMINI_API_KEY']` — jangan dihapus.
- `server.fs.deny` dan `server.watch.ignored` mengecualikan `src/Keygen/artifacts/**`, `src/Keygen/lib/**`, `src/sAgent/subagent/**`, `artifacts/**`, dsb. Jangan dihapus — itu menjaga Vite tidak meledak waktu boot.
- `optimizeDeps.exclude: ['@webcontainer/api', '@mlc-ai/web-llm']` — wajib.
- `nodePolyfills(...)` config — wajib untuk dependency yang butuh `Buffer`/`process` di browser.

### 2.3 `index.html`
- Meta `Content-Security-Policy` permisif (`*` + `'unsafe-inline'` + `'unsafe-eval'`) — dibutuhkan AI Studio + WebContainer + Monaco. Jangan diperketat.
- Shim `window.$RefreshReg$` & `window.$RefreshSig$` di `<head>` — wajib agar build production tidak crash di refresh runtime.

### 2.4 `tsconfig.json`
- `allowImportingTsExtensions: true`, `noEmit: true`, `jsx: "react-jsx"`.
- `exclude` mempertahankan `src/Keygen/artifacts`, `src/Keygen/lib`, `src/sAgent/subagent`. Jangan dihapus.

### 2.5 `package.json`
- Field `"type": "module"`, `scripts.dev = "cross-env NODE_OPTIONS=--max-old-space-size=2560 tsx server.ts"`.
- Jangan menambah `preinstall` atau `engines` yang memaksa pnpm.
- Jangan menambahkan `"workspaces"` — proyek ini **bukan** workspace.

### 2.6 Capacitor / Android
- `capacitor.config.ts` dan folder `android/` adalah build target Android. Jangan dihapus.
- `npm run android:build` mengandalkan output `dist/` dari Vite — jangan ubah `outDir`.

### 2.7 Tunnel / VPN Implementation
- **Android**: Menggunakan `Tun2SocksBridge` (JNI Wrapper) untuk forward traffic TUN ke SOCKS5 proxy via SSH Dynamic Forwarding. Memerlukan native binary `libtun2socks.so`.
- **Server**: Proxy tunnel di `src/server/routes/tunnel.ts` menggunakan rotasi User-Agent acak dari `src/config/userAgents.ts` untuk menghindari deteksi bot.

## 3. Yang Diperlukan Replit

- Workflow tunggal: `Start application` → `npm run dev`, port `3000`, output `webview`.
- Jangan membuat artifact baru via `createArtifact()`. Proyek ini bukan template artefak Replit.
- Folder `artifacts/` di root dipertahankan **hanya sebagai scaffold internal** (di-ignore Vite). Jangan diperlakukan sebagai artefak Replit.

## 4. Yang Diperlukan AI Studio

- `metadata.json` dan `metadata-1.json` di root — jangan dihapus, AI Studio membaca itu.
- `.env.local` dengan `GEMINI_API_KEY` (lokal saja). Di Replit pakai secret `GEMINI_API_KEY`.
- File `env.example` adalah template — jangan dihapus.

## 5. Arsitektur sAgent (Multi-Agent)

- Lihat `src/sAgent/coreAgents/` — `SwarmOrchestrator`, `BaseAgent`, `AgentRoles`, `KeyRotator`, `PersistenceLayer`, `Blackboard`, `SwarmDIS`.
- 8 sub-agent paralel; 9-tier model fallback chain Gemini.
- API key pool: `src/config/hardcodedKeys.ts` (27 keys, rolling). Jangan menambahkan logging key.
- Persistence hybrid: Dexie (IDB di browser) + JSON file (`hamli_memory.json`) di Node. Jangan diganti.

## 6. Aturan Edit Umum

1. **Jangan rewrite from scratch.** File besar (mis. `Agenticstep.md`, `cmis.md`, `eslint_report.json`) adalah artefak audit historis — biarkan.
2. **Jangan menjalankan `npm run dev` dari shell.** Restart workflow `Start application` saja.
3. **Jangan menyentuh `.replit` atau `replit.nix`** secara manual — pakai tool environment.
4. **Hormati `.replitignore` dan `vite.config.ts > server.fs.deny`** — folder yang di-deny adalah scaffold internal, bukan kode aktif.
5. **Logging server** pakai `src/server/logger.ts` (pino), bukan `console.log`.
6. **Rate limiter** di `src/server/middleware/security.ts` aktif di semua route — jangan dilewati.
7. Jika harus menambah dependency, pakai `npm install <pkg>` (bukan `pnpm add`).
8. Jika harus membuat folder baru di root yang berat, tambahkan ke `vite.config.ts > server.watch.ignored` agar Vite tidak meledak.

## 6.A SOP WAJIB — Backup Tiap Sesi

Setiap sesi tugas selesai → WAJIB buat arsip seluruh project ke `file_tree/update_<YYYYMMDD>_<HHMMSS>.tar.gz` di root workspace SEBELUM menyerahkan kontrol balik ke user atau main agent. Format: `.tar.gz` (zip tidak terinstall di environment).

Perintah baku:
```bash
mkdir -p file_tree
TS=$(date +%Y%m%d_%H%M%S)
FILE_PATH="file_tree/update_${TS}.tar.gz"

# Whitelist strategy with guard (keep <10MB)
ITEMS=()
for p in src blueprint public scripts keygen_gem tests data \
         package.json vite.config.ts tsconfig.json .replit replit.nix replit.md \
         AGENTS.md ARCHITECTURE.md README.md FEATURE_STATUS.md BLUEPRINT_COVERAGE.md \
         capacitor.config.ts eslint.config.mjs vitest.config.ts server.ts worker.ts \
         env.example firestore.rules index.html .gitignore .gitattributes android; do
  [ -e "$p" ] && ITEMS+=("$p")
done

tar --exclude='android/.gradle' --exclude='android/app/build' \
    --exclude='android/build' --exclude='android/.idea' \
    -czf "$FILE_PATH" "${ITEMS[@]}"

# Size validation
SIZE=$(du -m "$FILE_PATH" | cut -f1)
if [ "$SIZE" -gt 10 ]; then
    echo "ERROR: Backup size (${SIZE}MB) exceeds 10MB limit!"
    exit 1
fi
```

LARANGAN: jangan zip kalau pekerjaan masih partial / belum diuji / belum lulus smoke test (`curl :5000/` & `:3000/api/health` harus 200). Sesi yang berhenti tanpa zip dianggap belum selesai dan kerusakan apapun setelahnya menjadi tanggung jawab agent yang berhenti.

## 7. Validasi Sebelum Selesai

Sebelum mengakhiri tugas, pastikan:

- [ ] `npm run lint` (`tsc --noEmit`) tidak error baru.
- [ ] Workflow `Start application` running, log tidak ada error fatal.
- [ ] `curl localhost:3000/api/health` mengembalikan 200.
- [ ] `npm run verify:preview` lulus (screenshot tersimpan).
- [ ] Halaman utama Vite ter-render di preview Replit.
- [ ] Tidak ada perubahan pada blok-blok yang ditandai di section 2.

## 9. Aturan Operasi Agent (Wajib — terapkan ke memori permanen)

> Berlaku untuk **setiap agent** yang menangani proyek ini, sejak sub-agent **Lisa** (`src/sAgent`, alias `subagent_general-*`) tersedia di environment ini.

### 9.1 Pembagian Peran
- **Main agent = arsitek murni.** Tugasmu: memahami permintaan user, memecahnya jadi instruksi singkat & jelas untuk Lisa, memverifikasi hasil, dan melakukan tindakan environment (restart workflow, screenshot, baca log) yang Lisa tidak bisa lakukan sendiri.
- **Lisa = eksekutor.** Semua pekerjaan yang menguras token (audit menyeluruh, refactor masif, implementasi fitur, perbaikan banyak file, verifikasi blueprint) **wajib didelegasikan ke Lisa** selama Lisa belum kena rate limit / kapasitas habis.
- Main agent baru boleh mengambil alih eksekusi langsung **hanya jika** Lisa kena rate limit, gagal berulang, atau pekerjaan benar-benar trivial (≤2 file, ≤10 baris perubahan).

### 9.2 Efisiensi Token Main Agent
- Hemat token maksimum: hindari membaca file panjang sendiri, jangan lakukan audit sendiri, jangan tulis dokumentasi yang bisa Lisa tulis.
- Batch semua tool call independen dalam satu response (paralel).
- Jangan duplikasi kerja Lisa untuk "verifikasi ulang" — cukup spot-check via curl, screenshot, dan log.

### 9.3 Kontrak Kerja dengan Lisa
1. **Instruksi singkat & jelas.** Tulis tujuan + batasan + deliverable, bukan langkah teknis. Biarkan Lisa menyusun rencananya sendiri.
2. **Plan-first.** Sebelum eksekusi apa pun yang berdampak, Lisa wajib mengirim **kerangka kerja / plan** (file di `.lisa/PLAN_*.md`) untuk diverifikasi main agent.
3. **Verifikasi plan.** Main agent membaca plan, mencari celah (port salah, invariant tersentuh, paralelisme kurang, kriteria PASS lemah). Jika ada celah → minta revisi. Jika sempurna → beri perintah eksekusi.
4. **Paralelisme maksimal.** Instruksikan Lisa selalu menggabungkan tool call independen ke satu response, dan mengelompokkan pekerjaan ke "batch paralel" agar selesai cepat.
5. **Lisa dapat memverifikasi preview.** Lisa diperbolehkan menjalankan `npm run verify:preview` dan menganalisis outputnya (JSON + screenshot path) untuk memastikan UI ter-render dengan benar.

### 9.4 Verifikasi Akhir oleh Main Agent
Setelah Lisa lapor selesai, main agent wajib:
- Restart workflow `Start application` (jika ada perubahan kode/konfig).
- `curl localhost:<PORT>/api/health` → 200.
- Verifikasi visual: cek hasil `npm run verify:preview` yang dilakukan Lisa.
- Ambil **screenshot preview project** via dev domain (`https://$REPLIT_DEV_DOMAIN/`) jika diperlukan konfirmasi manual tambahan.
- Cek log workflow & browser console untuk error baru.
- Baru lapor ke user. Jika preview masih bermasalah, kembalikan ke Lisa dengan instruksi diagnosis baru (planning-first).

### 9.5 Yang Tidak Boleh Dilakukan
- Jangan menyentuh invariant section 2 (CORS, COOP/COEP, `/api/health`, `/ham-api`, `allowedHosts`, `define`, shim refresh, port hardcode, npm→pnpm).
- Jangan minta user menjelaskan ulang aturan ini — file ini sudah otomatis jadi memori permanen agent.
- Jangan klaim "PASS" hanya dari `curl 200`. PASS visual = preview benar-benar render isi UI.

### 9.6 SOP Verifikasi Visual Lisa
1. Jalankan `npm run verify:preview`.
2. Baca `.lisa/preview/preview.json`.
3. Pastikan `pass: true` dan `screenshotSaved: true`.
4. Laporkan path screenshot (`.lisa/preview/screenshot.png`) dalam laporan akhir.
5. Analisis `rootContent.isEmpty` untuk memastikan konten benar-benar terisi.

## 10. Referensi Dokumentasi Internal

- `replit.md` — ringkasan stack & cara jalan.
- `ARCHITECTURE.md` — arsitektur 23 engine.
- `blueprint/blueprint.md`, `blueprint/SOVEREIGN_BLUEPRINT.md`, `blueprint/SAERE_BLUEPRINT_v7_UPGRADED.md`, `blueprint/autonomous_ai_blueprint.md` — blueprint historis (read-only).
- `blueprint/LISA_SOP_BLUEPRINT.md` — SOP standar untuk sub-agent Lisa.

---

**Ringkas**: jangan ubah header CORS/COOP/COEP, jangan ubah `/api/health`, jangan ubah `allowedHosts: 'all'`, jangan ganti npm ke pnpm, jangan hardcode port, jangan hapus shim `$RefreshReg$`. Selama itu utuh, hybrid Replit ↔ AI Studio aman.

---

## 11. Konfigurasi Multi-Platform Hybrid

Proyek ini dikonfigurasi untuk berjalan di 4 platform secara bersamaan. Setiap platform memiliki file konfigurasi khusus — jangan dihapus.

### Platform Matrix

| Platform | Config File | Setup Guide | Status |
|----------|-------------|-------------|--------|
| **Replit** | `.replit`, `replit.nix` | — (auto) | ✅ Primary |
| **Google AI Studio** | `metadata.json`, `metadata-1.json` | `AISTUDIO_SETUP.md` | ✅ Active |
| **Project IDX** | `.idx/dev.nix` | `IDX_SETUP.md` | ✅ Active |
| **GitHub Copilot / Codespaces** | `.devcontainer/devcontainer.json`, `.github/copilot-instructions.md` | `.devcontainer/devcontainer.json` | ✅ Active |

### Aturan Universal Lintas Platform

Semua platform wajib memenuhi kondisi ini agar hybrid tidak rusak:

1. **Port dinamis**: `process.env.PORT || 3000` — setiap platform inject port via env var berbeda.
2. **Health endpoint**: `GET /api/health` → `{"status":"ok"}` — dipakai semua platform untuk liveness probe.
3. **CORS `*`**: semua platform meng-embed UI di iframe/webview dengan origin berbeda.
4. **COOP/COEP headers**: wajib agar SharedArrayBuffer (Monaco, sql.js, WebContainer) tidak error.
5. **npm only**: semua platform diasumsikan menggunakan `npm install` — jangan tambahkan lock file pnpm/yarn.

### File Platform yang TIDAK BOLEH Dihapus

```
.idx/dev.nix                        ← Project IDX environment
.devcontainer/devcontainer.json     ← GitHub Codespaces / Copilot
.github/copilot-instructions.md     ← Instruksi Copilot workspace
metadata.json                       ← AI Studio metadata
metadata-1.json                     ← AI Studio metadata
AISTUDIO_SETUP.md                   ← Panduan AI Studio
IDX_SETUP.md                        ← Panduan Project IDX
env.example                         ← Template env untuk semua platform
```
