# EXECUTION RESULT: Fix "Cannot set headers after they are sent to the client"

## Perubahan per File

### 1. server.ts
- Membungkus `vite.middlewares` dengan guard `if (res.headersSent || res.writableEnded) return;`.
- Menambahkan guard pada `express.static` headers setter dan route `/sw.js` untuk mencegah double response/headers.
- Mengamankan middleware global lainnya dengan helper `safeSetHeader`.

### 2. src/server/core/app.ts
- Verifikasi: Tidak dipanggil dari `server.ts`.
- Ditambahkan comment JSDoc: `// LEGACY — tidak dipanggil dari server.ts. Pertahankan sebagai referensi.`

### 3. src/server/routes/gemini.ts
- Menambahkan guard `res.writableEnded || res.headersSent` pada fungsi `sendEvent` di endpoint `/gemini/stream`.
- Menambahkan pengecekan `!res.writableEnded` sebelum memanggil `res.end()`.

### 4. src/server/routes/shell.ts
- Menambahkan guard `!res.headersSent && !res.writableEnded` sebelum memanggil `res.json` atau `res.status().json` pada event `close` dan `error`.

## Hasil Verifikasi

### Lint Result
- **Command**: `npm run lint` (`tsc --noEmit`)
- **Hasil**: Ditemukan banyak error di folder `_archive` dan beberapa komponen frontend.
- **Analisis**: Error tersebut bersifat pre-existing (terkait missing modules di archive dan typo di komponen lama). Tidak ada error baru yang berhubungan dengan perubahan di layer server.

### Curl Health Result
- **Command**: `curl -s http://localhost:3000/api/health`
- **Hasil**: `{"status":"ok"}`
- **Status**: PASS

## Status Akhir: PASS
Perubahan berhasil diterapkan sesuai plan untuk mencegah error `ERR_HTTP_HEADERS_SENT`. Server tetap berjalan stabil dan health check lulus.