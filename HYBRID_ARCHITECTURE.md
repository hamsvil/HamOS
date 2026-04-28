# 🚀 HAM AI Studio - HYBRID ARCHITECTURE

## Ringkasan Eksekutif

**HamOS adalah single-package, multi-platform application yang sama-sama berjalan di Replit, Google AI Studio, Project IDX, dan GitHub Codespaces** tanpa perlu fork/clone/setup ulang.

### Kunci Hybrid: 5 Pilar Universal

```
┌─────────────────────────────────────────────────────────────────┐
│  UNIVERSAL RUNTIME RULES (di semua 4 platform)                  │
├─────────────────────────────────────────────────────────────────┤
│ 1. Port Dinamis     → process.env.PORT || 3000                  │
│ 2. Health Endpoint  → GET /api/health → {"status":"ok"}         │
│ 3. CORS Permissive  → origin: '*' + COOP/COEP headers           │
│ 4. npm Only         → no pnpm, yarn, atau monorepo workspaces   │
│ 5. Rewrite API      → /ham-api/* → /api/*  (proxy compatibility)│
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Platform-Specific Configuration Matrix

Setiap platform memiliki file konfigurasi khusus yang mengatur:

### **1. REPLIT** ✅ PRIMARY

| Aspek           | File         | Fungsi                                       |
| --------------- | ------------ | -------------------------------------------- |
| **Startup**     | `.replit`    | Workflow `Start application` → `npm run dev` |
| **Environment** | `replit.nix` | Nix dependencies (Node.js, npm, tools)       |
| **Port**        | env `3000`   | Replit preview webview                       |
| **Output**      | `webview`    | Iframe embed di Replit dashboard             |

**How it works:**

```bash
# User klik "Run" di Replit
→ Replit loads .replit workflow
→ Jalankan: npm run dev
→ Server listen di PORT=3000
→ Replit iframe embed http://localhost:3000/
→ Next.js Vite HMR + Replit polyfill → preview muncul
```

**Invariant (jangan ubah):**

- `.replit` mengatur workflow
- `npm run dev` harus tetap di package.json
- Port keras kode di server.ts: `process.env.PORT || 3000`

---

### **2. GOOGLE AI STUDIO** ✅ ACTIVE

| Aspek            | File                               | Fungsi                           |
| ---------------- | ---------------------------------- | -------------------------------- |
| **Metadata**     | `metadata.json`, `metadata-1.json` | AI Studio app registry           |
| **Setup Guide**  | `AISTUDIO_SETUP.md`                | Panduan koneksi + env var        |
| **API Key**      | `.env.local` (local)               | `GEMINI_API_KEY` untuk local dev |
| **Health Check** | `GET /api/health`                  | AI Studio liveness probe         |

**How it works:**

```bash
# User buka link AI Studio
→ AI Studio baca metadata.json
→ Clone repo atau mirror dev server
→ Inject GEMINI_API_KEY via env var
→ Jalankan: npm run dev
→ Server health-check: GET /api/health
→ Frontend embed di AI Studio iframe
```

**Invariant (jangan ubah):**

- `metadata.json`, `metadata-1.json` — AI Studio reads ini
- `/api/health` endpoint — AI Studio depend pada ini untuk uptime monitoring
- `.env.local` — template `.env` local saja, jangan commit key

---

### **3. PROJECT IDX** ✅ ACTIVE

| Aspek           | File                  | Fungsi                      |
| --------------- | --------------------- | --------------------------- |
| **Environment** | `.idx/dev.nix`        | IDX Nix environment spec    |
| **Setup Guide** | `IDX_SETUP.md`        | Panduan IDX-specific config |
| **Port**        | `PORT=3000` (default) | IDX preview server          |
| **Dev Mode**    | `npm run dev`         | Cross-platform compatible   |

**How it works:**

```bash
# User buka di Project IDX
→ IDX load .idx/dev.nix
→ Setup Node.js + npm via Nix
→ postCreateCommand: npm install
→ postStartCommand: npm run dev
→ Server auto-forward port 3000
→ IDX embed preview
```

**Invariant (jangan ubah):**

- `.idx/dev.nix` configuration
- `npm install` + `npm run dev` harus tetap support

---

### **4. GITHUB CODESPACES / COPILOT (WORKSPACE LOKAL)** ✅ ACTIVE

| Aspek               | File                                                 | Fungsi                        |
| ------------------- | ---------------------------------------------------- | ----------------------------- |
| **Dev Container**   | `.devcontainer/devcontainer.json`                    | VS Code dev container spec    |
| **Node Image**      | `mcr.microsoft.com/devcontainers/javascript-node:24` | Pre-built container           |
| **Extensions**      | GitHub Copilot, ESLint, Prettier, etc                | Dev tools                     |
| **Port Forwarding** | `3000` (onAutoForward: openPreview)                  | Browser preview tab auto-open |
| **Commands**        | `postCreateCommand: npm install`                     | Auto-run on container create  |
| **Start Command**   | `postStartCommand: npm run dev`                      | Auto-start dev server         |

**How it works (SAAT INI - GitHub Copilot workspace lokal):**

```bash
# Dev container sudah siap
→ .devcontainer/devcontainer.json auto-load
→ npm install dependencies (sudah done)
→ npm run dev → server listen localhost:3000
→ Vite server + React HMR + Express API
→ Frontend HTML + CSP + RefreshReg$ shim ready
→ CORS headers auto-inject di semua response
→ Preview accessible via http://localhost:3000/
╭─────────────────────────────────────────────────────────╮
│ 🎯 WORKSPACE LOKAL INI SUDAH FULLY HYBRID READY!        │
│ • Server: localhost:3000/api/health ✅ 200 OK           │
│ • Frontend: HTML + Vite + React ✅ Loaded               │
│ • Headers: CORS + COOP/COEP ✅ Verified                 │
│ • Environment: NODE_OPTIONS + PORT ✅ Set               │
╰─────────────────────────────────────────────────────────╯
```

**Invariant (jangan ubah - workspace lokal):**

- `.devcontainer/devcontainer.json` — VS Code loads ini first
- `forwardPorts: [3000]` — kunci untuk preview URL
- `NODE_OPTIONS`, `PORT` env var — keep dynamic
- `postCreateCommand` + `postStartCommand` — auto-bootstrap

---

## 🔐 Security Headers - Universal Lintas Platform

Setiap response dari server meng-include headers:

```http
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

**Mengapa perlu di semua platform?**

- **COOP**: Isolasi window.opener → prevent spectre attacks
- **COEP**: Require corp header on subresources → enable SharedArrayBuffer
- **CORP cross-origin**: Allow iframe embed dari origin berbeda

Ketiga header ini **WAJIB** ada di semua platform agar:

1. ✅ WebContainer (Replit) bisa meng-use SharedArrayBuffer
2. ✅ Monaco Editor (complex parsing) tidak error
3. ✅ sql.js (WASM) bisa run di sandbox
4. ✅ AI Studio + IDX iframe embed tidak crash

---

## 📝 Code Organization

```
HamOS/
├── .devcontainer/
│   └── devcontainer.json          ← GitHub Copilot / Codespaces
├── .idx/
│   └── dev.nix                    ← Project IDX
├── .replit                        ← Replit workflow
├── replit.nix                     ← Replit Nix spec
├── metadata.json                  ← Google AI Studio app registry
├── metadata-1.json                ← AI Studio app registry
│
├── server.ts                      ← Express + Health Check + Headers
│   ├── PORT = process.env.PORT || 3000
│   ├── GET /api/health → {"status":"ok"}
│   ├── Middleware rewrite /ham-api → /api
│   └── Headers: COOP/COEP/CORP + CORS *
│
├── vite.config.ts                ← Vite dev server
│   ├── base: '/'
│   ├── server.allowedHosts: 'all'  ← Replit iframe compatibility
│   ├── server.headers: COOP/COEP
│   └── nodePolyfills: Buffer, process, util
│
├── index.html                     ← Frontend entry
│   ├── Meta CSP permissive (*+ unsafe-inline/eval)
│   ├── Shim window.$RefreshReg$ & $RefreshSig$
│   └── Vite client injection
│
├── src/main.tsx                   ← React entry point
├── package.json                   ← npm (NO pnpm)
│   └── "dev": "NODE_OPTIONS=--max-old-space-size=4096 npx tsx server.ts"
│
└── env.example                    ← Template (commit safe)
```

---

## 🎮 Runtime Flow

```
User Action        Platform              Config File           Runtime
─────────────────────────────────────────────────────────────────────────
1. Click "Run"  → Replit             → .replit             → npm run dev
2. Open link    → Google AI Studio   → metadata.json       → npm run dev
3. Fork repo    → Project IDX        → .idx/dev.nix        → npm run dev
4. Dev Container→ GitHub Copilot     → .devcontainer/...   → npm run dev
                     (workspace lokal saat ini)

         ↓ (semua path sama)

  npm run dev
  └─→ tsx server.ts (entry)
      ├─→ Express app + cors({origin: '*'})
      ├─→ Vite dev server (HMR)
      ├─→ Socket.IO terminal + Yjs sync
      ├─→ Health endpoint: GET /api/health
      ├─→ Middleware: /ham-api → /api rewrite
      └─→ server.listen(PORT, '0.0.0.0')
         ├─→ 3000 (Replit)
         ├─→ 3000 (AI Studio)
         ├─→ 3000 (IDX)
         └─→ localhost:3000 (Codespaces/Copilot)

  Frontend Layer:
  ├─→ Vite inject HMR client (/@vite/client)
  ├─→ React Fast Refresh shim ($RefreshReg$)
  ├─→ SharedArrayBuffer safe (COOP/COEP headers)
  ├─→ CSP: allow * + unsafe-inline/eval (AI Studio requirement)
  └─→ Browser render HTML + load src/main.tsx

  ✅ APP LIVE!
```

---

## 🔗 Why This Architecture is Portable

### The Invariant List (Never Touch)

```javascript
// server.ts
PORT = Number(process.env.PORT) || 3000; // ← Dynamic, not hardcoded
cors({ origin: "*" }); // ← Permissive for iframe embed

// Headers (WAJIB di semua response)
res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
res.setHeader("Cross-Origin-Resource-Policy", "cross-origin");
```

```html
<!-- index.html -->
<meta
  http-equiv="Content-Security-Policy"
  content="... * ... 'unsafe-inline' 'unsafe-eval'"
/>
<script>
  window.$RefreshReg$ = () => {};
  window.$RefreshSig$ = () => (type) => type;
</script>
```

```javascript
// vite.config.ts
server: {
  allowedHosts: 'all',            // ← Replit iframe allows
  headers: {
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Embedder-Policy': 'require-corp',
    'Cross-Origin-Resource-Policy': 'cross-origin'
  }
}
```

```json
// package.json
{
  "type": "module",
  "scripts": {
    "dev": "NODE_OPTIONS=--max-old-space-size=4096 npx tsx server.ts"
  }
}
```

**Selama 4 invariant ini tetap, aplikasi portable ke platform apapun yang:**

1. Bisa jalanin Node.js + npm
2. Support dynamic port via env var
3. Bisa forward HTTP port
4. Mampu embed iframe dengan CORS

---

## ✨ Current Status - GitHub Copilot Workspace

```
✅ FULLY OPERATIONAL

Server:
  - Listening: http://localhost:3000
  - Health: GET /api/health → {"status":"ok"} 200 OK
  - Headers: COOP/COEP/CORP verified ✓
  - CORS: origin * active ✓

Frontend:
  - Vite dev mode: Running ✓
  - React: Loaded ✓
  - HMR: Active ✓
  - CSP: Permissive ✓
  - Shims: $RefreshReg$ + $RefreshSig$ injected ✓

Platform Support:
  ✅ Replit (primary, .replit configured)
  ✅ Google AI Studio (metadata.json ready)
  ✅ Project IDX (.idx/dev.nix ready)
  ✅ GitHub Copilot / Codespaces (.devcontainer/ ready)

Dev Container (.devcontainer/devcontainer.json):
  - Image: mcr.microsoft.com/devcontainers/javascript-node:24
  - Extensions: Copilot, ESLint, Prettier, TypeScript, Tailwind
  - Port forwarding: 3000 → browser preview
  - Auto-start: npm run dev (active now)
```

---

## 🚀 Next Steps

1. **Frontend exploration**: Navigate to http://localhost:3000/ in browser
2. **API testing**: Curl `/api/*` endpoints to verify backend
3. **HMR testing**: Edit `src/main.tsx` → watch reload
4. **Mobile build**: `npm run android:build` → Capacitor APK
5. **Production**: `npm run build` → dist/ → Vite static export

---

**Generated**: 28 Apr 2026  
**Workspace**: GitHub Copilot (Dev Container)  
**Status**: ✅ HYBRID READY
