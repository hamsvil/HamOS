# PLAN: Fix "Cannot set headers after they are sent to the client"

## Root Cause Analysis
Error `ERR_HTTP_HEADERS_SENT` terjadi karena Express mencoba mengirim response atau mengatur header setelah response sudah dikirim atau koneksi diakhiri. 

Berdasarkan audit cepat:
1.  **Double Middleware Setup**: Ada duplikasi logika antara `server.ts` dan `src/server/core/app.ts`. `server.ts` mengimpor banyak route dan memasang Vite middleware, sementara `src/server/core/app.ts` (The Singularity App Engine) juga melakukan hal serupa. `server.ts` adalah entry point utama, tapi `app.ts` tampaknya merupakan "engine" yang seharusnya digunakan. Jika keduanya berjalan atau ada tumpang tindih dalam pemanggilan middleware, ini bisa menyebabkan konflik.
2.  **Inconsistent `safeSetHeader` Usage**: `server.ts` memiliki helper `safeSetHeader` dan `safeMiddleware` tapi banyak route dan middleware bawaan belum menggunakannya.
3.  **Vite Middleware Conflict**: Vite middleware di `server.ts` (baris 252) dipasang tanpa pengecekan `res.headersSent`. Jika ada route di atasnya yang mengirim response tapi lupa memanggil `next()` atau salah logika, Vite middleware mungkin mencoba memproses request tersebut.
4.  **Static Files & WASM**: Logika `app.use` untuk file `.wasm` di `server.ts` (baris 92) dan `app.ts` (baris 84) melakukan `res.sendFile` atau `res.status(404).send`. Jika middleware selanjutnya dipanggil, error header akan muncul.
5.  **Proxy Routes**: `setupProxyRoutes(app)` dipanggil di `server.ts`. Jika proxy ini menangkap request yang seharusnya ditangani Vite atau sebaliknya, bisa terjadi double response.

## Daftar File yang Akan Diubah
- `server.ts`: Konsolidasi middleware, penggunaan `safeSetHeader` secara konsisten, dan pengecekan state response sebelum memanggil Vite.
- `src/server/core/app.ts`: Sinkronisasi dengan `server.ts` atau penandaan sebagai "Legacy/Reference" jika tidak digunakan secara aktif sebagai engine utama di `server.ts`. (Berdasarkan `server.ts`, ia tidak memanggil `createApp` dari `app.ts`, namun file ini ada dan berisi logika serupa yang mungkin membingungkan).
- `src/server/routes/gemini.ts`: Menambahkan pengecekan `res.headersSent` di endpoint streaming.
- `src/server/routes/shell.ts`: Menambahkan pengecekan di event listener `close` dan `error`.
- `src/server/serverProxy.ts`: Cek implementasi proxy untuk memastikan tidak ada pengiriman response ganda.

## Langkah Perbaikan
1.  **Refactor `server.ts` (High Priority)**:
    - Bungkus semua penulisan header global dengan `safeSetHeader`.
    - Pastikan semua middleware (terutama CORS dan Static) memiliki pengecekan `res.headersSent`.
    - Gunakan `safeMiddleware` helper untuk pembungkus route jika memungkinkan.
2.  **Audit & Patch Routes**:
    - `gemini.ts`: Amankan endpoint `/gemini/stream` agar tidak `res.end()` jika headers sudah dikirim oleh error handler lain.
    - `shell.ts`: Pastikan `res.json` hanya dipanggil sekali di event `close`.
3.  **Vite Integration Guard**:
    - Tambahkan check `if (res.headersSent) return;` sebelum `vite.middlewares(req, res, next)`.
4.  **Cleanup Double Logic**:
    - Identifikasi apakah `src/server/core/app.ts` benar-benar digunakan. Jika tidak, tambahkan warning/comment. Jika iya (misal dipanggil di tempat lain), sinkronkan helper ke sana.

## Kriteria PASS
1.  `npm run lint` (tsc --noEmit) tidak ada error baru.
2.  `curl -s localhost:3000/api/health` mengembalikan 200 OK.
3.  Tidak ada error "Cannot set headers" di log server saat mengakses browser preview.
4.  WASM files (sql-wasm, tree-sitter) ter-load dengan benar (header COOP/COEP ada).
5.  SSE streaming di `/api/gemini/stream` berjalan tanpa putus/error header di tengah jalan.
