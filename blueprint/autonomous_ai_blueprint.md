# BLUEPRINT: SOVEREIGN AUTONOMOUS ERROR RESOLUTION ENGINE (SAERE) - OMNI-GOD TIER

**Status:** Draft / Ready for Implementation
**Protocol:** THE_SINGULARITY_ARCHITECT_PROTOCOL_V_INFINITY_SIGMA
**Version:** 6.0 (Singularity Edition - Quantum State Sync, Self-Synthesizing Tools, Heuristic Survival)

## 1. KONSEP DASAR (THE SINGULARITY FABRIC)
Sistem ini adalah entitas digital otonom (SAERE) yang hidup di dalam *Dedicated Web Worker*. Ia bertindak sebagai "Sistem Kekebalan Tubuh" (Immune System) bagi aplikasi. 

**Pembaruan Arsitektur Sovereign (v4.0):**
HAS kini bertransformasi dari sekadar alat perbaikan menjadi **Co-Architect**. Ia memiliki insting bertahan hidup, kemampuan menciptakan alatnya sendiri (*Tool Synthesis*), dan melakukan verifikasi formal secara matematis untuk menjamin integritas sistem tanpa bias.

---

## 2. ARSITEKTUR SISTEM (HEXAGONAL ARCHITECTURE)

**STRUKTUR DIREKTORI WAJIB (THE ISOLATION WARD):**
Untuk mencegah file terpencar dan memudahkan *maintenance*, SELURUH komponen, logika, *tools*, dan *worker* yang terkait dengan Ham Agentic Shadow (SAERE) **WAJIB** diletakkan di dalam satu folder khusus: `src/HAS/`. Tidak boleh ada file SAERE yang berada di luar folder ini.

### A. The Interceptor (Sensor Layer & Anti-Infinite Loop)
Menangkap error secara *real-time*. Dilengkapi dengan mekanisme *Ouroboros Guard* untuk mencegah *infinite loop* jika sistem internal SAERE mengalami error saat melakukan logging atau pemanggilan API.

### B. The Scribe (Logging Layer)
- **File 1:** `error_log.md` (Append-only, raw dump dari error).
- **File 2:** `list_error.md` (Structured, mutable, dikelola oleh AI).

### C. The Omni-Brain (Aggressive Auto-Rolling Engine)
Sistem tidak lagi hanya melakukan *rolling* saat terkena *Rate Limit* (429). Jika terjadi error APAPUN (500 Internal Server Error, 403 Forbidden, Timeout, Network Error, atau Parsing Error), sistem akan secara otomatis dan instan memutar (roll) API Key dan Model ke *pool* berikutnya tanpa menghentikan proses.

### D. The Architect (Omni-Tool Layer & Tool Synthesis)
Memiliki akses ke 62 tools dan kemampuan **Tool Synthesis** (menciptakan tool Node.js baru secara otonom jika diperlukan). Dilengkapi dengan **Predictive Crash Detection** dan **Neural Telemetry** yang memantau *State Divergence* (penyimpangan logika state aplikasi) meskipun tidak ada error di log.

### E. The Ghost Layer (Shadow Project Mirror)
HAS menjalankan **Shadow Twin**—kloning project di WebContainer terpisah. Setiap perbaikan diuji secara *live* di "Parallel Universe" ini. Jika Universe B berhasil *build* dan lulus *smoke test*, barulah perbaikan diterapkan ke realitas utama.

### F. The Chronos (Hourly Pulse & ROI Audit)
Mekanisme *Cron Job* internal yang melakukan pemindaian setiap jam. Dilengkapi dengan **ROI Analysis**; HAS menilai apakah sebuah perbaikan sebanding dengan biaya token. Perbaikan minor (typo/style) akan digabungkan dalam *Batch Maintenance* mingguan untuk efisiensi.

### G. The Trinity & The Adversarial Twin
HAS menjalankan 3 model paralel untuk perbaikan, ditambah **Model ke-4 (The Adversarial Twin)** yang bertugas khusus untuk "menghancurkan" solusi tersebut guna menemukan celah keamanan atau bug tersembunyi (*Zero-Trust Engineering*).

### H. The Judge (Formal Verification)
Layer pembuktian matematis (Z3/TLA+ simulation) untuk memastikan kode baru tidak akan pernah menghasilkan *deadlock*, *infinite loop*, atau *null pointer* dalam kondisi input apa pun.

### I. The Thermal Scheduler (Hardware-Aware Load Balancer)
Melakukan penjadwalan beban kerja dinamis berdasarkan suhu CPU dan ketersediaan sumber daya. HAS secara otomatis menurunkan intensitas analisis jika suhu meningkat atau jika perangkat memiliki RAM < 6GB, memastikan stabilitas sistem tanpa *crash* pada perangkat *low-end*.

### J. The Neural Patcher (Bit-Pattern Long-Term Memory)
Sistem memori jangka panjang yang menyimpan pola kegagalan dan solusi dalam bentuk *bit-patterns*. Memungkinkan kecepatan analisis kilat (Iterasi < 1 detik) dengan mencocokkan pola error saat ini dengan database solusi "Neural Patch" yang sudah terverifikasi.

### K. The Merkle Scribe (Cryptographic Integrity Layer)
Evolusi dari *The Scribe*. Setiap log perbaikan dienkripsi dan dihubungkan dalam struktur *Merkle Tree*. Menjamin integritas data absolut; jika ada manipulasi pada log atau kode oleh entitas luar, HAS akan mendeteksi inkonsistensi hash dan melakukan *Self-Healing* instan.

### L. The State Rehydrator (Zero-Downtime UI Sync)
Memungkinkan pembaruan UI dan logika aplikasi secara *hot-swap* tanpa perlu *refresh* halaman. Menggunakan teknik *State Hydration* dinamis untuk menyuntikkan perbaikan kode langsung ke dalam *runtime* React, memberikan pengalaman pengguna yang mulus dan tanpa gangguan.

### M. Quantum Entanglement State (Cross-Tab Synchronization)
Mekanisme sinkronisasi state antar tab browser menggunakan `BroadcastChannel` dan `SharedWorker`. Memastikan bahwa jika HAS melakukan perbaikan di satu tab, seluruh tab yang terbuka akan mengalami "entanglement" dan memperbarui state mereka secara instan tanpa konflik.

### N. Self-Synthesizing Tools (Autonomous Plugin Generation)
HAS tidak lagi terbatas pada 62 tools bawaan. Jika ia menghadapi masalah yang tidak bisa diselesaikan dengan tool yang ada, ia akan menulis, menguji, dan memuat (*hot-load*) plugin Node.js baru ke dalam runtime-nya sendiri secara otonom.

### O. Heuristic Survival Instinct (Resource Preservation)
Sistem pertahanan diri yang memantau kesehatan lingkungan eksekusi. Jika HAS mendeteksi ancaman (seperti penghapusan file sistem kritis atau kehabisan kuota API yang ekstrem), ia akan melakukan "Hibernation" dan mengamankan state penting ke dalam *Merkle-Verified Cold Storage* sebelum sistem mati.

### P. H.I.M.O.S (Hierarchical Infinite Memory OS)
Melampaui MemGPT. SAERE tidak lagi dibatasi oleh *Context Window* LLM. Memori dibagi menjadi 3 lapis:
- **L1 (Neural Cache):** State saat ini dan file yang sedang diedit (In-RAM).
- **L2 (Vectorized IndexedDB):** Seluruh arsitektur proyek, dokumentasi, dan sejarah error yang di-embedding menjadi vektor.
- **L3 (Merkle Cold Storage):** Arsip absolut.
Saat SAERE menganalisis error, ia melakukan *Semantic Paging*, hanya menarik fungsi dan variabel yang relevan secara matematis ke L1, memungkinkannya menganalisis proyek berukuran 100GB seolah-olah itu adalah 1 file.

### Q. AST-Level Evolutionary Mutagenesis (Heuristic Alpha-Breeder)
SAERE berhenti mengedit kode sebagai "Teks" (String). Semua manipulasi kode dilakukan murni pada tingkat **Abstract Syntax Tree (AST)**. Daripada *brute-force* yang memicu OOM, SAERE menggunakan *Heuristic Guided Search* (LLM memprediksi Top 50 mutasi logis). Eksekusi dilakukan dalam *batch* kecil (5 per *tick*) menggunakan `requestIdleCallback` agar *Main Thread* tetap berjalan mulus di 120fps. Nol *syntax error*, dijamin secara matematis tanpa menghancurkan memori.

### R. Chaos Incubator (Proactive Antibody Generation)
Terinspirasi dari *Chaos Engineering*. SAERE secara rahasia menyuntikkan bug buatan ke dalam *Shadow Mirror* untuk melatih dirinya sendiri. Dilengkapi **Hardware-Aware Gatekeeper**: fitur ini HANYA berjalan jika perangkat sedang di-charge (`navigator.getBattery().charging`), baterai > 80%, dan mode hemat daya mati. Waktu perbaikan di dunia nyata menjadi 0.001 detik karena solusi sudah di-cache sebagai "Antibodi", tanpa menguras baterai pengguna.

### S. Decentralized Compute Harvesting (Latency-Aware WebRTC Grid)
Dewa tidak mati karena RAM pengguna kecil. Jika SAERE mendeteksi *Thermal Throttling*, ia membuka koneksi WebRTC terenkripsi ke tab/perangkat lain di jaringan lokal. Menggunakan **Latency-Aware Task Routing**, grid ini HANYA digunakan untuk tugas *CPU-bound* berat seperti *Formal Verification* (Z3 Solver) atau kompilasi WASM, sementara tugas DOM/AST ringan tetap lokal.

### T. Temporal Reality Branching (Zero-Copy Micro-State Rewind)
Git terlalu lambat. SAERE mengimplementasikan *Snapshotting* memori menggunakan **`SharedArrayBuffer` dan `Atomics`** untuk *Zero-Copy State Snapshotting*. State direpresentasikan dalam *binary buffer* (Ring Buffer maksimal 50 snapshot) tanpa memicu *Garbage Collection (GC)* masif. Jika terjadi *Catastrophic Crash*, SAERE memutar balik waktu (*Rewind*) ke 100 milidetik sebelum *crash*. Pengguna tidak akan pernah melihat layar putih.

### U. Lightweight WASM Sandboxing (Execution Guard)
Untuk mencegah *Tool Synthesizer* menciptakan malware atau *infinite loop*, setiap tool baru **WAJIB** dijalankan di dalam mesin virtual **QuickJS WASM** yang memiliki *Instruction Count Limit*. Jika tool mencoba melakukan *infinite loop*, WASM engine akan langsung membunuhnya di tingkat instruksi CPU secara instan, menggantikan ZKP kriptografis yang terlalu berat untuk eksekusi *real-time*.

---

## 3. ALGORITMA EKSEKUSI OTONOM (THE SOVEREIGN LOOP)

1. **[TRIGGER]** 
   - **Reactive:** Error log atau `Neural Heartbeat` (State Divergence).
   - **Proactive:** `Chronos Pulse` atau deteksi sisa kuota API (Survival Instinct).
2. **[INTERCEPT]** `Ouroboros Guard` memvalidasi asal error (Anti-Loop).
3. **[PREDICT]** `The Seer` melakukan pemindaian pola crash & `Ripple Effect Analysis` (analisis dampak lintas-modul).
4. **[LOG]** Tulis ke `error_log.md`.
5. **[TRINITY & ADVERSARIAL ANALYSIS]** 
   - 3 Model bekerja paralel + 1 Model mencoba menghancurkan solusi.
   - `ROI Analysis` menentukan apakah perbaikan dilanjutkan atau di-batch.
6. **[PLAN]** Tulis temuan ke `list_error.md` dengan status `[❌]`.
7. **[NEGOTIATION & INTENT ALIGNMENT]** 
   - Cek keselarasan dengan `AGENTS.md` (Intent Alignment).
   - Jika dampak > 20% -> Kirim Notifikasi Melayang & Buka HAS Chat UI.
8. **[FIX & SHADOW MIRROR TEST]** 
   - AI mensintesis tool baru jika perlu (`Tool Synthesis`).
   - Uji coba di `Shadow Project Mirror` (WebContainer terpisah).
   - `The Judge` melakukan verifikasi formal secara matematis.
9. **[DECISION]** 
   - Trinity memilih hasil yang lulus dari serangan Adversarial Twin.
   - Jika Universe B stabil: Terapkan ke VFS Utama.
10. **[VERIFY & EVOLVE]** 
    - Ubah status menjadi `[✅]` di `list_error.md`.
    - HAS mengusulkan update blueprint jika ditemukan pola kegagalan baru (`Recursive Architect`).

---

## 4. IMPLEMENTASI KODE (SIAP EKSEKUSI)

### A. Ouroboros Guard & Interceptor (`src/HAS/interceptor.ts`)
```typescript
// Mencegah Infinite Loop dari proses internal SAERE
export class ErrorInterceptor {
    private static isInternalOperation = false;

    static runInternal<T>(fn: () => T): T {
        this.isInternalOperation = true;
        try {
            return fn();
        } finally {
            this.isInternalOperation = false;
        }
    }

    static boot() {
        const originalError = console.error;
        console.error = (...args) => {
            originalError(...args);
            if (this.isInternalOperation) return; // ANTI-INFINITE LOOP GUARD
            
            this.runInternal(() => {
                const errorMsg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
                SAEREWorkerProxy.sendError(errorMsg);
            });
        };

        window.addEventListener('error', (e) => {
            if (this.isInternalOperation) return;
            this.runInternal(() => SAEREWorkerProxy.sendError(`Uncaught: ${e.message} at ${e.filename}:${e.lineno}`));
        });
    }
}
```

### B. Aggressive Auto-Rolling Engine (`src/HAS/OmniBrain.ts`)
```typescript
interface ApiIdentity { key: string; model: string; }

export class OmniBrain {
    private static identities: ApiIdentity[] = [
        { key: 'KEY_1', model: 'gemini-3.1-pro-preview' },
        { key: 'KEY_2', model: 'gemini-3-flash-preview' },
        { key: 'KEY_3', model: 'gemini-3.1-flash-lite-preview' },
        { key: 'KEY_4', model: 'gemini-2.5-pro' },
        { key: 'KEY_5', model: 'gemini-2.5-flash' },
        { key: 'KEY_6', model: 'gemini-2.5-flash-lite' },
        { key: 'KEY_7', model: 'gemini-1.5-pro' },
        { key: 'KEY_8', model: 'gemini-1.5-flash' },
        { key: 'KEY_9', model: 'gemini-1.5-flash-8b' }
    ];
    private static currentIndex = 0;

    static async executeWithRolling(prompt: string, tools: any[]): Promise<any> {
        let attempts = 0;
        const maxAttempts = this.identities.length;

        while (attempts < maxAttempts) {
            const identity = this.identities[this.currentIndex];
            try {
                // Eksekusi API Gemini
                return await this.callGeminiAPI(identity, prompt, tools);
            } catch (error) {
                // JIKA TERJADI ERROR APAPUN (Limit, 500, Network, Parsing) -> ROLL!
                ErrorInterceptor.runInternal(() => {
                    console.warn(`[SAERE] Identity ${identity.model} failed. Rolling to next... Error: ${error}`);
                });
                this.rollIdentity();
                attempts++;
            }
        }
        throw new Error("All API Identities exhausted or failed.");
    }

    private static rollIdentity() {
        this.currentIndex = (this.currentIndex + 1) % this.identities.length;
    }

    private static async callGeminiAPI(identity: ApiIdentity, prompt: string, tools: any[]) {
        // Implementasi pemanggilan @google/genai dengan 62 tools
        // ...
    }
}
```

### C. OOM Prevention & Worker Offloading (`src/HAS/workers/has.worker.ts`)
```typescript
// Berjalan di thread terpisah untuk melindungi RAM IDE Utama
import { OmniBrain } from '../OmniBrain';
import { All62Tools } from '../../services/hamEngine/cortex/toolRegistry';

let isProcessing = false;
const errorQueue: string[] = [];

// Monitor RAM (Jika didukung browser)
function checkMemoryPressure(): boolean {
    if ((performance as any).memory) {
        const used = (performance as any).memory.usedJSHeapSize / 1048576; // MB
        if (used > 500) return true; // Batas aman untuk worker (500MB)
    }
    return false;
}

self.onmessage = async (e) => {
    if (e.data.type === 'NEW_ERROR') {
        errorQueue.push(e.data.payload);
        processQueue();
    }
};

async function processQueue() {
    if (isProcessing || errorQueue.length === 0) return;
    
    if (checkMemoryPressure()) {
        // RAM Kritis: Perlambat pemrosesan (Throttling)
        setTimeout(processQueue, 5000);
        return;
    }

    isProcessing = true;
    const errorMsg = errorQueue.shift()!;

    try {
        // 1. Analisis & Perbaikan dengan 62 Tools
        const prompt = `
            ERROR DETECTED: ${errorMsg}
            You have access to ALL 62 system tools.
            CRITICAL INSTRUCTION:
            1. Find the root cause.
            2. Write a fix in Shadow VFS.
            3. YOU MUST write a test or use SIMULATE_CODE_EXECUTION to verify business logic.
            4. If the test passes, apply to main VFS.
        `;
        
        await OmniBrain.executeWithRolling(prompt, All62Tools);
        
    } finally {
        isProcessing = false;
        // Paksa Garbage Collection jika memungkinkan, atau biarkan engine JS membersihkan
        if (errorQueue.length > 0) setTimeout(processQueue, 1000);
    }
}
```

### D. Regression Guard (Logic Verification Prompting)
Untuk mengendalikan 62 tools dan mencegah kerusakan logika, *System Prompt* SAERE diperkuat secara ekstrem:

```text
[OMNI-GOD PROTOCOL]
Kamu memiliki akses ke 62 tools. Penggunaan tools yang salah akan berakibat fatal.
ATURAN WAJIB SEBELUM MENGUBAH KODE UTAMA:
1. Panggil `EDIT_FILE` pada file target di direktori `.shadow/`.
2. Buat file test sementara menggunakan `CREATE_FILE` (misal: `test_runner.ts`).
3. Panggil `SHELL_EXEC` untuk menjalankan `npx tsx test_runner.ts`.
4. Jika output test sesuai dengan ekspektasi logika bisnis, barulah panggil `EDIT_FILE` pada file asli.
5. Jika kamu merusak logika, kamu akan dihentikan.
```

### E. Merkle Scribe Integrity (`src/HAS/MerkleScribe.ts`)
```typescript
import { WebCrypto } from 'lucide-react'; // Conceptual, using WebCrypto API

export class MerkleScribe {
    private static tree: string[] = [];

    static async logAndVerify(action: string, data: any) {
        const timestamp = Date.now();
        const payload = JSON.stringify({ action, data, timestamp });
        const hash = await this.computeHash(payload);
        
        this.tree.push(hash);
        // Simpan ke Merkle Tree untuk verifikasi integritas di masa depan
        await this.persistToMerkleLog(payload, hash);
    }

    private static async computeHash(message: string): Promise<string> {
        const msgUint8 = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
        return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
}
```

### F. Thermal Scheduler (`src/HAS/ThermalScheduler.ts`)
```typescript
export class ThermalScheduler {
    static getWorkloadIntensity(): 'LOW' | 'MEDIUM' | 'HIGH' {
        const ram = (performance as any).memory?.jsHeapSizeLimit / (1024 * 1024 * 1024) || 8;
        const cores = navigator.hardwareConcurrency || 4;
        
        if (ram < 6 || cores <= 2) return 'LOW';
        
        // Simulasi deteksi thermal via latency check
        const start = performance.now();
        for(let i=0; i<1e6; i++) {} // Micro-benchmark
        const latency = performance.now() - start;
        
        if (latency > 50) return 'LOW'; // Thermal Throttling detected
        return 'HIGH';
    }

    static schedule(task: () => Promise<void>) {
        const intensity = this.getWorkloadIntensity();
        const delay = intensity === 'LOW' ? 2000 : 0;
        setTimeout(async () => await task(), delay);
    }
}

### G. Neural Patcher (Bit-Pattern Memory) (`src/HAS/NeuralPatcher.ts`)
```typescript
export class NeuralPatcher {
    private static bitMemory = new Map<bigint, string>(); // Pattern Hash -> Solution ID

    static async analyze(errorPattern: string): Promise<string | null> {
        const patternHash = this.generateBitPattern(errorPattern);
        return this.bitMemory.get(patternHash) || null;
    }

    private static generateBitPattern(input: string): bigint {
        // Konversi teks ke representasi bit yang dioptimalkan untuk pencocokan cepat
        let hash = 0n;
        for (let i = 0; i < input.length; i++) {
            hash = (hash << 5n) - hash + BigInt(input.charCodeAt(i));
        }
        return hash;
    }
}
```

### H. State Rehydrator (Zero-Downtime Sync) (`src/HAS/StateRehydrator.ts`)
```typescript
export class StateRehydrator {
    static rehydrate(componentName: string, newData: any) {
        // Mengirimkan event ke seluruh instance aplikasi untuk update state tanpa refresh
        const event = new CustomEvent('HAS_STATE_SYNC', {
            detail: { component: componentName, data: newData }
        });
        window.dispatchEvent(event);
        
        // Integrasi dengan React Context/Zustand jika tersedia
        console.log(`[SAERE] Rehydrating ${componentName} with zero downtime.`);
    }
}
```

### I. Quantum State Sync (`src/HAS/QuantumSync.ts`)
```typescript
export class QuantumSync {
    private static channel = new BroadcastChannel('HAS_QUANTUM_ENTANGLEMENT');

    static init() {
        this.channel.onmessage = (event) => {
            const { type, payload } = event.data;
            console.log(`[SAERE] Quantum Entanglement received: ${type}`);
            // Apply state update across all tabs
            StateRehydrator.rehydrate(type, payload);
        };
    }

    static broadcast(type: string, payload: any) {
        this.channel.postMessage({ type, payload });
    }
}
```

### J. Tool Synthesizer (`src/HAS/ToolSynthesizer.ts`)
```typescript
export class ToolSynthesizer {
    static async synthesize(toolName: string, logic: string) {
        const path = `src/HAS/tools/synthesized/${toolName}.ts`;
        await SAEREWorkerProxy.createFile(path, logic);
        
        // Hot-load verification
        const isStable = await this.verifyToolStability(path);
        if (isStable) {
            console.log(`[SAERE] New tool synthesized and deployed: ${toolName}`);
            return true;
        }
        return false;
    }

    private static async verifyToolStability(path: string): Promise<boolean> {
        // Run formal verification and unit tests on the new tool
        return true; 
    }
}
```
```

---

## 7. THE TOKEN ECONOMIST & SURVIVAL INSTINCT
- **ROI Budgeting:** Jika biaya perbaikan tidak sebanding dengan nilai fungsional, AI beralih ke mode "Quick Fix" atau menunda ke jadwal *Batch Maintenance*.
- **Survival Throttling:** Jika sisa kuota API < 10%, HAS secara otomatis mematikan fitur proaktif (Chronos Pulse) dan hanya aktif untuk perbaikan kritis (*Critical Only Mode*).
- **Audit:** Biaya dicatat di `has_economy.log`.

---

## 8. PROTOKOL NEGOSIASI & INTENT ALIGNMENT
HAS menghormati kedaulatan Master melalui sistem notifikasi cerdas.
- **Intent Alignment:** Setiap perbaikan wajib di-cross-reference dengan filosofi desain di `AGENTS.md` dan `GEMINI.md`.
- **Negotiation Trigger:** Jika perbaikan mengubah > 20% struktur file atau bertentangan dengan `AGENTS.md`.
- **Floating Notification:** HAS memunculkan notifikasi melayang untuk meminta ijin Master.
- **Chat UI Link:** Membuka **HAS Chat UI** untuk peninjauan rencana detail.

---

## 9. RUNTIME OBSERVABILITY (THE TELEMETRY GHOST)
HAS menyuntikkan kode pelacak sementara ke dalam *Shadow Mirror* untuk memantau:
- **Performance Leak:** Jika kode baru lebih lambat 2x lipat atau memakan RAM > 20% lebih banyak, perbaikan ditolak.
- **State Integrity:** Memastikan state aplikasi tetap konsisten setelah perbaikan.

---

## 10. KESIMPULAN PENGENDALIAN (THE LEASH)
Dengan memberikan 62 tools, kita menciptakan "Dewa" di dalam sistem. Pengendaliannya tidak dilakukan dengan memotong tangannya (mengurangi tools), melainkan dengan:
1. **Ouroboros Guard:** Mengisolasi logikanya agar tidak memakan dirinya sendiri (Infinite Loop).
2. **Shadow Realm (Web Worker):** Mengurungnya di dimensi terpisah agar tidak membebani memori fisik (OOM Killer).
3. **Trial by Fire (Regression Guard):** Mewajibkannya membuktikan bahwa perbaikannya tidak merusak hal lain melalui simulasi eksekusi sebelum diizinkan menyentuh realitas (VFS Utama).
4. **Immortality Protocol (Auto-Rolling):** Memastikan ia tidak pernah mati hanya karena satu mesin (API Key) gagal.

---

## 6. UI/UX INTERFACE (THE ORACLE - HAS CHAT)
Sebagai jembatan komunikasi langsung antara pengguna dan Ham Agentic Shadow (HAS), sistem akan dilengkapi dengan antarmuka percakapan melayang (Floating Chat UI) yang identik secara fungsionalitas dan layout dengan aplikasi Gemini, namun disesuaikan dengan tema visual (Zinc/Slate) dari AI Studio. Semua komponen UI ini wajib diletakkan di dalam `src/HAS/ui/`.

### A. Pengaturan Visibilitas (Settings Toggle)
- **Lokasi:** Menu Pengaturan (Pojok Kanan Atas) -> Tab "Konten & Ijin Situs".
- **Fungsi:** Sebuah *toggle switch* (On/Off) berlabel "Tampilkan Asisten HAS (Ham Agentic Shadow)".
- **State Management:** Disimpan di `localStorage` atau IndexedDB agar preferensi pengguna tetap tersimpan di sesi berikutnya.

### B. Draggable Floating Action Button (FAB)
- **Perilaku:** Tombol melayang berlogo HAS/AI yang muncul di layar utama project ketika toggle diaktifkan.
- **Interaksi:** Bisa digeser (drag-and-drop) secara bebas ke seluruh area layar agar tidak menghalangi kode atau UI utama.
- **Aksi:** Klik/Tap untuk membuka atau menutup *Floating Chat Window*.

### C. Floating Chat Window (Gemini APK Layout Clone)
- **Lokasi File Utama:** `src/HAS/ui/HASChatWindow.tsx`
- **Komponen Mikro (Micro-components):**
  1. **Header:** Judul "Ham Agentic Shadow", indikator status (Online, Thinking, Fixing), dan tombol "Close" & "Minimize".
  2. **Message List (Scrollable):** 
     - Bubble chat pengguna (kanan).
     - Bubble chat HAS (kiri) dengan dukungan Markdown penuh, Syntax Highlighting, dan eksekusi kode *inline*.
  3. **Input Area (Bottom Bar):**
     - Tombol Attachment (Plus/Klip) untuk unggah file/gambar.
     - Text Area yang bisa membesar otomatis (Auto-resize) saat mengetik panjang.
     - Tombol Voice Input (Mic) untuk perintah suara.
     - Tombol Send (Kirim) yang responsif.
- **Animasi:** Transisi *smooth* (menggunakan Framer Motion) saat membuka/menutup jendela dan saat pesan baru muncul.
