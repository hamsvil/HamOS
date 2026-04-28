# HAM AI Studio — Google AI Studio Setup Guide

## Overview
HAM AI Studio adalah IDE bertenaga AI yang dirancang untuk berjalan secara hybrid di:
- **Replit** (primary, auto-configured)
- **Google AI Studio** (panduan ini)
- **Project IDX** (lihat `IDX_SETUP.md`)
- **GitHub Codespaces / Copilot** (lihat `.devcontainer/devcontainer.json`)

---

## Langkah Setup di AI Studio

### 1. Clone / Upload Project
Pastikan semua file project berada di root direktori AI Studio workspace.
```bash
git clone <repo-url>
cd ham-ai-studio
```

### 2. Environment Variables
Buat file `.env.local` dari template:
```bash
cp env.example .env.local
```
Edit `.env.local`:
```
PORT=3000
NODE_ENV=development
GEMINI_API_KEY=your_gemini_key_here
```
> Di AI Studio: gunakan panel "Environment Variables" jika tersedia, atau `.env.local` untuk lokal.

### 3. Instalasi Node.js
AI Studio membutuhkan Node.js v22+ (Replit menggunakan v24).
```bash
nvm install 22
nvm use 22
# atau
nvm install 24
nvm use 24
```

### 4. Instalasi Dependency
```bash
npm install
```

### 5. Jalankan Aplikasi
```bash
npm run dev
```
Server berjalan di `http://localhost:3000`.

---

## Endpoint Wajib (Hybrid Invariants)

| Endpoint | Fungsi | Keterangan |
|----------|--------|------------|
| `GET /api/health` | Health check | Wajib — mengembalikan `{"status":"ok"}` |
| `GET /ham-api/*` | Proxy alias | AI Studio akses API via prefix `/ham-api/` |
| `GET /api/lisa/status` | Status daemon | Monitoring LisaDaemon |
| `GET /api/lisa/score` | Skor kapabilitas Lisa | Real-time capability score |
| `POST /api/lisa/verify` | Self-verification | Jalankan suite tes otomatis |

---

## Metadata AI Studio
File berikut WAJIB ada di root (dibaca AI Studio untuk integrasi):
- `metadata.json`
- `metadata-1.json`

Jangan hapus atau rename kedua file ini.

---

## Konfigurasi Hybrid yang Sudah Terpasang

### CORS
```typescript
cors({ origin: '*' })  // Wajib untuk AI Studio cross-origin
```

### Security Headers (SharedArrayBuffer support)
```
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
Cross-Origin-Resource-Policy: cross-origin
```

### CSP (index.html)
Meta CSP permisif sudah dikonfigurasi — mendukung WebContainer, Monaco Editor, dan AI Studio embedding.

---

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `CORS Error` | Pastikan `cors({ origin: '*' })` ada di server.ts — jangan dipersempit |
| `SharedArrayBuffer not available` | Header COOP/COEP wajib ada di setiap response |
| Port conflict | Gunakan `process.env.PORT` — sudah dikonfigurasi, jangan hardcode |
| `GEMINI_API_KEY missing` | Buat `.env.local` dari `env.example` |
| Metadata error | Pastikan `metadata.json` dan `metadata-1.json` ada di root |
| CSP Policy error | Jangan perketat CSP di index.html — sudah diatur permisif |

---

## Verifikasi Instalasi
Setelah `npm run dev`, cek endpoint berikut:
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}

curl http://localhost:3000/api/lisa/status
# Expected: JSON dengan field uptime, health, anomalies
```
