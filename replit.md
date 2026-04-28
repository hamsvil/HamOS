# HAM AI Studio — Replit

> **Penting**: setiap agent yang membuka proyek ini WAJIB membaca `AGENTS.md` lebih dulu. Itu memuat aturan hybrid Replit ↔ AI Studio yang tidak boleh dilanggar, **dan** Aturan Operasi Agent (section 9) yang menjadi memori permanen workflow main agent ↔ Lisa.

## Aturan Operasi Agent (Ringkas — detail di AGENTS.md §9)
- Sejak sub-agent **Lisa** tersedia, **main agent = arsitek**, **Lisa = eksekutor**.
- Pekerjaan boros token wajib didelegasikan ke Lisa selama Lisa belum kena rate limit.
- Main agent: instruksi singkat & jelas; biarkan Lisa menyusun plan sendiri.
- Lisa wajib kirim **plan** (`.lisa/PLAN_*.md`) untuk diverifikasi sebelum eksekusi. Jika plan sempurna → eksekusi. Jika ada celah → revisi.
- Lisa selalu kerja **paralel maksimum** (batch tool call independen ke 1 response).
- Lisa **tidak boleh restart workflow** dan **tidak bisa lihat preview iframe** — verifikasi visual via screenshot adalah tugas main agent.
- Setelah Lisa selesai: main agent restart workflow → curl `/api/health` → screenshot `https://$REPLIT_DEV_DOMAIN/` → cek log → baru lapor user.
- Jangan klaim PASS hanya dari `curl 200`. PASS visual = UI benar-benar render.

## Gambaran Singkat
Aplikasi AI Studio berbasis web yang berjalan **full hybrid**: dapat diakses di **Replit** dan **Google AI Studio**. Stack: React 19 + Vite 6 + TypeScript + Express 4 + Socket.IO, dengan multi-agent SwarmOrchestrator dan 9-tier Gemini fallback.

## Cara Menjalankan

| Aksi | Cara |
| --- | --- |
| Run dev (Replit) | Workflow `Start application` (otomatis `npm run dev`, port 3000) |
| Build production | `npm run build` (output `dist/`) |
| Lint | `npm run lint` (tsc --noEmit) |
| Test | `npm run test` |
| Build APK | `npm run android:build` |

## Stack Inti
- **Frontend**: React 19 + Vite 6 + TS + Tailwind v4 + Framer Motion + Monaco
- **Backend**: Express 4 + Socket.IO + tsx + pino logger
- **AI**: Google Gemini via `@google/genai` (9-tier fallback chain)
- **State**: Zustand + React Context + Yjs (collab)
- **Storage**: Dexie (IDB) + lightning-fs (VFS) + JSON file
- **Multi-Agent**: 8 sub-agent paralel (`SwarmOrchestrator`)

## Terminal & File Explorer S+ Grade
- **Fitur Terminal**: Shell interactive server-side (Socket.io), PTY simulation via `script`, xterm.js frontend, resize support.
- **Termux-style**: Wrapper `pkg` untuk `nix-env` / `npm`.
- **File Explorer**: 50+ komponen modular (Tree, Grid, Viewer, Editor, etc.).
- **Endpoint Backend**: `/api/file-explorer/*` (list, read, write, rename, delete, etc.) dengan sanitasi path ketat.
- **Security**: Sandboxing ke workspace root, validasi path `..` blocking.

## Changelog
- TS Fix Production Modals + Capacitor Browser Integration 2026-04-24
- UI Mobile Fix 2026-04-24: scrollable main drawer, safe-area, watchdog tuning, fullscreen Capacitor
- Integrated @capacitor/status-bar for native fullscreen support.
- Optimized safeStorage boot phase to reduce console warnings.
- Improved mobile accessibility with larger touch targets in BottomDock.
- Fixed AppDrawer scrollability and safe-area insets for native WebView.

## File Penting
```
AGENTS.md                  ← WAJIB DIBACA agent. Aturan hybrid.
blueprint/LISA_SOP_BLUEPRINT.md  ← SOP standar sub-agent Lisa.
server.ts                  ← Express entry, /api/health, COOP/COEP
vite.config.ts             ← allowedHosts: 'all', deny scaffold
src/main.tsx               ← React entry
src/sAgent/                ← Multi-agent core
src/config/hardcodedKeys.ts ← Pool 27 Gemini keys
metadata.json              ← AI Studio metadata
capacitor.config.ts        ← Android build
```

## Konfigurasi Hybrid (ringkas)
Detail di `AGENTS.md §2`. Jangan ubah:
- `/api/health` + `/ham-api → /api` rewrite
- COOP/COEP/CORP headers
- `cors({ origin: '*' })`
- `server.allowedHosts: 'all'` (Vite)
- `process.env.PORT` di server.ts
- `$RefreshReg$/$RefreshSig$` shim di index.html
- CSP permisif di index.html
- npm sebagai package manager

## Secret yang Dibutuhkan
- `GEMINI_API_KEY` — minimal satu (pool 27 keys ada di `src/config/hardcodedKeys.ts` untuk fallback dev)
- `SESSION_SECRET` — sudah ada

## Social Worker
Fitur manajemen media sosial otomatis dengan dual-auth mode (Credential Key & Social Account OAuth).
### Environment Variables (Opsional untuk OAuth)
- `TWITTER_CLIENT_ID`, `TWITTER_CLIENT_SECRET`
- `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`
- `MASTODON_CLIENT_ID`, `MASTODON_CLIENT_SECRET`, `MASTODON_INSTANCE_URL`
- `SOCIAL_WORKER_BASE_URL` (Default: REPLIT_DEV_DOMAIN)
