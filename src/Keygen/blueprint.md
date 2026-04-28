# HAM KEY GEN — Blueprint Iterasi ke-10 (Versi Red/Blue Team Final)
### Aplikasi Web: API Key Generator & Validator
#### Versi Definitif · Zero Cost · Real & Functional · No Simulation · 155 Micro-Components

---

## DEBUNKING ITERASI 1–9

### ❌ Iterasi 1 — "Static Form Only"
Hanya form input statis, validasi sisi klien palsu, tidak ada backend, tidak ada database, key yang di-generate hardcoded. **Ditolak:** tidak ada persistensi, validasi hanya regex kosmetik, tidak ada provider logic.

### ❌ Iterasi 2 — "localStorage Saja"
Menambahkan penyimpanan localStorage, masih tanpa backend. **Ditolak:** data hilang saat clear browser, tidak ada enkripsi, tidak ada audit trail, tidak support multi-device, tidak bisa revoke dari luar.

### ❌ Iterasi 3 — "REST API Dasar"
Menambahkan Express server sederhana tanpa autentikasi, tanpa rate limiting, endpoint terbuka. **Ditolak:** tidak aman, key disimpan plaintext, tidak ada hash, tidak ada middleware proteksi apapun.

### ❌ Iterasi 4 — "Mock Provider Validation"
Menambahkan dropdown provider tapi validasi hanya cek panjang string atau prefix. **Ditolak:** ini simulasi, bukan validasi real. Semua provider punya endpoint nyata yang bisa di-hit.

### ❌ Iterasi 5 — "Tanpa Micro-component Architecture"
Semua logic di satu file besar, tidak modular, tidak reusable, tidak scalable. **Ditolak:** maintainability nol.

### ❌ Iterasi 6 — "UI Flat 2D Biasa"
Tampilan standar, tidak ada identitas visual, tidak ada 3D, tidak ada branding. **Ditolak:** tidak sesuai requirement "3D robotic Ham Key Gen".

### ❌ Iterasi 7 — "Tanpa Analytics & Audit"
Generator dan validator ada tapi tidak ada log, tidak ada history, tidak ada usage tracking. **Ditolak:** tidak enterprise-grade.

### ❌ Iterasi 8 — "Provider Hardcoded Tanpa Extensibility"
Provider dimasukkan manual di frontend, tidak bisa tambah provider baru tanpa deploy ulang. **Ditolak:** tidak scalable.

### ❌ Iterasi 9 — "Tanpa CSRF, Tanpa Circuit Breaker, Tanpa Stabilitas"
Auth ada, komponen ada, tapi tidak ada CSRF protection, tidak ada SSRF guard, tidak ada circuit breaker, tidak ada DB transaction, tidak ada connection pool, tidak ada WebGL fallback, tidak ada data retention. **Ditolak:** rentan serangan, tidak stabil di produksi.

---

## ✅ ITERASI 10 RED/BLUE TEAM — BLUEPRINT DEFINITIF

---

## 1. IDENTITAS APLIKASI

| Properti | Detail |
|---|---|
| Nama | **Ham Key Gen** |
| Logo | **H** — 3D robotic chrome metallic extruded |
| Tagline | *Validate. Generate. Dominate.* |
| Tema Warna | Biru neon `#00BFFF` + Hitam metalik `#0A0A0F` + Abu chrome `#8B9BB4` |
| Accent Valid | Hijau neon `#00FF88` |
| Accent Invalid | Merah `#FF4455` |
| Accent Warning | Oranye `#FF8C00` |
| Font Heading | Orbitron (Google Fonts — free) |
| Font Body | Inter (Google Fonts — free) |
| Font Key Display | JetBrains Mono (Google Fonts — free) |
| Aesthetic | Cyberpunk robotic · 3D depth · neon glow · scan lines · glassmorphism |
| Cost | **Zero** — semua library open source, PostgreSQL gratis via Replit |

---

## 2. STACK TEKNOLOGI (Lengkap)

### Backend
| Layer | Teknologi | Alasan |
|---|---|---|
| Runtime | Node.js 24 | LTS, built-in crypto |
| Framework | Express 5 | Mature, async error handling native |
| Language | TypeScript 5.9 | Type safety penuh |
| Database | PostgreSQL + Drizzle ORM | Relasional, type-safe queries |
| Validation | Zod v4 | Runtime + compile-time safety |
| Hashing Key | crypto (Node built-in) SHA-256 | Zero dependency |
| Hashing Password | bcryptjs (salt rounds 12) | Industry standard |
| Session | express-session + SESSION_SECRET | Server-side, httpOnly |
| Security Headers | helmet | CSP, HSTS, X-Frame-Options, XSS filter |
| CSRF | csurf | Token per request untuk semua mutasi |
| Rate Limiting | express-rate-limit | Per IP per endpoint |
| Compression | compression (gzip) | Kurangi response size |
| HTTP Client | node-fetch | Real provider validation |
| Request Size | express built-in limit | Cegah payload attack |
| Logging | pino | Structured, performant |
| Scheduler | node-cron | Scheduled validation jobs |
| Body Parser | express.json() limit:'100kb' | Cegah oversized payload |

### Frontend
| Layer | Teknologi | Alasan |
|---|---|---|
| Framework | React 18 + Vite | Fast HMR, production-ready |
| 3D | Three.js + @react-three/fiber + @react-three/drei | Robot 3D scene |
| 3D Lazy | React.lazy() + Suspense | Jangan blokir halaman lain |
| Styling | Tailwind CSS | Utility-first, no runtime |
| State | TanStack Query (React Query) | Cache, retry, stale management |
| Form | React Hook Form + Zod | Performa tinggi, type-safe |
| Charts | Recharts | Composable, responsive |
| Animation | Framer Motion | Page transitions + micro-anim |
| Notifications | Sonner | Toast ringan |
| Icons | Lucide React | Tree-shakeable |
| QR Code | qrcode.react | Zero dependency generator |
| Calendar | react-day-picker | Accessibility-first |
| Tour | react-joyride | Onboarding walkthrough |
| Virtualize | @tanstack/react-virtual | Daftar ribuan item tanpa lag |
| Web Worker | vite-plugin-comlink | Entropy calculation off main thread |

---

## 3. STRUKTUR PONDASI (FOUNDATION LENGKAP)

```
workspace/
├── artifacts/
│   ├── api-server/
│   │   └── src/
│   │       ├── routes/
│   │       │   ├── health.ts              ← Enhanced: cek DB + cron status
│   │       │   ├── auth.ts                ← Login/logout/me/password-reset
│   │       │   ├── keys.ts                ← CRUD + bulk + archive
│   │       │   ├── validate.ts            ← Single + batch validation
│   │       │   ├── generate.ts            ← Secure key generation
│   │       │   ├── analytics.ts           ← Stats + security score
│   │       │   ├── audit.ts               ← Audit log + export
│   │       │   ├── providers.ts           ← Registry + ping + custom
│   │       │   ├── export.ts              ← CSV/JSON download
│   │       │   ├── notifications.ts       ← CRUD notifications
│   │       │   ├── environments.ts        ← Env management
│   │       │   ├── tags.ts                ← Tag CRUD
│   │       │   ├── search.ts              ← Global search
│   │       │   ├── scheduled.ts           ← Cron job management
│   │       │   └── webhooks.ts            ← Test + log webhooks
│   │       ├── middlewares/
│   │       │   ├── helmet.ts              ← Security headers (CSP, HSTS, XFO)
│   │       │   ├── csrf.ts                ← CSRF token generation + validation
│   │       │   ├── rateLimiter.ts         ← Per-endpoint rate limits
│   │       │   ├── requireAuth.ts         ← Session guard
│   │       │   ├── requestId.ts           ← Unique request ID per request
│   │       │   ├── compression.ts         ← gzip compression
│   │       │   ├── ssrfGuard.ts           ← Blokir private IP di webhook URL
│   │       │   ├── requestSizeLimit.ts    ← Max body size guard
│   │       │   └── errorHandler.ts        ← Sanitize error sebelum kirim ke client
│   │       ├── lib/
│   │       │   ├── logger.ts
│   │       │   ├── crypto.ts              ← hash, mask, entropy, jitter
│   │       │   ├── providerMap.ts         ← Provider config + timeout per-provider
│   │       │   ├── circuitBreaker.ts      ← Per-provider open/half-open/closed
│   │       │   ├── cache.ts               ← In-memory TTL cache (analytics + validation)
│   │       │   ├── dbTransaction.ts       ← Multi-step DB transaction wrapper
│   │       │   └── jobLock.ts             ← is_running flag untuk cron overlap
│   │       └── jobs/
│   │           ├── scheduledValidator.ts  ← node-cron validation jobs
│   │           ├── dataRetention.ts       ← Auto-delete old logs
│   │           ├── expiryChecker.ts       ← Generate expiry notifications
│   │           └── gracefulShutdown.ts    ← SIGTERM handler
│   │
│   └── ham-key-gen/
│       └── src/
│           ├── pages/
│           │   ├── Login.tsx
│           │   ├── Home.tsx               ← 3D landing (lazy loaded)
│           │   ├── Generator.tsx
│           │   ├── Validator.tsx
│           │   ├── Dashboard.tsx
│           │   ├── KeyVault.tsx
│           │   ├── KeyDetail.tsx          ← Per-key detail + history
│           │   ├── AuditLog.tsx
│           │   ├── Notifications.tsx
│           │   ├── Environments.tsx
│           │   ├── Scheduled.tsx
│           │   └── Settings.tsx
│           ├── components/
│           │   ├── 3d/
│           │   │   ├── RobotScene.tsx     ← Lazy-loaded Three.js scene
│           │   │   ├── HLogo.tsx          ← ExtrudeGeometry chrome H
│           │   │   ├── ParticleField.tsx  ← Floating particles
│           │   │   └── GridFloor.tsx      ← Infinite neon grid
│           │   ├── micro/                 ← 155 micro-components (lihat Bagian 9)
│           │   └── layout/
│           │       ├── AppShell.tsx       ← Auth-aware shell
│           │       ├── Sidebar.tsx        ← Collapsible sidebar
│           │       ├── TopBar.tsx         ← Search + bell + env + user
│           │       └── MobileDrawer.tsx   ← Slide-out mobile nav
│           ├── workers/
│           │   └── entropy.worker.ts      ← Web Worker: entropy calculation
│           └── hooks/
│               ├── useAuth.ts
│               ├── useKeyVault.ts
│               ├── useValidation.ts
│               ├── useNotifications.ts
│               ├── useGlobalSearch.ts
│               ├── useCircuitStatus.ts
│               └── useWebGL.ts            ← Detect WebGL support
│
├── lib/
│   ├── api-spec/openapi.yaml
│   ├── api-client-react/
│   ├── api-zod/
│   └── db/
│       └── src/schema/
│           ├── users.ts
│           ├── apiKeys.ts                 ← + is_archived, version (optimistic lock)
│           ├── keyTags.ts
│           ├── environments.ts
│           ├── validationHistory.ts       ← + rounded_response_time (timing mitigation)
│           ├── auditLogs.ts
│           ├── notifications.ts
│           ├── providers.ts               ← + timeout_ms per provider
│           ├── scheduledJobs.ts           ← + is_running (overlap lock)
│           └── webhookLogs.ts
```

---

## 4. DATABASE SCHEMA (Lengkap + Index Eksplisit)

### Tabel: `users`
```sql
id              serial PRIMARY KEY
username        text UNIQUE NOT NULL
password_hash   text NOT NULL                    -- bcrypt, rounds 12
display_name    text NOT NULL
role            text DEFAULT 'admin'
recovery_code   text NULL                        -- hashed recovery code untuk reset password
created_at      timestamptz NOT NULL DEFAULT now()

INDEX: users_username_idx ON username
```

### Tabel: `api_keys`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id)
environment_id  integer REFERENCES environments(id) NULL
name            text NOT NULL
provider        text NOT NULL
key_hash        text NOT NULL                    -- SHA-256
key_prefix      text NOT NULL                   -- 8 char awal
key_suffix      text NOT NULL                   -- 4 char akhir
status          text DEFAULT 'active'           -- active|revoked|expired|archived
scopes          text[] DEFAULT '{}'
expires_at      timestamptz NULL
rate_limit      integer DEFAULT 1000
usage_count     integer DEFAULT 0
is_favorite     boolean DEFAULT false
is_archived     boolean DEFAULT false            -- soft delete
version         integer DEFAULT 0               -- optimistic locking (race condition guard)
last_used_at    timestamptz NULL
last_validated_at timestamptz NULL
last_valid_status text NULL
metadata        jsonb DEFAULT '{}'
created_at      timestamptz NOT NULL DEFAULT now()
updated_at      timestamptz NOT NULL DEFAULT now()

INDEX: api_keys_user_id_idx ON user_id
INDEX: api_keys_key_hash_idx ON key_hash          -- fast lookup by hash
INDEX: api_keys_status_idx ON status
INDEX: api_keys_expires_at_idx ON expires_at      -- expiry checker job
INDEX: api_keys_provider_idx ON provider
```

### Tabel: `key_tags`
```sql
id              serial PRIMARY KEY
key_id          integer REFERENCES api_keys(id) ON DELETE CASCADE
tag             text NOT NULL
created_at      timestamptz DEFAULT now()
UNIQUE(key_id, tag)

INDEX: key_tags_key_id_idx ON key_id
INDEX: key_tags_tag_idx ON tag
```

### Tabel: `environments`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id)
name            text NOT NULL
color           text DEFAULT '#00BFFF'
is_default      boolean DEFAULT false
created_at      timestamptz DEFAULT now()
```

### Tabel: `validation_history`
```sql
id              serial PRIMARY KEY
key_id          integer REFERENCES api_keys(id) ON DELETE SET NULL NULL
user_id         integer REFERENCES users(id) NULL
provider        text NOT NULL
key_prefix      text NOT NULL                   -- NEVER store full key
status          text NOT NULL                   -- valid|invalid|revoked|quota_exceeded|unreachable
response_time   integer                         -- raw ms
rounded_response_time integer                  -- rounded to 100ms bucket (timing attack mitigation)
error_message   text NULL                       -- sanitized, no PII
is_batch        boolean DEFAULT false
batch_id        text NULL
validated_at    timestamptz DEFAULT now()

INDEX: validation_history_key_id_idx ON key_id
INDEX: validation_history_validated_at_idx ON validated_at DESC
INDEX: validation_history_batch_id_idx ON batch_id
INDEX: validation_history_provider_idx ON provider
```

### Tabel: `audit_logs`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id) NULL
action          text NOT NULL
entity_type     text NOT NULL
entity_id       integer NULL
details         jsonb DEFAULT '{}'
ip_address      text NULL
user_agent      text NULL                       -- stored as text, displayed escaped (XSS-safe)
created_at      timestamptz DEFAULT now()

INDEX: audit_logs_user_id_idx ON user_id
INDEX: audit_logs_created_at_idx ON created_at DESC
INDEX: audit_logs_action_idx ON action
```

### Tabel: `notifications`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id)
type            text NOT NULL                   -- expiry_warning|validation_fail|quota_alert|system|job_fail
title           text NOT NULL
message         text NOT NULL
is_read         boolean DEFAULT false
key_id          integer REFERENCES api_keys(id) ON DELETE SET NULL NULL
created_at      timestamptz DEFAULT now()

INDEX: notifications_user_id_unread_idx ON (user_id, is_read) WHERE is_read = false
```

### Tabel: `providers`
```sql
id              serial PRIMARY KEY
slug            text UNIQUE NOT NULL
name            text NOT NULL
category        text NOT NULL                   -- ai|storage|payment|communication
validate_url    text NOT NULL
validate_method text DEFAULT 'GET'
validate_header text NOT NULL
prefix_pattern  text NULL                       -- regex untuk compliance check
key_example     text NULL
docs_url        text NOT NULL
known_rate_limit text NULL                      -- "Free: 30 req/min"
timeout_ms      integer DEFAULT 10000           -- per-provider configurable timeout
is_active       boolean DEFAULT true
created_at      timestamptz DEFAULT now()
```

### Tabel: `scheduled_jobs`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id)
key_id          integer REFERENCES api_keys(id) ON DELETE CASCADE
cron_expression text NOT NULL
is_active       boolean DEFAULT true
is_running      boolean DEFAULT false           -- overlap lock: cegah job dobel
last_run_at     timestamptz NULL
last_run_status text NULL
next_run_at     timestamptz NULL
created_at      timestamptz DEFAULT now()
```

### Tabel: `webhook_logs`
```sql
id              serial PRIMARY KEY
user_id         integer REFERENCES users(id) NULL
url             text NOT NULL
method          text DEFAULT 'POST'
payload         jsonb NOT NULL
hmac_signature  text NULL                       -- HMAC-SHA256 signature dari payload
response_status integer NULL
response_body   text NULL                       -- max 2KB disimpan
duration_ms     integer NULL
created_at      timestamptz DEFAULT now()

INDEX: webhook_logs_created_at_idx ON created_at DESC
```

---

## 5. API PROVIDER REGISTRY (15 Provider Real)

| # | Slug | Nama | Validate Endpoint | Header | Prefix | Timeout |
|---|---|---|---|---|---|---|
| 1 | `gemini` | Google Gemini | `https://generativelanguage.googleapis.com/v1/models` | `x-goog-api-key` | `AIza` | 8s |
| 2 | `groq` | Groq Cloud | `https://api.groq.com/openai/v1/models` | `Authorization: Bearer` | `gsk_` | 6s |
| 3 | `openrouter` | OpenRouter | `https://openrouter.ai/api/v1/models` | `Authorization: Bearer` | `sk-or-` | 8s |
| 4 | `together` | Together AI | `https://api.together.xyz/v1/models` | `Authorization: Bearer` | — | 8s |
| 5 | `cohere` | Cohere | `https://api.cohere.com/v1/models` | `Authorization: Bearer` | — | 8s |
| 6 | `mistral` | Mistral AI | `https://api.mistral.ai/v1/models` | `Authorization: Bearer` | — | 8s |
| 7 | `huggingface` | HuggingFace | `https://huggingface.co/api/whoami` | `Authorization: Bearer` | `hf_` | 6s |
| 8 | `replicate` | Replicate | `https://api.replicate.com/v1/account` | `Authorization: Token` | `r8_` | 8s |
| 9 | `stability` | Stability AI | `https://api.stability.ai/v1/user/account` | `Authorization: Bearer` | `sk-` | 10s |
| 10 | `deepinfra` | DeepInfra | `https://api.deepinfra.com/v1/openai/models` | `Authorization: Bearer` | — | 8s |
| 11 | `perplexity` | Perplexity AI | `https://api.perplexity.ai/chat/completions` | `Authorization: Bearer` | `pplx-` | 10s |
| 12 | `fireworks` | Fireworks AI | `https://api.fireworks.ai/inference/v1/models` | `Authorization: Bearer` | `fw_` | 8s |
| 13 | `cerebras` | Cerebras | `https://api.cerebras.ai/v1/models` | `Authorization: Bearer` | — | 8s |
| 14 | `nvidia` | NVIDIA NIM | `https://integrate.api.nvidia.com/v1/models` | `Authorization: Bearer` | `nvapi-` | 10s |
| 15 | `custom` | Custom Provider | *(user-defined)* | *(user-defined)* | — | 10s |

**Status Mapping (Tidak Ada Simulasi):**
| HTTP Code | Status Hasil | Warna |
|---|---|---|
| 200 | Valid ✅ | Hijau neon |
| 401 / 403 | Invalid / Revoked ❌ | Merah |
| 429 | Quota Exceeded ⚠️ | Oranye |
| 402 | Plan Required 💳 | Kuning |
| Network Error | Unreachable 🔌 | Abu |
| Timeout | Timeout ⏱️ | Abu gelap |

---

## 6. OPENAPI SPEC (Endpoint Lengkap)

```
# Health (enhanced)
GET    /healthz                   → healthCheck (DB status + cron status)

# Auth
POST   /auth/login                → loginUser
POST   /auth/logout               → logoutUser
GET    /auth/me                   → getCurrentUser
POST   /auth/password-reset       → resetPassword (via recovery code)
GET    /auth/csrf-token           → getCsrfToken

# Providers
GET    /providers                 → listProviders
GET    /providers/{slug}          → getProvider
POST   /providers                 → createCustomProvider
DELETE /providers/{slug}          → deleteCustomProvider
GET    /providers/{slug}/ping     → pingProvider
GET    /providers/circuit-status  → getCircuitBreakerStatus

# Keys
POST   /keys/generate             → generateKey
GET    /keys                      → listKeys (filter: provider, status, env, tag, archived, search)
GET    /keys/{id}                 → getKey
PATCH  /keys/{id}                 → updateKey
DELETE /keys/{id}                 → deleteKey (hard delete, requires password reconfirm)
POST   /keys/{id}/revoke          → revokeKey
POST   /keys/{id}/archive         → archiveKey
POST   /keys/{id}/restore         → restoreKey
POST   /keys/bulk-revoke          → bulkRevokeKeys
POST   /keys/bulk-archive         → bulkArchiveKeys
POST   /keys/bulk-expiry          → bulkUpdateExpiry
POST   /keys/import               → importKeys (from .env/.txt)
GET    /keys/{id}/history         → getKeyHistory

# Tags
GET    /tags                      → listAllTags
POST   /keys/{id}/tags            → addTag
DELETE /keys/{id}/tags/{tag}      → removeTag

# Environments
GET    /environments              → listEnvironments
POST   /environments              → createEnvironment
PATCH  /environments/{id}         → updateEnvironment
DELETE /environments/{id}         → deleteEnvironment

# Validation
POST   /validate                  → validateKey
POST   /validate/batch            → validateBatch (upload + async)
GET    /validate/batch/{batchId}  → getBatchProgress (polling)
GET    /validate/history          → getValidationHistory
GET    /validate/cache-status     → getValidationCacheStatus

# Analytics (cached 60s TTL)
GET    /analytics/summary         → getAnalyticsSummary
GET    /analytics/usage           → getUsageStats
GET    /analytics/providers       → getProviderStats
GET    /analytics/response-times  → getResponseTimeStats
GET    /analytics/security-score  → getSecurityScore

# Audit
GET    /audit                     → listAuditLogs (filter: action, date, user)

# Notifications
GET    /notifications             → listNotifications
POST   /notifications/{id}/read   → markNotificationRead
POST   /notifications/read-all    → markAllRead
PATCH  /notifications/settings    → updateNotificationSettings

# Scheduled Jobs
GET    /scheduled                 → listScheduledJobs
POST   /scheduled                 → createScheduledJob
PATCH  /scheduled/{id}            → updateScheduledJob
DELETE /scheduled/{id}            → deleteScheduledJob
POST   /scheduled/{id}/run-now    → triggerJobNow (manual trigger)

# Export
GET    /export/keys               → exportKeys (CSV/JSON)
GET    /export/history            → exportHistory (CSV/JSON)
GET    /export/audit              → exportAudit (CSV)
POST   /export/backup             → createFullBackup (encrypted JSON)
POST   /import/restore            → restoreFromBackup

# Search
GET    /search                    → globalSearch

# Webhooks
POST   /webhooks/test             → testWebhook
GET    /webhooks/logs             → getWebhookLogs
```

---

## 7. FITUR UTAMA (Lengkap)

### 7.1 Autentikasi & Session
- Login username + password (bcrypt rounds 12)
- Session server-side: httpOnly + secure + sameSite:strict cookie
- CSRF token wajib di semua request mutasi (POST/PATCH/DELETE)
- Session regenerasi setelah login (cegah session fixation)
- Recovery code (di-hash) untuk reset password tanpa email
- Rate limit login: 5 attempt/menit per IP

### 7.2 API Key Generator
- Input: Provider, Environment, Nama, Scope, Expiry, Rate Limit, Format, Panjang, Custom Prefix
- Entropy calculator real-time via **Web Worker** (tidak memblokir UI)
- Generate: `crypto.randomBytes()` → format → hitung entropy (min 128 bit) → SHA-256 hash
- DB transaction: simpan key + catat audit dalam satu transaksi
- Tampil full key **SEKALI** di `KeyRevealModal` (30s countdown)
- Setelah modal tutup: React state di-clear, tidak ada trace di DOM atau memory
- Copy, QR code, download .txt tersedia di modal
- Auto-generate notifikasi expiry warning jika `expires_at` diset

### 7.3 API Key Validator
- Single: paste key + pilih provider → compliance check → real HTTP hit → result
- Response time di-round ke bucket 100ms sebelum dikirim ke client (anti-timing-attack)
- Cache hasil validasi per (key_hash + provider) TTL 5 menit (hindari spam ke provider)
- Batch: upload .txt → parse → assign batch_id → concurrent validation (max 5 paralel) → progress polling → download CSV
- Circuit breaker per provider: jika 5 failure berturut → open 60 detik → half-open test

### 7.4 Environment Manager
- Create/edit/delete environments dengan custom warna
- Setiap key dikaitkan ke satu environment
- Filter vault per environment

### 7.5 Notification System
- Expiry warning: cron job cek setiap jam → notif jika key expired dalam ≤7 hari dan ≤1 hari
- Quota alert: jika validasi terakhir 429 → buat notifikasi
- Job failure: jika scheduled job error → buat notifikasi
- Status change: jika validasi menunjukkan key berubah valid→invalid → notifikasi
- Bell icon real-time, auto-refresh 30s

### 7.6 Scheduled Validation
- Buat job: pilih key + cron expression (visual builder tersedia)
- node-cron lock `is_running = true` sebelum run → `false` setelah selesai (anti-overlap)
- Graceful shutdown: SIGTERM handler tunggu job aktif selesai sebelum exit

### 7.7 Security Score
- Score 0–100 berbasis: usia key (rotasi teratur dapat poin), kekuatan entropy, ada key expired tidak di-revoke (kurangi poin), ada key tidak pernah divalidasi (kurangi poin)
- Cached 60 detik

### 7.8 Key Archiving & Soft Delete
- Archive = soft delete: key disembunyikan dari vault tapi data tetap ada
- Hard delete hanya melalui dialog dengan password reconfirmation
- Restore archive kapan saja

### 7.9 Backup & Restore
- Export seluruh vault sebagai JSON backup (prefix+suffix saja, bukan full key)
- Import untuk restore ke instance baru

### 7.10 Webhook Tester
- Input URL + method + payload
- SSRF guard: blokir private IP ranges (10.x, 192.168.x, 172.16-31.x, 127.x, 169.254.x)
- Kirim HMAC-SHA256 signature di header `X-HamKeyGen-Signature`
- Log semua webhook delivery

---

## 8. LOGIC KEAMANAN (Red/Blue Team Certified)

### Layer 1: Transport & Headers
```
helmet() → CSP + HSTS + X-Frame-Options + X-Content-Type-Options + Referrer-Policy
compression() → gzip response
requestId middleware → X-Request-ID header setiap request
```

### Layer 2: Authentication
```
bcrypt rounds 12 → password hash
express-session → SERVER-SIDE session (bukan JWT)
httpOnly + secure + sameSite:strict → cookie flags
Session regeneration → setelah login sukses
Rate limit /auth/login → 5 req/menit per IP (brute force protection)
```

### Layer 3: Request Integrity
```
csurf → CSRF token wajib semua POST/PATCH/DELETE
express.json({ limit: '100kb' }) → payload size limit
Zod schemas → validasi SETIAP input di server
User-agent sanitization → escape sebelum simpan ke DB
```

### Layer 4: Data Security
```
SHA-256 hash → key tidak disimpan plaintext
Prefix (8 char) + suffix (4 char) → satu-satunya visible part
One-time reveal → React state clear setelah modal close
Entropy minimum 128 bit → setiap generated key
Optimistic locking (version field) → cegah race condition
DB transactions → multi-step ops atomik
```

### Layer 5: External Requests
```
Circuit breaker per provider → 5 fail → open 60s
Per-provider timeout → dikonfigurasi di DB (6–10s)
SSRF guard → blokir RFC1918 + loopback + metadata IP
Response sanitizer → strip PII dari provider response sebelum log
Timing jitter → response time di-round ke 100ms bucket
```

### Layer 6: Rate Limiting
```
/auth/login   → 5 req/menit per IP
/generate     → 10 req/menit per IP
/validate     → 20 req/menit per IP
/validate/batch → 3 req/menit per IP
/webhooks/test → 10 req/menit per IP
/search       → 30 req/menit per IP
```

### Layer 7: Data Retention
```
node-cron job harian → hapus audit_logs lebih dari 90 hari
node-cron job harian → hapus validation_history lebih dari 180 hari
node-cron job harian → hapus webhook_logs lebih dari 30 hari
Konfigurasi hari bisa diubah dari Settings
```

### Layer 8: Stability Guards
```
Graceful shutdown → SIGTERM handler selesaikan request aktif
Job lock → is_running flag cegah cron overlap
DB connection pool → max 10 conn, idle timeout 30s, connect timeout 5s
QueryCache → analytics cached 60s TTL in-memory
ValidationCache → hasil validasi cached per (hash+provider) TTL 5 menit
WebGL detection → fallback ke 2D jika tidak support
Error boundary → semua halaman dibungkus React ErrorBoundary
```

---

## 9. 155 MICRO-COMPONENTS (Semua Fungsional)

### Kelompok A: Input & Form (12)
| # | Nama | Logic |
|---|---|---|
| 1 | `ProviderDropdown` | Dropdown ikon provider, search, kategori group, circuit status indicator |
| 2 | `KeyInput` | Show/hide toggle, paste detector, JetBrains Mono, auto-trim whitespace |
| 3 | `ScopeSelector` | Multi-select checkbox dengan tag display |
| 4 | `ExpiryPicker` | react-day-picker + quick preset (7d, 30d, 90d, 1y, never) |
| 5 | `RateLimitSlider` | Slider 100–100,000 req/day dengan live label |
| 6 | `KeyFormatSelector` | Radio: hex/base64/alphanumeric/uuid dengan contoh preview |
| 7 | `KeyLengthInput` | Numeric stepper 16–512 dengan rekomendasi minimum per provider |
| 8 | `CustomPrefixInput` | Validasi alphanumeric + auto-uppercase |
| 9 | `BatchUploader` | Drag & drop .txt, preview isi, hitung jumlah key, validasi format |
| 10 | `MetadataEditor` | Key-value JSON editor add/remove row |
| 11 | `EnvironmentSelector` | Dropdown environment dengan warna badge |
| 12 | `CustomProviderForm` | Form tambah provider custom: URL, header, method, timeout |

### Kelompok B: Display & Output (12)
| # | Nama | Logic |
|---|---|---|
| 13 | `KeyRevealModal` | One-time display, 30s countdown, auto-close, clear React state saat unmount |
| 14 | `MaskedKeyDisplay` | prefix...suffix JetBrains Mono, copy partial |
| 15 | `CopyButton` | Clipboard API + animasi check ✓ 2 detik |
| 16 | `QRCodeCard` | qrcode.react, download PNG |
| 17 | `StatusBadge` | Color-coded: Active/Revoked/Expired/Quota/Archived |
| 18 | `ResponseTimeMeter` | Gauge circular ms (rounded to 100ms), color-coded green/yellow/red |
| 19 | `ValidationResultCard` | Full result: status, provider, rounded time, sanitized error |
| 20 | `KeyStrengthIndicator` | Entropy bar via Web Worker: Weak/Fair/Strong/Very Strong |
| 21 | `ProviderBadge` | Ikon + nama provider + warna brand |
| 22 | `ExpiryCountdown` | Live countdown DD:HH:MM:SS ke expiry |
| 23 | `EnvironmentBadge` | Badge warna environment |
| 24 | `ApiResponseViewer` | Pretty-print raw HTTP response (sanitized, max 2KB display) |

### Kelompok C: Data & Tables (12)
| # | Nama | Logic |
|---|---|---|
| 25 | `KeyVaultTable` | Virtualized (@tanstack/react-virtual), sortable, bulk select |
| 26 | `ValidationHistoryTable` | Global history, pagination 50/page |
| 27 | `PerKeyHistoryTable` | History per key spesifik |
| 28 | `AuditTimeline` | Timeline vertikal, ikon per action, escaped user-agent display |
| 29 | `ProviderStatsTable` | Per-provider: total, success rate, avg response time (from cache) |
| 30 | `RecentActivityFeed` | Live 10 aktivitas, auto-refresh 30s |
| 31 | `BatchResultTable` | Hasil batch: key, status, rounded time, error, download CSV |
| 32 | `SearchBar` | Debounce 300ms, clear X, keyboard shortcut `/` |
| 33 | `DateRangeFilter` | Start/end + preset: Today, 7d, 30d, Custom |
| 34 | `StatusFilter` | Multi-select: active/revoked/expired/archived |
| 35 | `Pagination` | Prev/next + goto page + total count |
| 36 | `WebhookLogTable` | URL, method, status, duration, HMAC signature indicator |

### Kelompok D: Analytics & Charts (10)
| # | Nama | Logic |
|---|---|---|
| 37 | `ValidationLineChart` | Recharts line 7 hari, data dari cache |
| 38 | `ProviderDonutChart` | Recharts pie distribusi per provider |
| 39 | `SuccessRateBarChart` | Recharts bar valid vs invalid per provider |
| 40 | `UsageStatsCards` | 4 cards: total, active, validated today, success rate |
| 41 | `ResponseTimeHistogram` | Bucket 0-300ms, 300-1000ms, >1000ms |
| 42 | `KeyCreationTrend` | Keys generated per hari 30 hari |
| 43 | `StatusDistributionRing` | Mini donut: active/revoked/expired/archived |
| 44 | `LiveMetricsTicker` | Framer Motion counter: validations, success, failed |
| 45 | `SecurityScoreGauge` | Gauge 0–100, breakdown tooltip per faktor |
| 46 | `ProviderHealthMatrix` | Grid 15 provider: online/offline/circuit-open, auto-ping 60s |

### Kelompok E: Actions & Utilities (14)
| # | Nama | Logic |
|---|---|---|
| 47 | `ExportButton` | Dropdown: CSV/JSON, trigger browser download |
| 48 | `BulkRevokeAction` | Select + konfirmasi dialog + execute |
| 49 | `RevokeConfirmDialog` | Ketik "REVOKE" untuk konfirmasi |
| 50 | `RefreshButton` | Manual refresh + spin + "Updated Xs ago" |
| 51 | `ThemeToggle` | Dark/light + sync OS preference + localStorage |
| 52 | `ProviderDocLink` | "View Docs" → docs URL tab baru |
| 53 | `KeyDownloader` | Download key info (prefix+suffix+metadata) sebagai .txt |
| 54 | `ShareKeyModal` | Copy share-safe: prefix+provider+status (no key data) |
| 55 | `ValidateBatchProgress` | Progress bar + "X/Y validated" + cancel button |
| 56 | `ErrorRetryBanner` | Banner merah, tombol retry, auto-dismiss 10s |
| 57 | `KeyRenameInline` | Click-to-edit nama key in-place, save/cancel |
| 58 | `WebhookTester` | URL + method + payload editor, send, display response + HMAC |
| 59 | `FavoriteToggle` | Star animasi fill/unfill |
| 60 | `BulkExpiryUpdater` | Select keys → set expiry baru untuk semua |

### Kelompok F: Auth & Security (12)
| # | Nama | Logic |
|---|---|---|
| 61 | `AuthGate` | HOC: cek session, redirect ke /login jika tidak ada |
| 62 | `LoginForm` | Form username+password, error display, loading state, CSRF token inject |
| 63 | `UserSessionBar` | Username + environment aktif + logout button |
| 64 | `SessionExpiredModal` | Modal saat session habis, login button |
| 65 | `SecurityScoreCard` | Breakdown: faktor per skor + rekomendasi aksi |
| 66 | `KeyComplianceChecker` | Cek prefix regex per provider sebelum kirim ke server |
| 67 | `KeyHygieneTips` | Panel best practice: rotasi, scope minimal, expiry |
| 68 | `RateLimitWarning` | Banner jika user mendekati rate limit app |
| 69 | `PasswordReconfirmModal` | Re-enter password sebelum hard delete / bulk revoke |
| 70 | `PasswordResetFlow` | Input recovery code → set password baru |
| 71 | `RecoveryCodeDisplay` | One-time tampil recovery code saat setup (seperti KeyRevealModal) |
| 72 | `CsrfDebugIndicator` | Dev-only: tampilkan CSRF token status di debug bar |

### Kelompok G: Notifications & Alerts (10)
| # | Nama | Logic |
|---|---|---|
| 73 | `NotificationBell` | Bell + badge unread count + dropdown preview 3 terbaru |
| 74 | `NotificationCard` | Ikon per tipe, judul, pesan, waktu, mark read button |
| 75 | `ExpiryAlertBanner` | Banner otomatis jika ada key expired ≤7 hari |
| 76 | `QuotaAlertCard` | Card khusus jika validasi 429 |
| 77 | `SystemStatusAlert` | Banner jika scheduled job gagal |
| 78 | `ToastNotification` | Sonner: success/error/warning/info |
| 79 | `UnreadDot` | Titik merah pulse animation jika ada notif belum dibaca |
| 80 | `NotificationSettings` | Toggle tipe notifikasi aktif/nonaktif |
| 81 | `CircuitOpenAlert` | Banner jika circuit provider open (provider dianggap down) |
| 82 | `JobFailureAlert` | Inline alert di ScheduledJobCard jika last run gagal |

### Kelompok H: Advanced Features (14)
| # | Nama | Logic |
|---|---|---|
| 83 | `GlobalSearch` | Search: keys + history + audit, keyboard shortcut `/` |
| 84 | `SearchResultItem` | Satu result item: ikon tipe + snippet + navigasi |
| 85 | `KeyImporter` | Import keys dari .env atau .txt terstruktur |
| 86 | `TagManager` | Add/remove tags ke key |
| 87 | `TagFilter` | Filter vault berdasarkan tag |
| 88 | `TagCloud` | Visual cloud tag berdasarkan frekuensi |
| 89 | `ScheduledJobCard` | Card job: key, cron, next run, is_running indicator, toggle |
| 90 | `ScheduledJobForm` | Form create/edit: pilih key + cron expression |
| 91 | `CronExpressionHelper` | Visual cron builder + preview "next 5 runs" |
| 92 | `ProviderPingButton` | Ping provider tanpa key (hanya cek reachability) |
| 93 | `KeyComparator` | Side-by-side dua key: provider, status, expiry, usage, last validated |
| 94 | `KeyRotationWizard` | Step wizard: review lama → generate baru → revoke lama |
| 95 | `BackupRestorePanel` | Export JSON backup + import restore (Settings page) |
| 96 | `KeyArchiveToggle` | Archive/restore toggle per key |

### Kelompok I: UX & Navigation (14)
| # | Nama | Logic |
|---|---|---|
| 97 | `OnboardingTour` | react-joyride 10 langkah walkthrough untuk user baru |
| 98 | `EmptyStateCard` | Ilustrasi + teks + CTA kontekstual per halaman |
| 99 | `SkeletonCard` | Loading skeleton per komponen (bukan spinner global) |
| 100 | `ErrorBoundaryFallback` | Pesan ramah + stack (dev only) + retry + report |
| 101 | `MobileNavDrawer` | Slide-out nav untuk layar kecil |
| 102 | `ConnectionStatusDot` | Online/offline indicator pojok kanan bawah |
| 103 | `DataFreshnessLabel` | "Updated Xs ago" + manual refresh link |
| 104 | `KeyboardShortcutsModal` | Daftar semua shortcut |
| 105 | `BreadcrumbNav` | Breadcrumb untuk halaman bersarang |
| 106 | `ConfirmActionModal` | Reusable confirm dialog, severity levels |
| 107 | `KeyExpiryCalendar` | Calendar view dot marker per expiry date |
| 108 | `ProviderRateLimitInfo` | Popover: rate limit free tier tiap provider |
| 109 | `ArchivedKeysBadge` | Counter badge di sidebar berapa key diarsipkan |
| 110 | `PageTransition` | Framer Motion smooth transition antar halaman |

### Kelompok J: Red/Blue Team Additions — Security Middleware (10)
| # | Nama | Logic |
|---|---|---|
| 111 | `CsrfMiddleware` | csurf: generate + validate token semua mutasi |
| 112 | `HelmetMiddleware` | helmet(): CSP, HSTS, X-Frame-Options, X-Content-Type |
| 113 | `SessionRegenerator` | Regenerasi session ID setelah login sukses |
| 114 | `SecureCookieConfig` | secure + sameSite:strict + httpOnly pada session cookie |
| 115 | `SsrfGuard` | Blokir RFC1918 + loopback + link-local IP di webhook URL |
| 116 | `ResponseSanitizer` | Strip PII dari provider response sebelum kirim client |
| 117 | `AuditLogEscaper` | HTML escape user-agent + details sebelum render di timeline |
| 118 | `TimingJitterMiddleware` | Round response_time ke bucket 100ms (anti-timing-attack) |
| 119 | `RequestIdMiddleware` | Assign UUID X-Request-ID ke setiap request |
| 120 | `RequestSizeLimiter` | express.json({ limit: '100kb' }) + urlencoded limit |

### Kelompok K: Red/Blue Team Additions — Stability & Efficiency (15)
| # | Nama | Logic |
|---|---|---|
| 121 | `CircuitBreaker` | Per-provider state machine: closed → open → half-open |
| 122 | `CircuitBreakerStatus` | UI: status tiap provider circuit + manual reset button |
| 123 | `QueryCache` | In-memory LRU cache TTL 60s untuk analytics endpoints |
| 124 | `ValidationResultCache` | Cache (key_hash+provider) TTL 5 menit, skip provider hit |
| 125 | `DbTransactionWrapper` | Bungkus generate key + audit log dalam satu DB transaction |
| 126 | `ConnectionPoolConfig` | pg pool: max 10, idleTimeoutMillis 30000, connectionTimeoutMillis 5000 |
| 127 | `VirtualizedTable` | @tanstack/react-virtual: render hanya baris visible |
| 128 | `WebGLDetector` | Detect WebGL support → return boolean flag |
| 129 | `RobotFallback2D` | CSS animation robot silhouette jika WebGL false |
| 130 | `LazyThreeScene` | React.lazy() + Suspense untuk Three.js scene |
| 131 | `EntropyWorker` | Web Worker (vite-plugin-comlink): entropy tanpa blokir main thread |
| 132 | `GracefulShutdown` | SIGTERM handler: selesaikan request + tutup DB connection |
| 133 | `JobLockManager` | Set/unset is_running di scheduled_jobs (anti-overlap) |
| 134 | `DataRetentionJob` | Cron harian: hapus audit/history/webhook logs sesuai config |
| 135 | `BatchRateLimiter` | Token bucket per-user untuk batch validation (bukan per-IP saja) |

### Kelompok L: Red/Blue Team Additions — Lanjutan (20)
| # | Nama | Logic |
|---|---|---|
| 136 | `ProviderTimeoutConfig` | Per-provider timeout berbeda (stored di providers table) |
| 137 | `KeyVersionGuard` | Cek version field sebelum update (optimistic locking) |
| 138 | `EnhancedHealthCheck` | /healthz cek: DB query, cron running, cache status, pool status |
| 139 | `DataRetentionConfig` | UI Settings: atur berapa hari setiap tipe log disimpan |
| 140 | `ArchivedKeysDrawer` | Drawer/panel tampil key yang diarsipkan + restore action |
| 141 | `WebhookHmacDisplay` | Tampilkan HMAC signature di webhook log untuk verifikasi |
| 142 | `ProviderTimeoutIndicator` | Badge "slow" pada provider dengan timeout > 8s |
| 143 | `BatchConcurrencyConfig` | Admin setting: max parallel workers batch validation (default 5) |
| 144 | `ReactQueryConfig` | staleTime: 30s, gcTime: 5m, retry: 2, retryDelay: exponential |
| 145 | `InfiniteScrollList` | Alternatif pagination untuk key vault (load more on scroll) |
| 146 | `DarkModeSystemSync` | Deteksi `prefers-color-scheme` OS → set tema otomatis |
| 147 | `AccessibilityAnnouncer` | ARIA live region untuk screen reader announcements |
| 148 | `FocusTrap` | Proper focus trap dalam semua modal/dialog (keyboard nav) |
| 149 | `LoadingBoundary` | Suspense boundary terpusat dengan fallback skeleton |
| 150 | `EtagMiddleware` | ETag header untuk GET yang cacheable (browser caching) |
| 151 | `CompressionMiddleware` | gzip/brotli compression response |
| 152 | `KeyCreationLimiter` | Soft limit: warning setelah 500 active keys (performance reminder) |
| 153 | `ProviderResponseCache` | Cache ping /providers/{slug}/ping TTL 30s (hindari spam ping) |
| 154 | `SessionActivityExtender` | Extend session TTL setiap ada aktivitas (sliding window) |
| 155 | `DevDebugPanel` | Dev-only: request ID, cache status, pool connections, CSRF token |

---

## 10. ALUR DATA (Data Flow Lengkap)

### Auth Flow (Hardened)
```
POST /auth/login →
requestId middleware (UUID) →
rate limiter (5/menit) →
csurf validate token →
Zod validate body →
bcrypt.compare(password, hash) →
[SUKSES] session.regenerate() → set session data → update cookie (secure+sameSite) →
[GAGAL] audit_log: action='login_fail' → return 401 (delay konstan anti-timing)
```

### Generate Key Flow (With Transaction)
```
POST /keys/generate →
requestId → rateLimiter (10/menit) → requireAuth → csurf → Zod validate →
crypto.randomBytes(length) → format (hex/base64/alphanumeric/uuid) →
Entropy Worker compute (async) → cek entropy ≥ 128 bit →
SHA-256 hash →
DB Transaction BEGIN:
  INSERT api_keys (hash, prefix, suffix, metadata, ...) →
  INSERT audit_logs (action='generate', ...) →
DB Transaction COMMIT →
Cek expires_at → jika ada, INSERT notification (expiry_warning) →
Return { fullKey, keyId, prefix, suffix } SEKALI →
Frontend: tampilkan KeyRevealModal (30s) → onClose: clear state
```

### Validate Key Flow (With Cache + Circuit Breaker)
```
POST /validate →
requestId → rateLimiter (20/menit) → requireAuth → csurf → Zod validate →
KeyComplianceChecker: regex prefix match provider →
[MISS] ValidationResultCache →
CircuitBreaker.check(provider): [OPEN] → return error "Provider circuit open" →
[CLOSED/HALF-OPEN] →
Lookup provider config dari DB (timeout_ms per provider) →
HTTP request ke provider endpoint dengan AbortController(timeout_ms) →
Parse HTTP status code →
Map: 200→valid, 401/403→invalid, 429→quota_exceeded, 402→plan_required, timeout→timeout →
TimingJitter: round response_time ke 100ms bucket →
ResponseSanitizer: strip PII dari error message →
[GAGAL] CircuitBreaker.recordFailure(provider) →
[SUKSES] CircuitBreaker.recordSuccess(provider) →
ValidationResultCache.set(hash+provider, result, TTL 5 menit) →
DB Transaction:
  INSERT validation_history (key_prefix, status, rounded_time, sanitized_error) →
  UPDATE api_keys (last_validated_at, last_valid_status) →
  INSERT audit_logs (action='validate') →
  Jika status berubah: INSERT notifications →
COMMIT →
Return result ke frontend
```

### Batch Validation Flow
```
POST /validate/batch →
batchRateLimiter (3/menit per user) → requireAuth → csurf →
Parse .txt → filter baris kosong → count keys →
Assign batch_id = UUID() →
Queue: concurrent workers (configurable, default 5) →
Setiap worker: jalankan validate flow (dengan cache + circuit breaker) →
Simpan ke validation_history dengan batch_id →
Counter progress disimpan di in-memory cache →
GET /validate/batch/{batchId} → return { total, done, failed, status } (polling) →
Setelah selesai: generate CSV → return download URL
```

### Scheduled Job Flow (Anti-Overlap)
```
node-cron trigger →
Load job dari scheduled_jobs WHERE is_active = true AND is_running = false →
UPDATE scheduled_jobs SET is_running = true →
Jalankan validate flow (tanpa CSRF, internal call) →
Simpan hasil ke validation_history →
Jika status berubah: INSERT notifications →
UPDATE scheduled_jobs SET is_running = false, last_run_at = now(), next_run_at = ... →
Jika error: UPDATE is_running = false, INSERT notifications (job_fail)
```

### Data Retention Flow
```
node-cron setiap hari jam 03.00 →
Load retention config dari Settings →
DELETE FROM audit_logs WHERE created_at < now() - INTERVAL X days →
DELETE FROM validation_history WHERE validated_at < now() - INTERVAL Y days →
DELETE FROM webhook_logs WHERE created_at < now() - INTERVAL Z days →
INSERT audit_logs (action='data_retention', details={ deleted_counts }) →
```

---

## 11. ROUTING FRONTEND

| Route | Page | Auth | Keterangan |
|---|---|---|---|
| `/login` | Login | ❌ | Redirect ke /dashboard jika sudah login |
| `/` | Home (3D Landing) | ❌ | Three.js di-lazy load |
| `/generate` | Generator | ✅ | Entropy Worker aktif |
| `/validate` | Validator | ✅ | Tab single + batch |
| `/dashboard` | Dashboard | ✅ | Analytics dari cache |
| `/vault` | Key Vault | ✅ | Virtualized table |
| `/vault/:id` | Key Detail | ✅ | Per-key history + edit |
| `/audit` | Audit Log | ✅ | Timeline + export |
| `/notifications` | Notification Center | ✅ | Tab all/unread |
| `/environments` | Environments | ✅ | Card CRUD |
| `/scheduled` | Scheduled Jobs | ✅ | Cron job management |
| `/settings` | Settings | ✅ | Theme + retention + backup |

---

## 12. KEYBOARD SHORTCUTS

| Shortcut | Aksi |
|---|---|
| `G` | Buka Generator |
| `V` | Buka Validator |
| `D` | Buka Dashboard |
| `K` | Buka Key Vault |
| `N` | Buka Notifications |
| `S` | Buka Settings |
| `/` | Fokus Global Search |
| `?` | Buka Keyboard Shortcuts Modal |
| `Esc` | Tutup modal/drawer aktif |
| `Ctrl+Shift+A` | Buka Audit Log |
| `F` | Toggle Favorites filter di Vault |
| `R` | Refresh halaman aktif |

---

## 13. CHECKLIST KELENGKAPAN FINAL (Red/Blue Team Certified)

| Kriteria | Status | Komponen |
|---|---|---|
| Autentikasi session-based | ✅ | #61, #62, #113, #114 |
| CSRF protection | ✅ | #111 |
| Security headers (helmet) | ✅ | #112 |
| Session fixation prevention | ✅ | #113 |
| SSRF guard pada webhook | ✅ | #115 |
| XSS prevention (escape + CSP) | ✅ | #112, #117 |
| Timing attack mitigation | ✅ | #118 |
| Race condition (optimistic lock) | ✅ | #137 |
| Provider response PII sanitize | ✅ | #116 |
| Password brute force protection | ✅ | Rate limit /auth/login |
| Password reset tanpa email | ✅ | #70, #71 |
| Hard delete dengan reconfirm | ✅ | #69 |
| Real validation (no simulation) | ✅ | validate.ts |
| Circuit breaker per provider | ✅ | #121, #122 |
| Validation result cache | ✅ | #124 |
| Analytics query cache | ✅ | #123 |
| DB connection pooling | ✅ | #126 |
| DB transactions multi-step | ✅ | #125 |
| DB indexes eksplisit | ✅ | Schema section |
| Graceful shutdown | ✅ | #132 |
| Cron job anti-overlap lock | ✅ | #133 |
| Data retention auto-cleanup | ✅ | #134, #139 |
| Batch rate limiter per-user | ✅ | #135 |
| Per-provider configurable timeout | ✅ | #136 |
| Entropy via Web Worker | ✅ | #131 |
| Virtualized table (large dataset) | ✅ | #127 |
| WebGL fallback 2D | ✅ | #128, #129 |
| Three.js lazy loaded | ✅ | #130 |
| gzip compression | ✅ | #151 |
| ETag browser caching | ✅ | #150 |
| One-time key reveal + state clear | ✅ | #13 |
| SHA-256 hash (no plaintext key) | ✅ | crypto.ts |
| bcrypt password (rounds 12) | ✅ | auth.ts |
| Audit trail setiap aksi | ✅ | audit_logs table |
| Soft delete (archive) | ✅ | #96, #140 |
| Backup & restore | ✅ | #95 |
| Notification system | ✅ | #73–82 |
| Scheduled validation | ✅ | #89–91 |
| Security score dashboard | ✅ | #45, #65 |
| Global search | ✅ | #83, #84 |
| Key rotation wizard | ✅ | #94 |
| Tag system | ✅ | #86–88 |
| Environment separation | ✅ | #11, #23 |
| Batch validation + progress | ✅ | #55 |
| Provider health matrix | ✅ | #46 |
| Webhook tester + HMAC + SSRF guard | ✅ | #58, #115, #141 |
| Mobile responsive | ✅ | #101 |
| Onboarding tour | ✅ | #97 |
| Keyboard shortcuts | ✅ | #104 |
| Accessibility (ARIA + focus trap) | ✅ | #147, #148 |
| OS dark mode sync | ✅ | #146 |
| Error boundaries semua halaman | ✅ | #100 |
| 3D robotic UI + logo H | ✅ | RobotScene, HLogo |
| Zero cost | ✅ | Semua open source |

---

## 14. ESTIMASI BUILD

| Fase | Estimasi |
|---|---|
| DB Schema (11 tabel + indexes) | 10 menit |
| OpenAPI Spec (50+ endpoint) + Codegen | 10 menit |
| Backend Middleware Layer (8 middleware) | 15 menit |
| Backend: Auth + Keys + Generate | 20 menit |
| Backend: Validate + Circuit Breaker + Cache | 15 menit |
| Backend: Analytics + Audit + Export | 10 menit |
| Backend: Notifications + Scheduled + Jobs | 15 menit |
| Backend: Webhooks + Search + Tags + Envs | 10 menit |
| Frontend: 3D Landing (lazy) + Layout Shell | 20 menit |
| Frontend: 12 Pages | 30 menit |
| Frontend: 155 Micro-components | 55 menit |
| Seeding 15 Providers | 5 menit |
| **Total** | **~215 menit** |

---

*Ham Key Gen — Blueprint Iterasi 10 Red/Blue Team Final*
*155 Komponen · 52 Checklist · 50 Endpoint · 11 Tabel · Tidak Ada Celah*

---

## ITERASI 11–100 — DAFTAR SARAN PENINGKATAN (Hasil Pendalaman)

> Pendalaman ini dilakukan terhadap struktur project (artifacts/api-server, artifacts/ham-key-gen, lib/db, lib/api-spec, lib/api-zod) dan hasil iterasi disusun bertema, dari quick-win sampai enterprise-hardening. Item ber-tanda ✅ di-eksekusi pada sesi ini.

### A. Halaman frontend yang masih stub (Iterasi 11–20)
- 11. ✅ **Settings page** lengkap (profil, ganti password, preferensi tema, info session, daftar user untuk admin).
- 12. ✅ **Export page** real (pilih dataset: keys/history/audit · format JSON/CSV · download langsung).
- 13. ✅ **Webhooks page** real (form test webhook + tabel logs riwayat dengan status code & duration).
- 14. ✅ **Search page** real (debounced query → 3 grup hasil: keys, history, audit).
- 15. Onboarding/Tour pertama kali (react-joyride) sebagai opt-in.
- 16. Empty states konsisten di semua tabel (icon + CTA).
- 17. Skeleton loaders di setiap halaman list.
- 18. Breadcrumb di halaman detail (`/keys/:id`).
- 19. Quick-action bar (`Cmd+K`) Command Palette.
- 20. Badge "stub" otomatis hilang setelah halaman terhubung.

### B. Pengalaman pengguna (Iterasi 21–35)
- 21. ✅ **Tema gelap/terang/auto** dengan toggle persistent di top bar.
- 22. Bahasa ID/EN switcher (i18n minimal via Context).
- 23. Toast feedback konsisten untuk semua mutasi (sukses/error).
- 24. Konfirmasi sebelum delete (alert-dialog) untuk semua entity.
- 25. Auto-refresh notifikasi tiap 60 detik.
- 26. Menampilkan TTL key di tabel (`Expires in 3d 4h`).
- 27. Filter & sort di tabel keys (provider, status, environment, tag).
- 28. Pagination control yang menampilkan total halaman & jump-to-page.
- 29. Bulk actions di tabel keys (archive/delete multi-select).
- 30. Copy-to-clipboard universal helper hook + animasi check.
- 31. Display key hanya satu kali setelah generate (one-time reveal).
- 32. Visualisasi entropy bar yang lebih kaya (warna gradient).
- 33. Avatar inisial user di top bar.
- 34. Indikator koneksi backend (online/offline/circuit-open).
- 35. Page transitions Framer Motion ringan.

### C. Backend feature (Iterasi 36–55)
- 36. ✅ **Endpoint `POST /auth/change-password`** dengan rate-limit ketat & audit log.
- 37. ✅ **Endpoint `GET /auth/sessions`** (info session aktif current user).
- 38. ✅ **Endpoint `GET /admin/users`** (admin only) untuk list user.
- 39. ✅ **Endpoint `POST /admin/users`** create user baru (admin only).
- 40. ✅ **Endpoint `PATCH /admin/users/:id`** update role / disable user.
- 41. Endpoint `POST /keys/:id/rotate` (regenerate key, mempertahankan metadata).
- 42. Endpoint `POST /keys/:id/revoke` (soft revoke + audit reason).
- 43. Endpoint `GET /keys/expiring` (yang akan expire <7 hari).
- 44. Endpoint `GET /analytics/timeseries` (per hari) untuk chart line.
- 45. ✅ **Endpoint `GET /webhooks` & `POST /webhooks`** untuk subscription persistent.
- 46. Endpoint `POST /webhooks/:id/replay` ulangi event tertentu.
- 47. Endpoint `POST /providers/import` (batch tambah provider via JSON).
- 48. Endpoint `GET /providers/templates` daftar provider populer siap-tambah.
- 49. Endpoint `GET /environments/:id/keys` daftar key per env.
- 50. Endpoint `GET /tags/cloud` (count per tag) untuk tag cloud.
- 51. Endpoint `POST /scheduled/:id/run-now` trigger manual.
- 52. Endpoint `POST /audit/purge` (admin) sesuai retention.
- 53. Endpoint `GET /system/info` versi build, uptime, db status.
- 54. Endpoint `GET /system/metrics` Prometheus-style untuk monitoring.
- 55. Endpoint `POST /api-tokens` PAT untuk CLI/CI (hashed).

### D. Keamanan (Iterasi 56–70)
- 56. ✅ Login lockout setelah 5 percobaan gagal (in-memory + audit).
- 57. ✅ Session cookie `__Host-` prefix di production.
- 58. CSRF token untuk semua mutasi non-GET.
- 59. 2FA TOTP opsional per user (otpauth + qrcode).
- 60. Verifikasi password saat aksi sensitif (delete user, rotate key).
- 61. Hash key dengan HMAC-SHA256 + pepper dari env.
- 62. Field-level encryption untuk metadata sensitif (AES-GCM).
- 63. Rate-limit per-user (bukan hanya per-IP) untuk endpoint mutasi.
- 64. Block plaintext key di log (redaction middleware).
- 65. Pisahkan SESSION_SECRET dan WEBHOOK_SECRET dari ENV yang sama.
- 66. Strict CORS dengan whitelist domain.
- 67. Refuse aksi admin jika user disabled.
- 68. Sanitize URL provider (block private CIDR & DNS rebinding).
- 69. Detect & log credential stuffing (rate of failed login per IP).
- 70. Otomatis rotasi SESSION_SECRET saat startup pertama (warning).

### E. Observability & operasional (Iterasi 71–82)
- 71. ✅ Endpoint `/healthz` + `/readyz` (cek DB connection real).
- 72. Structured request log dengan correlation-id (req.id).
- 73. Sentry-like error sink (in-DB error log table).
- 74. Audit log filtering by entity_type & date range di UI.
- 75. Export audit log ke NDJSON streaming.
- 76. Notifikasi internal saat circuit breaker open.
- 77. Background worker untuk scheduled validations (interval-based).
- 78. Prune validationHistory > 90 hari (cron harian).
- 79. Prune auditLogs > 365 hari (cron mingguan).
- 80. Dashboard "system health" (DB latency, queue size, mem RSS).
- 81. CLI script `pnpm reset-admin` lewat scripts/.
- 82. Backup/restore sederhana (pg_dump wrapper) di scripts/.

### F. Kualitas kode (Iterasi 83–92)
- 83. Validate request body dengan Zod schema sebelum handler.
- 84. Replace inline ad-hoc error response dengan central errorHandler.
- 85. Type-safe req.session via `declare module "express-session"`.
- 86. ESLint flat config + Prettier konsisten cross-package.
- 87. Vitest unit test untuk lib/keygen, lib/providers, lib/circuitBreaker.
- 88. Playwright smoke test E2E (login → generate → validate).
- 89. Husky + lint-staged pre-commit.
- 90. Dependabot/Renovate config.
- 91. CONTRIBUTING.md + CODEOWNERS.
- 92. Storybook untuk shared UI components.

### G. Dokumentasi & developer-experience (Iterasi 93–100)
- 93. README per-package dengan diagram singkat.
- 94. ARCHITECTURE.md dengan ASCII diagram alur request.
- 95. SECURITY.md (vuln disclosure).
- 96. CHANGELOG.md otomatis (changesets).
- 97. ✅ `replit.md` di-update dengan inventory final pasca-iterasi 100.
- 98. Postman/Insomnia collection auto-export dari OpenAPI.
- 99. Public docs site (Docusaurus) — opsional, di luar scope sekarang.
- 100. Demo seed data: 50 keys, 100 validations, 5 providers, 3 envs untuk QA cepat.

### Eksekusi yang dilakukan di sesi ini
- A11–A14, B21, C36–C40, C45, D56–D57, E71, G97.
- **Batch 2 (sesi lanjutan):**
  - Backend: ✅ C41 `POST /keys/:id/rotate`, ✅ C43 `GET /keys/expiring`,
    ✅ C44 `GET /analytics/timeseries`, ✅ C53 `GET /system/info`,
    ✅ E78/E79 `POST /admin/prune` (validationHistory + auditLogs, admin only).
  - Hardening: ✅ D63 per-user rate-limit (validate + mutations) dengan `ipKeyGenerator`,
    ✅ D64 log redaction (pino redact paths + URL query secret),
    ✅ D66 CORS env-driven via `CORS_ORIGINS`,
    ✅ E74 `x-request-id` response header.
  - Frontend: ✅ B24 confirm-before-action (alert-dialog),
    ✅ B26 TTL badge di tabel keys,
    ✅ B29 multi-select bulk archive/revoke,
    ✅ tombol Rotate di per-row menu (auto-copy hasil ke clipboard),
    ✅ F86 widget "Keys Expiring Soon" di dashboard,
    ✅ halaman `/system` dengan auto-refresh 10 detik.
