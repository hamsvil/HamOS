# HAM AI Studio — Project IDX Setup Guide

## Overview
HAM AI Studio berjalan secara native di Project IDX via konfigurasi Nix di `.idx/dev.nix`.
Node.js 22 (LTS) digunakan di IDX; kompatibel penuh dengan codebase ini.

## Langkah Setup

### 1. Buka di IDX
- Buka https://idx.google.com
- Klik "Import" → masukkan URL repo GitHub proyek ini
- IDX akan otomatis membaca `.idx/dev.nix` dan menyiapkan environment

### 2. Environment Variables
Setelah workspace terbuka, buat file `.env.local` di root:
```bash
cp env.example .env.local
```
Edit `.env.local` dan isi:
```
PORT=3000
GEMINI_API_KEY=your_key_here
NODE_ENV=development
```
> Catatan: IDX mengekspos PORT secara dinamis via `$PORT`. Konfigurasi `.idx/dev.nix` sudah menangani ini secara otomatis.

### 3. Instalasi Dependency
IDX otomatis menjalankan `npm install` saat workspace dibuat (via `onCreate` hook di dev.nix).
Jika perlu manual:
```bash
npm install
```

### 4. Jalankan Aplikasi
```bash
npm run dev
```
IDX otomatis membuka preview browser via konfigurasi `previews` di dev.nix.

## Invariant yang Harus Dijaga di IDX

Sama dengan platform lain — jangan ubah:
- `server.ts` (health endpoint, CORS, port config)
- `vite.config.ts` (allowedHosts, COOP/COEP headers)
- `index.html` (CSP permisif)

## Preview di IDX
IDX meneruskan port secara otomatis. Pastikan server menggunakan `process.env.PORT` (sudah dikonfigurasi).
URL preview akan tersedia di panel kanan IDX secara otomatis.

## Troubleshooting

| Masalah | Solusi |
|---------|--------|
| `EADDRINUSE` | Port sudah dipakai — IDX assign port baru via `$PORT`, pastikan server.ts membaca `process.env.PORT` |
| `SharedArrayBuffer not available` | Header COOP/COEP harus ada — sudah dikonfigurasi di server.ts dan vite.config.ts |
| Preview kosong | Tunggu 10-15 detik setelah `npm run dev` — Vite butuh waktu compile pertama kali |
| `GEMINI_API_KEY missing` | Buat `.env.local` dari `env.example` dan isi API key |
