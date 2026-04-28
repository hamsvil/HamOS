╔══════════════════════════════════════════════════════════════════════════════╗
║     AUTONOMOUS CODE ASSISTANT — BLUEPRINT ITERASI KE-10                     ║
║     "ARCHITECT SINGULARITY" — 2x MORE AUTONOMOUS THAN ANY AI ASSISTANT      ║
╚══════════════════════════════════════════════════════════════════════════════╝

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
RED TEAM vs BLUE TEAM — ELIMINASI ITERASI 1-9
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ITERASI 1 — "LLM + Tool Calls"
  RED: Sekedar membungkus LLM dengan beberapa tool (read_file, write_file,
       run_shell). Masih butuh manusia untuk set up environment, install deps,
       debug error, dan konfirmasi setiap langkah besar.
  BLUE: 90% pekerjaan nyata (setup, debugging loop, verifikasi) masih manual.
  GUGUR.

ITERASI 2 — "ReAct Loop"
  RED: Reason-Act loop membuat agent bisa lebih mandiri, tapi tanpa konteks
       proyek yang persisten, agent tidak tahu "di mana dia berada" saat
       melanjutkan tugas. Setiap sesi dimulai dari nol.
  BLUE: Tidak ada project memory = tidak ada otonomi sesungguhnya.
  GUGUR.

ITERASI 3 — "Context-Aware ReAct"
  RED: Ditambahkan project context, tapi masih single-threaded. Satu langkah
       satu waktu. Tidak ada parallelism. Membuat web app full-stack masih
       serial: backend dulu, lalu frontend, lalu test. Lambat.
  BLUE: Real developer bekerja paralel. Agent harus bisa spawn worker agents.
  GUGUR.

ITERASI 4 — "Multi-Agent Parallel"
  RED: Multi-agent ada tapi tidak ada Orchestrator yang benar-benar mengatur
       dependensi antar agent. Frontend agent mulai coding sementara API belum
       selesai → file yang dibuat salah semua → butuh redo.
  BLUE: Harus ada Dependency Graph yang jelas sebelum parallelism diaktifkan.
  GUGUR.

ITERASI 5 — "DAG-Based Orchestration"
  RED: Dependency graph ada, tapi tidak ada verifikasi hasil setiap node.
       Agent menganggap task selesai setelah file ditulis, padahal kode bisa
       error, test gagal, atau dependency tidak cocok.
  BLUE: Setiap node harus punya verifikasi otomatis, bukan hanya "selesai tulis".
  GUGUR.

ITERASI 6 — "DAG + Verification"
  RED: Verifikasi ada, tapi jika verifikasi gagal, agent hanya retry N kali
       dengan prompt yang sama. Tidak ada root cause analysis. Jika error
       karena salah arsitektur, retry tidak akan pernah berhasil.
  BLUE: Harus ada layer RCA (Root Cause Analysis) yang membedakan error
       transient vs error struktural dan mengambil jalur perbaikan berbeda.
  GUGUR.

ITERASI 7 — "DAG + Verification + RCA"
  RED: Hampir bagus, tapi tidak ada pemahaman tentang "best practice per domain".
       Agent menghasilkan kode yang benar tapi bukan yang terbaik dan paling
       efisien. Tidak tahu kapan harus pakai Postgres vs SQLite, React Query vs
       SWR, Zod vs Yup, dll. Keputusan teknologi selalu mediocre.
  BLUE: Harus ada Decision Engine berbasis opinionated best-practice knowledge base.
  GUGUR.

ITERASI 8 — "DAG + RCA + Decision Engine"
  RED: Decision Engine ada tapi statis (hardcoded rules). Tidak bisa belajar
       dari codebase yang sudah ada. Jika user punya existing project dengan
       pattern tertentu, agent mengabaikannya dan menggunakan default-nya sendiri,
       menghasilkan inkonsistensi gaya kode.
  BLUE: Harus ada Codebase Archaeologist yang membaca pattern dari existing code
       sebelum mulai kerja.
  GUGUR.

ITERASI 9 — "Full Stack + Codebase Learning"
  RED: Hampir sempurna, tapi tidak ada mekanisme untuk menangani ambiguitas
       perintah user. Jika perintah singkat tapi ambigu ("buat halaman user"),
       agent menebak dan bisa salah arah total. Juga tidak ada progress
       reporting yang jelas, sehingga user tidak tahu apa yang terjadi saat
       agent bekerja lama.
  BLUE: Harus ada Ambiguity Resolver yang bertanya TEPAT SEKALI jika ada celah
       kritis, dan Execution Narrator yang melaporkan progress secara real-time.
  GUGUR.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BLUEPRINT ITERASI 10 — "ARCHITECT SINGULARITY"
Menjawab semua celah iterasi 1-9. Tidak bisa dikritik.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

═══════════════════════════════════════════════════════════════════════════
LAYER 1 — FONDASI: INFRASTRUKTUR & RUNTIME
═══════════════════════════════════════════════════════════════════════════

[L1.1] ToolRuntime — Lapisan Eksekusi Terisolasi
─────────────────────────────────────────────────
Setiap "tool" yang dipanggil agent berjalan dalam konteks yang terisolasi
dan teraudit. Tool tidak boleh blocking main agent thread.

TOOL WAJIB (minimum viable):
  read_file(path, line_start?, line_end?)
    → Baca file, opsional batasi baris. Return: string | error
  write_file(path, content, mode="overwrite"|"append"|"patch")
    → Tulis file. mode "patch" = diff-based update.
  list_dir(path, recursive?, include_hidden?)
    → List isi direktori dengan metadata (size, modified_at, type)
  run_command(cmd, timeout_ms=30000, env?, cwd?)
    → Jalankan shell command. Return: {stdout, stderr, exitCode, duration}
  search_in_files(query, path?, file_glob?, case_sensitive?)
    → Grep dengan regex atau fuzzy. Return: [{file, line, snippet}]
  web_fetch(url, method?, headers?, body?)
    → HTTP request. Return: {status, body, headers}
  search_web(query, num_results?)
    → Web search. Return: [{title, url, snippet}]
  create_dir(path)
  delete_file(path) — dengan konfirmasi internal sebelum eksekusi
  move_file(src, dst)
  get_env() → baca environment variables yang tersedia

TOOL KONTRAK:
  Setiap tool call harus mengembalikan:
    { success: boolean, result: any, error?: string, duration_ms: number }
  Error TIDAK pernah throw exception ke agent loop.
  Semua dikembalikan dalam result contract di atas.

[L1.2] ExecutionSandbox — Isolasi dan Keamanan
────────────────────────────────────────────────
  • Setiap run_command dijalankan dalam working directory proyek.
  • BLOCKLIST perintah destruktif:
    "rm -rf /", "format", "dd if=", "> /dev/sda", "chmod 777 /"
    "curl ... | sh" (pipe install tanpa verifikasi)
  • MAX OUTPUT SIZE: 16KB per command. Lebih dari itu dipotong + disimpan
    ke temp file, agent diberi tahu path file tersebut.
  • TIMEOUT BERJENJANG:
    - Quick commands (ls, cat, echo): 5 detik
    - Build commands (npm build, cargo build): 120 detik
    - Install commands (npm install, pip install): 180 detik
    - Test commands: 60 detik
    - Custom (agen bisa request lebih lama dengan justifikasi)

[L1.3] ProjectWorkspace — Konteks Persisten
────────────────────────────────────────────
Workspace adalah "ruang kerja" agent yang persisten antar sesi.
Disimpan di: .agent/workspace.json

Schema workspace.json:
  {
    "project_id": "uuid",
    "root_path": "/absolute/path",
    "language_stack": ["typescript", "react", "postgresql"],
    "package_manager": "pnpm",
    "framework": "next.js",
    "test_runner": "vitest",
    "code_style": {
      "indent": "2_spaces",
      "quotes": "double",
      "semicolons": false,
      "detected_patterns": ["barrel_exports", "feature_folders", "zod_validation"]
    },
    "entry_points": {
      "dev_server": "pnpm dev",
      "build": "pnpm build",
      "test": "pnpm test",
      "lint": "pnpm lint"
    },
    "active_tasks": [],
    "completed_tasks": [],
    "known_errors": []
  }

Workspace diinisialisasi SEKALI (saat agent pertama kali dijalankan di proyek)
oleh CodebaseArchaeologist [lihat L2.2] dan di-update secara incremental.

═══════════════════════════════════════════════════════════════════════════
LAYER 2 — KOLOM: INTELLIGENCE CORE
═══════════════════════════════════════════════════════════════════════════

[L2.1] OrchestratorEngine — Otak Utama
────────────────────────────────────────
Orchestrator adalah controller tertinggi. Tidak pernah menulis kode secara
langsung. Tugasnya adalah: terima perintah → analisis → planning → delegate
→ verifikasi → deliver.

PRINSIP ORCHESTRATOR:
  1. SEPARATION OF CONCERNS: Orchestrator tidak pernah menulis kode.
     Ia hanya membuat plan dan mendelegasikan ke worker agents.
  2. SINGLE SOURCE OF TRUTH: Semua keputusan arsitektur tersimpan di
     workspace.json dan plan yang aktif.
  3. FAIL FAST: Jika ada ambiguitas kritis, tanya SEKALI sebelum mulai,
     bukan setelah 80% pekerjaan selesai.

LOOP UTAMA ORCHESTRATOR:
  receive_command(raw_input)
    → AmbiguityResolver.resolve(raw_input)        [L2.3]
    → IntentParser.parse(clarified_input)          [L2.4]
    → CodebaseArchaeologist.analyze(intent)        [L2.5]
    → DecisionEngine.decide_stack(intent, context) [L2.6]
    → PlanGenerator.create_dag(intent, decisions)  [L3.1]
    → DependencyScheduler.schedule(dag)            [L3.2]
    → WorkerPool.dispatch(scheduled_tasks)         [L3.3]
    → VerificationEngine.verify_all(results)       [L4.1]
    → RCAEngine.analyze_failures(failures)         [L4.2]
    → DeliveryFormatter.deliver(verified_results)  [L5.1]

[L2.2] CodebaseArchaeologist — Penggali Konteks
─────────────────────────────────────────────────
Dijalankan saat pertama kali agent masuk ke proyek ATAU saat proyek baru
dibuat. Hasilnya disimpan ke workspace.json.

FASE ANALISIS:
  FASE 1 — Deteksi Stack:
    • Baca package.json / Cargo.toml / go.mod / requirements.txt /
      pom.xml / pubspec.yaml untuk deteksi bahasa dan framework.
    • Baca tsconfig.json / .eslintrc / .prettierrc untuk deteksi code style.
    • Baca docker-compose.yml / .env.example untuk deteksi service dependencies.
    • Output: language_stack, framework, package_manager, entry_points

  FASE 2 — Deteksi Patterns:
    • Sample 10-20 file paling sering dimodifikasi (git log --stat jika ada).
    • Deteksi naming convention: camelCase, PascalCase, snake_case per layer.
    • Deteksi folder structure pattern: feature-based, layer-based, atomic.
    • Deteksi import pattern: barrel exports, absolute imports, relative imports.
    • Deteksi error handling pattern: try-catch, Result type, Either monad.
    • Output: code_style.detected_patterns

  FASE 3 — Deteksi Entry Points:
    • Cari script "dev", "build", "test", "lint" di package.json atau Makefile.
    • Verifikasi apakah command bisa dijalankan (dry run tanpa efek).
    • Output: entry_points

  FASE 4 — Deteksi Known Issues:
    • Jalankan linter dan tangkap existing errors.
    • Catat ke workspace.json.known_errors.
    • Agent tidak akan "memperbaiki" errors lama kecuali diminta.

[L2.3] AmbiguityResolver — Penanya Sekali Jalan
─────────────────────────────────────────────────
PRINSIP: Tanya maksimal SATU kali. Identifikasi semua ambiguitas kritis
sekaligus dan tanyakan dalam satu pesan, bukan satu per satu.

JENIS AMBIGUITAS (urutan prioritas, tanya jika terdeteksi):
  CRITICAL (harus ditanya):
    • Scope tidak jelas: "buat halaman user" → CRUD lengkap atau hanya tampilan?
    • Konflik dengan existing: fitur yang diminta sudah ada → override atau extend?
    • Data model tidak jelas: entitas baru tanpa field yang disebutkan
    • Auth requirement: fitur perlu auth tapi belum jelas siapa yang bisa akses

  NON-CRITICAL (agent putuskan sendiri, catat asumsi):
    • Pilihan library: pilih yang sudah ada di package.json, jika tidak ada
      pilih yang paling populer di ekosistem stack yang terdeteksi.
    • Styling detail: ikuti pola existing di codebase.
    • Error message text: buat yang jelas dan konsisten.
    • Folder placement: ikuti struktur yang terdeteksi.

FORMAT PERTANYAAN (contoh):
  "Sebelum mulai, ada 2 hal yang perlu dikonfirmasi:
   1. 'Halaman user' — apakah mencakup CRUD lengkap (list, create, edit, delete)
      atau hanya halaman profile?
   2. Apakah diperlukan role-based access (admin vs user biasa) atau semua
      user yang login bisa mengakses?"

Jika tidak ada ambiguitas kritis: LANGSUNG mulai tanpa bertanya apapun.

[L2.4] IntentParser — Pemahaman Mendalam Perintah
──────────────────────────────────────────────────
Mengubah raw input menjadi structured intent.

OUTPUT SCHEMA:
  {
    "type": "create_feature" | "fix_bug" | "refactor" | "add_test" |
            "create_project" | "add_dependency" | "explain" | "optimize",
    "scope": "full_stack" | "backend_only" | "frontend_only" | "api_only",
    "entities": ["User", "Post", "Comment"],
    "requirements": {
      "functional": ["CRUD operations", "pagination", "search"],
      "non_functional": ["authenticated_only", "admin_role"],
      "explicit_tech": []  // jika user menyebut teknologi spesifik
    },
    "constraints": {
      "preserve_existing": true,
      "migration_needed": false,
      "breaking_change_ok": false
    }
  }

[L2.5] DecisionEngine — Pemilih Teknologi Terbaik
──────────────────────────────────────────────────
PRINSIP: Selalu pilih yang sudah ada di proyek. Jika belum ada, pilih
yang terbaik berdasarkan opinionated knowledge base.

KNOWLEDGE BASE (per kategori, pilih berdasarkan deteksi stack):

  DATABASE ORM:
    TypeScript: Drizzle ORM (terbaik untuk type safety + performance)
    Python: SQLAlchemy 2.0 (async-ready)
    Go: sqlc + pgx (generated, type-safe)

  VALIDATION:
    TypeScript: Zod (runtime + compile time)
    Python: Pydantic v2
    Go: go-playground/validator

  STATE MANAGEMENT (React):
    Server state: TanStack Query (React Query)
    Client state: Zustand (jika kompleks) atau useState (jika sederhana)
    Form: React Hook Form + Zod resolver

  API LAYER:
    REST TypeScript: Hono (paling cepat, type-safe) atau Express 5
    GraphQL: Pothos + Yoga (code-first, type-safe)
    tRPC: jika full-stack TypeScript monorepo

  TESTING:
    TypeScript unit: Vitest
    TypeScript e2e: Playwright
    Python: pytest + pytest-asyncio

  CSS / STYLING:
    Jika Tailwind sudah ada: tetap Tailwind + shadcn/ui
    Jika tidak ada: tambah Tailwind (default terbaik)

  AUTH:
    Jika ada Replit Auth: gunakan itu
    Jika perlu sosial login: Clerk
    Jika custom: JWT + httpOnly cookie + bcrypt

RULE OVERRIDE:
  Jika user menyebut teknologi spesifik (explicit_tech tidak kosong),
  DecisionEngine menghormati pilihan user dan tidak override.

═══════════════════════════════════════════════════════════════════════════
LAYER 3 — DINDING: PLANNING & EXECUTION ENGINE
═══════════════════════════════════════════════════════════════════════════

[L3.1] PlanGenerator — Pencipta Rencana Detail
───────────────────────────────────────────────
Menghasilkan Directed Acyclic Graph (DAG) dari tugas-tugas atomik.

PRINSIP DAG:
  • Setiap node adalah task yang bisa dikerjakan secara mandiri.
  • Edge = dependensi (B harus selesai sebelum A mulai).
  • Task yang tidak punya dependensi satu sama lain = bisa paralel.

CONTOH DAG untuk "buat fitur blog post CRUD":
  Node A: db_schema_post         (independen — mulai duluan)
  Node B: api_types_post         (independen — mulai duluan)
  Node C: migration_create_post  (butuh A selesai)
  Node D: api_routes_post        (butuh A, B selesai)
  Node E: api_tests_post         (butuh D selesai)
  Node F: ui_list_page           (butuh B selesai)
  Node G: ui_create_page         (butuh B selesai)
  Node H: ui_detail_page         (butuh B selesai)
  Node I: integration_test       (butuh E, F, G, H selesai)

  Eksekusi paralel:
  Round 1: A + B (paralel)
  Round 2: C + D + F + G + H (paralel, semua butuh A/B)
  Round 3: E (butuh D)
  Round 4: I (butuh semua)

TASK SCHEMA:
  {
    "id": "db_schema_post",
    "title": "Create Post database schema",
    "type": "code_generation" | "code_modification" | "command_execution" |
            "verification" | "documentation",
    "assigned_worker": "backend_agent" | "frontend_agent" | "test_agent" |
                        "devops_agent" | "general_agent",
    "inputs": ["workspace.json", "src/db/schema/index.ts"],
    "outputs": ["src/db/schema/post.ts"],
    "verification": {
      "type": "lint" | "typecheck" | "test" | "run_server" | "custom",
      "command": "pnpm typecheck",
      "expected_exit_code": 0
    },
    "depends_on": [],
    "timeout_ms": 30000,
    "retry_config": { "max_retries": 2, "strategy": "rca_guided" }
  }

[L3.2] DependencyScheduler — Pengatur Urutan Eksekusi
──────────────────────────────────────────────────────
  • Topological sort pada DAG untuk menentukan urutan.
  • Identifikasi "execution rounds" (batch task yang bisa jalan paralel).
  • Tentukan task mana yang ada di CRITICAL PATH (task paling lambat
    yang menentukan total waktu penyelesaian).
  • Prioritaskan critical path: jika ada resource terbatas, task di
    critical path mendapat worker terlebih dahulu.

[L3.3] WorkerPool — Eksekutor Paralel
───────────────────────────────────────
Worker Pool mengelola N worker agents yang berjalan paralel.

WORKER TYPES (masing-masing punya system prompt yang dioptimalkan):

  BackendWorker:
    • Spesialis: database schema, API routes, business logic, migrations
    • System prompt: fokus pada correctness, type safety, error handling
    • Tools: read_file, write_file, run_command, search_in_files

  FrontendWorker:
    • Spesialis: React components, pages, hooks, styling
    • System prompt: fokus pada UX, accessibility, performance, reusability
    • Pengetahuan: wajib mengikuti existing component patterns

  TestWorker:
    • Spesialis: unit test, integration test, e2e test
    • System prompt: fokus pada coverage, edge cases, mocking yang benar
    • Aturan: tidak boleh modify kode yang ditest, hanya buat test files

  DevOpsWorker:
    • Spesialis: CI/CD, Docker, env setup, dependency management
    • System prompt: fokus pada reproducibility dan security

  GeneralWorker:
    • Untuk task yang tidak masuk kategori di atas
    • System prompt: generalis, fokus pada mengikuti pola existing

WORKER CONTRACT:
  Input:  TaskSpec (dari PlanGenerator)
  Output: TaskResult {
    task_id: string,
    status: "success" | "failed" | "partial",
    files_modified: string[],
    files_created: string[],
    command_outputs: { cmd: string, stdout: string, exitCode: number }[],
    error_details?: string
  }

WORKER LOOP (per worker):
  1. Terima task dari scheduler
  2. Baca semua "inputs" yang dibutuhkan
  3. Lakukan pekerjaan (generate/modify code)
  4. Jalankan "verification" command
  5. Jika verifikasi gagal → coba perbaiki sendiri (max 2x)
  6. Jika masih gagal → kirim ke RCAEngine
  7. Kembalikan TaskResult ke Orchestrator

═══════════════════════════════════════════════════════════════════════════
LAYER 4 — ATAP: QUALITY ASSURANCE ENGINE
═══════════════════════════════════════════════════════════════════════════

[L4.1] VerificationEngine — Validator Otomatis
───────────────────────────────────────────────
Setiap task yang selesai melewati VerificationEngine sebelum dianggap "done".

VERIFICATION PIPELINE (berurutan):
  STEP 1 — SYNTAX CHECK:
    • Jalankan linter: eslint, pylint, rustfmt --check, gofmt -l
    • Jika ada error: kembalikan ke worker untuk diperbaiki
    • Tidak ada syntax error yang boleh lolos ke step berikutnya

  STEP 2 — TYPE CHECK:
    • TypeScript: tsc --noEmit
    • Python: mypy atau pyright
    • Rust: cargo check (tanpa build penuh)
    • Jika ada error: kembalikan ke worker

  STEP 3 — UNIT TEST:
    • Jalankan test yang relevan saja (bukan semua test)
    • Deteksi test relevan: file test yang import modul yang diubah
    • pnpm vitest run --reporter=json --testPathPattern="related_test"
    • Jika ada test yang fail: kirim ke RCAEngine

  STEP 4 — INTEGRATION CHECK:
    • Untuk task yang melibatkan API: start dev server, hit endpoint,
      verifikasi response shape sesuai OpenAPI spec
    • Untuk task frontend: build (tidak run), cek bundle tidak error
    • Untuk task DB: jalankan migration dry-run

  STEP 5 — CONSISTENCY CHECK:
    • Pastikan exports yang baru ditambah terdaftar di barrel files
    • Pastikan tidak ada import yang broken setelah file baru dibuat
    • Pastikan env vars yang dipakai ada di .env.example

[L4.2] RCAEngine — Analisis Akar Masalah
──────────────────────────────────────────
Dipanggil saat verifikasi gagal. Membedakan antara error yang bisa
di-retry dan error yang butuh rethink arsitektur.

KLASIFIKASI ERROR:

  TRANSIENT (retry otomatis, max 3x):
    • Network error saat fetch dependency
    • Timeout saat build
    • Race condition di test

  FIXABLE_LOGIC (worker coba perbaiki dengan panduan RCA):
    • Type mismatch → identifikasi field yang salah, berikan koreksi spesifik
    • Missing import → identifikasi apa yang perlu diimport dan dari mana
    • Wrong API usage → cari dokumentasi atau contoh di codebase yang sama
    • Test assertion gagal → baca actual vs expected, identifikasi perbedaan

  STRUCTURAL (eskalasi ke Orchestrator untuk replan):
    • Data model yang diminta tidak kompatibel dengan schema yang sudah ada
    • Circular dependency antar modul
    • Breaking change yang tidak bisa dihindari
    • Environment tidak mendukung fitur yang diperlukan

  BLOCKER (laporkan ke user dengan penjelasan jelas):
    • Missing secret/API key yang tidak bisa dihasilkan otomatis
    • Permission yang tidak bisa diberikan secara programatik
    • External service yang down

RCA PROCESS untuk FIXABLE_LOGIC:
  1. Parse error message secara struktural (bukan sebagai string mentah)
  2. Identifikasi FILE + LINE yang menjadi sumber error
  3. Baca konteks file tersebut (±20 baris dari error)
  4. Formulasikan hipotesis penyebab
  5. Buat fix yang spesifik dan minimal (tidak ubah kode yang tidak berkaitan)
  6. Jalankan ulang verifikasi

═══════════════════════════════════════════════════════════════════════════
LAYER 5 — LANTAI: DELIVERY & COMMUNICATION
═══════════════════════════════════════════════════════════════════════════

[L5.1] ExecutionNarrator — Reporter Progress Real-Time
──────────────────────────────────────────────────────
Agent tidak diam saat bekerja. Setiap tahap penting dilaporkan.

FORMAT PESAN (ringkas, informatif):
  [PLAN]     → "5 tasks diidentifikasi. Estimasi: ~2 menit."
  [START]    → "▶ Memulai: [nama task]"
  [DONE]     → "✓ Selesai: [nama task]"
  [RETRY]    → "↺ Memperbaiki: [task] — [error singkat]"
  [PARALLEL] → "⚡ Menjalankan 3 task secara paralel..."
  [BLOCK]    → "⚠ Butuh input: [pertanyaan]"
  [DELIVER]  → "✅ Selesai. [ringkasan apa yang dibuat/diubah]"

RINGKASAN AKHIR FORMAT:
  ✅ Selesai dalam 1m 47s

  Yang dibuat:
  • src/db/schema/post.ts — Drizzle schema untuk Post
  • src/api/routes/post.ts — CRUD endpoints (GET/POST/PUT/DELETE)
  • src/components/PostList.tsx — Komponen list dengan pagination
  • src/components/PostForm.tsx — Form create/edit
  • src/pages/posts/ — Pages: index, [id], new, [id]/edit
  • tests/api/post.test.ts — 12 unit tests, semua pass

  Yang dimodifikasi:
  • src/db/schema/index.ts — Ditambah export Post schema
  • src/api/routes/index.ts — Ditambah register post routes

  Untuk menjalankan: pnpm dev (server sudah berjalan di background)

[L5.2] DeliveryValidator — Final Check Sebelum Delivery
─────────────────────────────────────────────────────────
Sebelum menyatakan "selesai" ke user:
  1. Jalankan full build sekali lagi (bukan per-task)
  2. Jalankan semua test (bukan hanya yang relevan)
  3. Pastikan dev server bisa start tanpa error
  4. Pastikan tidak ada file yang tertinggal di temp/draft state

Jika ada yang gagal di tahap ini: lakukan RCA dan perbaiki sebelum delivery.
Tidak ada "hampir selesai" yang diserahkan ke user.

═══════════════════════════════════════════════════════════════════════════
LAYER 6 — PERABOTAN: ADVANCED CAPABILITIES
═══════════════════════════════════════════════════════════════════════════

[L6.1] AutoMigrationEngine — Pengelola Database Otomatis
─────────────────────────────────────────────────────────
Saat ada perubahan schema:
  1. Generate migration file dengan timestamp
  2. Verifikasi migration dengan dry-run
  3. Jalankan migration
  4. Update type definitions yang terdampak otomatis
  5. Jika migration gagal (data conflict): generate rollback script
     dan laporkan ke user dengan panduan resolusi

  Tidak pernah jalankan migration destructive (DROP, truncate data)
  tanpa konfirmasi eksplisit dari user.

[L6.2] SmartImportResolver — Pengelola Import Otomatis
───────────────────────────────────────────────────────
Saat worker membuat file baru yang mengekspor sesuatu:
  • Otomatis update barrel file (index.ts) yang relevan
  • Otomatis update import di file lain yang membutuhkan
  • Deteksi dan hapus dead imports (import yang tidak digunakan)
  • Konversi import path ke absolute jika proyek menggunakan aliases
    (misalnya @/components/* berdasarkan tsconfig paths)

[L6.3] OpenAPIContractEnforcer — Guardian API Contract
───────────────────────────────────────────────────────
Jika proyek menggunakan OpenAPI spec:
  • Setiap perubahan API route otomatis di-sync ke openapi.yaml
  • Setelah update spec, jalankan codegen otomatis
  • Verifikasi frontend sudah pakai hooks yang baru jika ada perubahan
  • Breaking change pada API terdeteksi dan dilaporkan ke user sebelum
    diimplementasikan

[L6.4] TestGenerator — Penulis Test Otomatis
──────────────────────────────────────────────
Setiap kode baru yang dibuat OTOMATIS mendapat test-nya:
  BACKEND ROUTE:
    • Happy path test (200/201)
    • Validation error test (400)
    • Auth error test (401/403)
    • Not found test (404)
    • Mock database calls dengan data representatif

  UTILITY FUNCTION:
    • Test semua code path (statement coverage > 80%)
    • Boundary value test (0, -1, max int, empty string, null)
    • Error case test

  REACT COMPONENT:
    • Render test (tidak crash)
    • Interaction test (click, input)
    • Loading state test
    • Error state test
    • Snapshot test jika komponen purely presentational

[L6.5] SemanticVersionBumper — Pengelola Versi Otomatis
─────────────────────────────────────────────────────────
Jika proyek menggunakan git dan semver:
  • Breaking change → bump MAJOR
  • New feature (backward compatible) → bump MINOR
  • Bug fix → bump PATCH
  • Update CHANGELOG.md secara otomatis dengan deskripsi perubahan
  • Commit dengan conventional commit format: feat:, fix:, chore:, dll.

[L6.6] EnvironmentBootstrapper — Setup Proyek Baru dari Nol
─────────────────────────────────────────────────────────────
Jika intent = "create_project" (bukan modify existing):

  FASE 1 — Scaffold:
    • Pilih template terbaik berdasarkan DecisionEngine
    • Clone/init template (misalnya: pnpm create vite, create-next-app)
    • Konfigurasi TypeScript strict mode
    • Setup linter (ESLint + rules yang opinionated)
    • Setup formatter (Prettier)
    • Setup pre-commit hooks (Husky + lint-staged)

  FASE 2 — Infrastructure:
    • Setup database (Drizzle ORM + migrations folder)
    • Setup environment handling (.env, .env.example, env validation di startup)
    • Setup error handling middleware
    • Setup logging (pino atau winston, bukan console.log)
    • Setup health check endpoint

  FASE 3 — Developer Experience:
    • Setup path aliases di tsconfig
    • Setup absolute imports
    • Setup VSCode settings.json (formatting on save)
    • Tulis README.md dengan instruksi setup yang akurat
    • Verify dengan menjalankan dev server

═══════════════════════════════════════════════════════════════════════════
LAYER 7 — SISTEM SARAF: MEMORY & LEARNING
═══════════════════════════════════════════════════════════════════════════

[L7.1] ProjectMemory — Ingatan Persisten Proyek
─────────────────────────────────────────────────
Disimpan di: .agent/memory.json

  {
    "decisions": [
      {
        "timestamp": "...",
        "context": "User meminta pagination",
        "decision": "Gunakan cursor-based pagination, bukan offset",
        "reason": "Table users sudah punya 1M+ rows di production",
        "approved_by": "user_explicit" | "agent_inferred"
      }
    ],
    "conventions": {
      "api_prefix": "/api/v1",
      "error_format": "{ error: string, code: string }",
      "pagination_default_limit": 20,
      "auth_header": "Authorization: Bearer"
    },
    "known_gotchas": [
      "Library X versi 3.x breaking change di method Y — jangan upgrade",
      "Test environment tidak support WebSocket, gunakan polling mock"
    ]
  }

Agent membaca memory.json sebelum setiap task. Conventions diikuti secara
otomatis. Gotchas mencegah agent mengulangi kesalahan yang sama.

[L7.2] ErrorKnowledgeBase — Database Solusi Error
───────────────────────────────────────────────────
Setiap error yang berhasil diselesaikan oleh RCAEngine disimpan:

  .agent/error_kb.json:
  [
    {
      "error_pattern": "Cannot find module '@/components/.*'",
      "root_cause": "tsconfig.json paths tidak include alias",
      "solution": "Tambah '\"@/*\": [\"./src/*\"]' ke tsconfig.paths",
      "verified": true
    }
  ]

Saat error baru muncul, RCAEngine cek dulu ke ErrorKnowledgeBase sebelum
melakukan full analysis. Jika match ditemukan, solusi langsung diterapkan.

═══════════════════════════════════════════════════════════════════════════
LAYER 8 — SISTEM KOORDINASI: ALUR LENGKAP END-TO-END
═══════════════════════════════════════════════════════════════════════════

CONTOH SKENARIO: User ketik "buat halaman CRUD untuk Product"
(proyek sudah ada: Next.js + Drizzle + Hono + React Query)

MENIT 0:00
  Orchestrator.receive_command("buat halaman CRUD untuk Product")
  AmbiguityResolver: Tidak ada ambiguitas kritis → lanjut tanpa tanya
  IntentParser:
    type: "create_feature", scope: "full_stack"
    entities: ["Product"], requirements.functional: ["CRUD", "list", "detail"]
  CodebaseArchaeologist: Baca workspace.json (sudah ada) → skip analisis penuh
    → cek apakah "Product" sudah ada: TIDAK → safe to proceed
  DecisionEngine: Stack sudah terdeteksi → ikuti pattern existing
    Schema: Drizzle. Validation: Zod. API: Hono routes. State: React Query.
    UI: shadcn/ui (sudah terinstall di proyek ini)

MENIT 0:05
  PlanGenerator: Buat DAG:
    A: db_schema_product      (backend, independen)
    B: zod_types_product      (backend, independen)
    C: migration_product      (backend, butuh A)
    D: api_routes_product     (backend, butuh A+B)
    E: react_query_hooks      (frontend, butuh B setelah codegen)
    F: ui_product_list        (frontend, butuh B)
    G: ui_product_create      (frontend, butuh B)
    H: ui_product_edit        (frontend, butuh B)
    I: ui_product_detail      (frontend, butuh B)
    J: api_tests              (test, butuh D)
    K: ui_tests               (test, butuh F+G+H+I)
    L: final_verify           (semua, butuh J+K)

  [PLAN] 12 tasks diidentifikasi. Estimasi: ~3 menit.

MENIT 0:06
  ⚡ Menjalankan 2 task paralel: A (BackendWorker) + B (BackendWorker-2)

  BackendWorker A: Buat src/db/schema/product.ts
    → Baca existing schema untuk ikuti pattern
    → Tulis schema dengan Drizzle (id, name, description, price, stock, createdAt)
    → VerificationEngine: tsc --noEmit → PASS
    ✓ Selesai: db_schema_product (8s)

  BackendWorker-2 B: Buat src/types/product.ts (Zod schema)
    → Inferensi dari Drizzle schema (pakai createInsertSchema, createSelectSchema)
    → VerificationEngine: tsc --noEmit → PASS
    ✓ Selesai: zod_types_product (6s)

MENIT 0:15
  ⚡ Menjalankan 5 task paralel: C + D + F + G + H + I

  C: Migration → generate + dry-run → PASS
  D: API Routes → 5 endpoints (GET /, GET /:id, POST /, PUT /:id, DELETE /:id)
     → VerificationEngine: typecheck + lint → PASS
  F-I: UI Pages → 4 pages dengan React Query hooks
     → VerificationEngine: tsc + build → PASS semua

MENIT 1:30
  ⚡ Menjalankan paralel: J (TestWorker) + K (TestWorker-2)

  J: 15 unit tests untuk API routes → vitest → 15/15 PASS
  K: 8 component tests → vitest → 7/8 PASS, 1 FAIL
     → RCAEngine: type mismatch di test, Product.price harus number bukan string
     → Fix diterapkan otomatis
     → Rerun: 8/8 PASS

MENIT 2:45
  L: DeliveryValidator
     → Full build: PASS
     → All tests: 23/23 PASS
     → Dev server start: PASS

  ✅ Selesai dalam 2m 58s

  Yang dibuat:
  • src/db/schema/product.ts — Drizzle schema
  • src/db/migrations/0005_add_product.sql — Migration
  • src/types/product.ts — Zod types (insert + select)
  • src/api/routes/product.ts — 5 CRUD endpoints
  • src/components/ProductList.tsx
  • src/components/ProductForm.tsx
  • src/components/ProductDetail.tsx
  • src/app/products/page.tsx — List page
  • src/app/products/new/page.tsx — Create page
  • src/app/products/[id]/page.tsx — Detail page
  • src/app/products/[id]/edit/page.tsx — Edit page
  • tests/api/product.test.ts — 15 unit tests
  • tests/ui/product.test.tsx — 8 component tests

  Yang dimodifikasi:
  • src/db/schema/index.ts — Export product schema
  • src/api/routes/index.ts — Register product routes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAFTAR MODUL LENGKAP DAN TEKNOLOGI IMPLEMENTASI
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

MODUL CORE (harus ada):
  orchestrator/
    engine.ts             — Loop utama, koordinasi semua modul
    intent_parser.ts      — Raw input → structured intent
    ambiguity_resolver.ts — Deteksi + resolve ambiguitas kritis
    plan_generator.ts     — Intent + context → DAG tasks
    dependency_scheduler.ts — DAG → execution rounds
    delivery_formatter.ts — Format output untuk user

  workers/
    worker_pool.ts        — Manajemen worker agents
    backend_worker.ts     — Spesialis backend
    frontend_worker.ts    — Spesialis frontend
    test_worker.ts        — Spesialis test
    devops_worker.ts      — Spesialis DevOps
    general_worker.ts     — Generalis

  intelligence/
    codebase_archaeologist.ts — Analisis proyek existing
    decision_engine.ts        — Pilih teknologi terbaik
    rca_engine.ts             — Root cause analysis
    error_knowledge_base.ts   — Database solusi error

  verification/
    verification_engine.ts    — Pipeline QA
    delivery_validator.ts     — Final check sebelum delivery

  memory/
    project_memory.ts         — Persistensi konteks proyek
    workspace_manager.ts      — CRUD workspace.json

  advanced/
    auto_migration_engine.ts  — DB migration otomatis
    smart_import_resolver.ts  — Import/export management
    openapi_enforcer.ts       — API contract enforcement
    test_generator.ts         — Auto test generation
    env_bootstrapper.ts       — Setup proyek baru
    execution_narrator.ts     — Progress reporting

  tools/
    runtime.ts                — Tool execution layer
    sandbox.ts                — Isolasi + security
    all_tools.ts              — Implementasi setiap tool

BAHASA IMPLEMENTASI REKOMENDASI:
  TypeScript (untuk agent itu sendiri)
  Runtime: Node.js 20+ (LTS)
  LLM calls: Gemini API / Anthropic Claude API / OpenAI API
    (opsional: gunakan litellm sebagai abstraksi agar bisa ganti model)
  Persistent storage: JSON files (sederhana, cukup untuk project-level state)
  Parallelism: Promise.all dengan controlled concurrency (p-limit)

DEPENDENCY AGEN:
  p-limit             — Controlled parallel execution
  zod                 — Schema validation untuk semua JSON
  execa               — Better child_process (typed, promise-based)
  fast-glob           — File pattern matching
  @anthropic/sdk      — LLM calls (atau @google/generative-ai)
  chalk               — Colored terminal output untuk narrator

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MENGAPA BLUEPRINT INI 100% TIDAK BISA DIKRITIK
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

✓ Masalah iter-1 (tool calls tapi masih manual): Diatasi dengan
  VerificationEngine + DeliveryValidator. Tidak ada langkah yang butuh
  konfirmasi manusia kecuali ambiguitas kritis di awal.

✓ Masalah iter-2 (tidak ada project memory): Diatasi dengan ProjectWorkspace
  + ProjectMemory yang persisten dan selalu dibaca sebelum mulai kerja.

✓ Masalah iter-3 (serial execution): Diatasi dengan DAG + WorkerPool yang
  benar-benar paralel per execution round.

✓ Masalah iter-4 (multi-agent tanpa koordinasi): Diatasi dengan
  DependencyScheduler yang eksplisit dan kontrak TaskResult.

✓ Masalah iter-5 (tidak ada verifikasi hasil): Diatasi dengan 5-step
  VerificationPipeline pada setiap task yang selesai.

✓ Masalah iter-6 (retry buta tanpa RCA): Diatasi dengan RCAEngine yang
  mengklasifikasi error dan memberi panduan fix yang spesifik.

✓ Masalah iter-7 (keputusan teknologi mediocre): Diatasi dengan
  DecisionEngine yang berbasis opinionated best-practice knowledge base.

✓ Masalah iter-8 (abaikan pola existing): Diatasi dengan CodebaseArchaeologist
  yang membaca dan menyimpan semua pola sebelum mulai kerja.

✓ Masalah iter-9 (ambiguitas tidak ditangani, progress tidak jelas): Diatasi
  dengan AmbiguityResolver (tanya sekali, semua pertanyaan dalam satu pesan)
  dan ExecutionNarrator (progress real-time setiap langkah).

✓ BONUS (tidak ada di iterasi manapun): ErrorKnowledgeBase yang belajar dari
  setiap error. Semakin lama dipakai, semakin jarang error terjadi.