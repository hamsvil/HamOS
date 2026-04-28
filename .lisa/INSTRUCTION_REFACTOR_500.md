# TASK: REFACTORING & CODE SPLITTING (> 500 BARIS)

## TUJUAN
Lakukan *sweeping* (pengecekan keseluruhan) terhadap semua file TypeScript/React di codebase. Jika ditemukan file yang ukurannya melebihi **500 baris kode**, lakukan proses *refactoring* atau pemecahan file (code splitting) untuk mempertahankan rasio keterbacaan, skalabilitas kode, dan mematuhi aturan SOP terbaru.

## BATASAN & ATURAN
1. **server.ts:** Cek file server.ts. Saat ini terpantau sekitar 365 baris (sudah memenuhi batas 500). Jika perlu dipecah ke src/server/routes/ untuk kebaikan maintenance, silahkan buat plannya.
2. Kecualikan file *generated* (misal di src/Keygen/lib/api-client-react/src/generated/) dan komponen pihak ketiga bawaan KECUALI yang dibuat secara custom.
3. Gunakan prinsip modularitas (banyak utiliti atau hook terpisah yang diekstrak tanpa merusak flow logik utama).
4. **Invariant Hybrid:** JANGAN merusak titik kritis (CORS, COOP/COEP, allowHosts, endpoints health, setup websocket) seperti yang tertera di AGENTS.md.

## DELIVERABLE
Buat file *Plan* di .lisa/PLAN_REFACTOR.md yang berisi daftar file yang akan dipecah, komponen apa yang akan diekstrak, ke dalam direktori/file mana, serta estimasi rute dependensinya.
