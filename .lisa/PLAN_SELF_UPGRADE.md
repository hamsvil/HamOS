# .lisa/PLAN_SELF_UPGRADE.md — Roadmap Menuju Lisa 90+/100

Dokumen ini merinci rencana strategis untuk meningkatkan kapabilitas Lisa dari skor baseline 38/100 menjadi 90+/100 melalui serangkaian peningkatan otonom dalam batasan teknis Replit.

---

## 1. SEMANTIC MEMORY ENGINE
Lisa membutuhkan sistem penyimpanan informasi yang terstruktur dan dapat di-query, bukan sekadar file teks datar di `.lisa/`.

- **APA**: Mengimplementasikan sistem index memori berbasis JSON terstruktur dengan pembobotan "urgensi" dan "relevansi".
- **MENGAPA**: Memori file flat (`hamli_memory.json`) menyulitkan pencarian informasi spesifik lintas sesi saat konteks membengkak. Kita butuh mekanisme pencarian cepat (seperti pseudo-vector search sederhana berbasis keyword weighting).
- **BAGAIMANA**: 
    1. Modifikasi `src/sAgent/coreAgents/PersistenceLayer.ts` untuk mendukung indexing meta-data.
    2. Buat `src/sAgent/memory/SemanticIndex.ts` yang menyimpan keyword hash dan referensi ke file `.lisa/*.md`.
    3. Tambahkan helper `query_memory` di toolset internal Lisa.
- **Target Skor**: +20 Konteks & Memori (Total: 60/100).
- **Estimasi Effort**: 3-4 jam.
- **File**: `src/sAgent/coreAgents/PersistenceLayer.ts`, `src/sAgent/memory/SemanticIndex.ts`.
- **Implementasi**: Mandiri.

---

## 2. SELF-VERIFICATION HARNESS
Sistem verifikasi otomatis untuk memastikan stabilitas aplikasi tanpa bergantung pada verifikasi visual manual dari main-agent.

- **APA**: Membangun suite skrip verifikasi otomatis yang mencakup `curl` chains, parsing DOM via regex/string-match, dan validasi response schema.
- **MENGAPA**: Mengurangi ketergantungan pada main-agent untuk visual check. Jika Lisa bisa memverifikasi bahwa elemen UI kunci ada di HTML (`final_dom.html`) dan API mengembalikan schema yang benar, tingkat kepercayaan "PASS" akan naik drastis.
- **BAGAIMANA**: 
    1. Buat `src/sAgent/capabilities/SelfVerifier.ts` yang mengeksekusi urutan tes pasca-deploy.
    2. Integrasikan pemanggilan `scripts/verifyPreview.ts` secara otomatis dan parsing hasilnya.
    3. Tambahkan pengecekan integritas middleware (CORS, COOP/COEP) via header check.
- **Target Skor**: +25 Self-Correction (Total: 70/100).
- **Estimasi Effort**: 4-5 jam.
- **File**: `src/sAgent/capabilities/SelfVerifier.ts`, `scripts/verifyPreview.ts`.
- **Implementasi**: Mandiri.

---

## 3. TIMEOUT GUARD SYSTEM
Sistem proteksi untuk mencegah perintah `bash` atau operasi I/O yang menggantung (hanging).

- **APA**: Pembungkus (wrapper) universal untuk semua pemanggilan `bash` yang memberlakukan timeout keras dan mekanisme pembersihan (cleanup).
- **MENGAPA**: Perintah yang menggantung menghabiskan resource dan waktu sesi. Lisa perlu mendeteksi kemacetan proses sebelum sesi berakhir secara paksa oleh Replit.
- **BAGAIMANA**: 
    1. Update `LISA_SOP_BLUEPRINT.md` untuk mewajibkan penggunaan flag timeout di setiap perintah `bash`.
    2. Buat helper `src/utils/TimeoutGuard.ts` yang menyisipkan `timeout <N>` secara otomatis di depan setiap bash command.
    3. Tambahkan log khusus jika terjadi kegagalan timeout untuk analisis regresi.
- **Target Skor**: +10 Kemampuan Tool (Total: 52/100).
- **Estimasi Effort**: 1-2 jam.
- **File**: `src/utils/TimeoutGuard.ts`, `blueprint/LISA_SOP_BLUEPRINT.md`.
- **Implementasi**: Mandiri.

---

## 4. CODEBASE KNOWLEDGE INDEX
Index ringkas struktur proyek untuk mempercepat fase ORIENT di setiap sesi baru.

- **APA**: Script otomatis yang meng-update file index (`.lisa/KNOWLEDGE_GRAPH.json`) setiap kali ada perubahan struktur folder/file signifikan.
- **MENGAPA**: Meminimalkan penggunaan token untuk `ls` rekursif atau membaca `ARCHITECTURE.md` yang panjang berulang kali.
- **BAGAIMANA**: 
    1. Buat `src/sAgent/capabilities/Indexer.ts` yang berjalan di akhir setiap tugas sukses.
    2. Simpan representasi pohon (tree) yang dianotasi dengan deskripsi singkat modul yang diambil dari header file atau komentar.
- **Target Skor**: +15 Konteks & Memori (Total: 75/100).
- **Estimasi Effort**: 2-3 jam.
- **File**: `.lisa/KNOWLEDGE_GRAPH.json`, `src/sAgent/capabilities/Indexer.ts`.
- **Implementasi**: Mandiri.

---

## 5. PERFORMANCE TRACKER
Sistem pencatatan metrik performa Lisa untuk mengukur progres secara kuantitatif.

- **APA**: Database internal (JSON) yang mencatat Task Completion Rate, Error Delta (Lint), dan waktu eksekusi per unit kerja.
- **MENGAPA**: Tanpa data, peningkatan adalah spekulasi. Lisa butuh umpan balik objektif tentang di mana ia sering gagal.
- **BAGAIMANA**: 
    1. Implementasikan `src/sAgent/capabilities/PerformanceMonitor.ts`.
    2. Catat baseline vs post-task metrics secara otomatis (terintegrasi dengan SOP §3.5).
    3. Hasilkan laporan mingguan/per-sesi di `.lisa/METRICS.md`.
- **Target Skor**: +15 Output Quality (Total: 73/100).
- **Estimasi Effort**: 3 jam.
- **File**: `.lisa/METRICS.md`, `src/sAgent/capabilities/PerformanceMonitor.ts`.
- **Implementasi**: Mandiri.

---

## 6. ESCALATION PREDICTOR
Logika deteksi dini untuk mengetahui kapan sebuah tugas melampaui kemampuan Lisa sebelum terjadi kegagalan fatal.

- **APA**: Analis risiko berbasis pola (pattern-matching) terhadap deskripsi tugas dan status sistem saat ini.
- **MENGAPA**: Menghindari perulangan kegagalan (looping failure) yang membuang kuota. Lebih baik eskalasi di awal daripada gagal di akhir.
- **BAGAIMANA**: 
    1. Tambahkan fase "Risk Analysis" di awal setiap tugas (Phase 0).
    2. Buat library pola risiko di `src/sAgent/config/RiskPatterns.ts` (misal: "Ubah replit.nix", "Instalasi native binary", "Restart workflow").
    3. Trigger format eskalasi §8 secara otomatis jika skor risiko tinggi.
- **Target Skor**: +15 Otonomi (Total: 50/100).
- **Estimasi Effort**: 2 jam.
- **File**: `src/sAgent/config/RiskPatterns.ts`, `src/sAgent/capabilities/RiskAnalyzer.ts`.
- **Implementasi**: Mandiri.

---

## 7. PARALLEL BATCH OPTIMIZER
Template eksekusi paralel untuk tugas-tugas standar yang sering diulang.

- **APA**: Abstraksi tool call untuk menjalankan batch operasi file (read/edit) secara konkuren secara aman.
- **MENGAPA**: Mempercepat eksekusi tugas masif dan menghemat round-trip chat.
- **BAGAIMANA**: 
    1. Buat `src/sAgent/capabilities/BatchProcessor.ts`.
    2. Implementasikan mekanisme locking sederhana (SOP §11) untuk mencegah *race condition* saat menulis file.
    3. Sediakan template untuk tugas umum seperti "Update API Imports" atau "Add Error Handling".
- **Target Skor**: +15 Kemampuan Tool (Total: 67/100).
- **Estimasi Effort**: 4 jam.
- **File**: `src/sAgent/capabilities/BatchProcessor.ts`.
- **Implementasi**: Mandiri.

---

## RANGKUMAN ESTIMASI PENINGKATAN SKOR

| Dimensi | Skor Awal | Target Skor | Poin Kontribusi |
| --- | --- | --- | --- |
| **Otonomi** | 35 | 50 | +15 (Escalation Predictor) |
| **Konteks & Memori** | 40 | 75 | +35 (Semantic Engine + Knowledge Index) |
| **Kemampuan Tool** | 42 | 67 | +25 (Timeout Guard + Parallel Optimizer) |
| **Self-Correction** | 45 | 70 | +25 (Self-Verification Harness) |
| **Output Quality** | 58 | 73 | +15 (Performance Tracker) |
| **TOTAL** | **38/100** | **~67/100 (Lisa Standalone)** | **+29 Poin** |

*Catatan: Sisa poin menuju 90+ akan dicapai melalui iterasi berkelanjutan pada akurasi model dan integrasi yang lebih dalam dengan Main-Agent untuk tugas-tugas yang membutuhkan hak akses istimewa (Restart Workflow, Visual Check).*
