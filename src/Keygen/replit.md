# Ham Key Gen — Blueprint Iterasi 10 (Red/Blue Team Final)

## Overview

pnpm workspace monorepo using TypeScript. Enterprise-grade API Key Generator & Validator.
Blueprint: Real validation against provider endpoints, no simulation, security-first.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React 18 + Vite + Tailwind CSS + TanStack Query
- **3D**: Three.js + @react-three/fiber (with WebGL fallback)
- **Auth**: Session-based (express-session + bcryptjs)
- **Security**: Helmet, CORS, rate-limit, SSRF guard, circuit breaker

## Artifacts

- `artifacts/api-server` — Express 5 backend (port via `PORT` env)
- `artifacts/ham-key-gen` — React + Vite frontend (cyberpunk/robotic theme)
- `artifacts/mockup-sandbox` — UI component development sandbox

## Shared Libraries

- `lib/db` — PostgreSQL schema via Drizzle ORM
- `lib/api-zod` — Shared Zod validation schemas
- `lib/api-client-react` — Auto-generated React Query hooks (Orval)

## Backend Routes (all under /api)

- `GET /healthz` — Health check
- `GET /readyz` — Readiness (cek koneksi DB, latensi)
- `POST /auth/login`, `GET /auth/me`, `POST /auth/logout`
- `POST /auth/change-password` — Ganti password (rate-limited 5/jam, validasi kekuatan)
- `GET /auth/session` — Info session aktif (IP, UA, expires)
- `GET|POST|PATCH|DELETE /admin/users` — Manajemen user (admin only)
- `GET|POST|PATCH|DELETE /keys` — CRUD + bulk + archive + generate
- `POST /validate`, `POST /validate/batch`, `GET /validate/history`
- `GET /analytics/summary`, `/analytics/usage`, `/analytics/providers`, `/analytics/security-score`
- `GET /audit` — Audit log with pagination
- `GET|POST|DELETE /providers`, `/providers/circuit-status`, `/providers/:slug/ping`
- `GET /export/keys`, `/export/history`, `/export/audit`
- `GET|POST /notifications`, `/notifications/:id/read`, `/notifications/read-all`
- `GET|POST|PATCH|DELETE /environments`
- `GET /tags`
- `GET /search`
- `GET|POST|PATCH|DELETE /scheduled`
- `POST /webhooks/test`, `GET /webhooks/logs`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `npx tsx artifacts/api-server/seed.ts` — seed admin user + builtin providers

## Default Admin Credentials

- Username: `admin`
- Password: `Admin@HamKeyGen2024!`
- Change after first login!

## WebGL Fallback

Logo3D component auto-detects WebGL support. Falls back to a 2D "H" badge if WebGL unavailable.

## Responsive Sidebar

`app-layout.tsx` uses a `useBreakpoint` hook:
- **Mobile (<640px)** — sidebar hidden by default, opens as overlay (z-30) with backdrop
- **Tablet (640–1023px)** — same overlay behaviour as mobile
- **Desktop (≥1024px)** — sidebar inline (pushes content), open by default

Toggle button in top bar. Auto-close on nav click (mobile/tablet only).
Sidebar width: `w-[179px]` (30% smaller than original w-64).

## Iterasi 11–100 (lihat blueprint.md)

100 saran peningkatan dikumpulkan dan ditulis ke `blueprint.md` (bagian "Iterasi 11–100"). Yang sudah dieksekusi pada sesi ini:

- **Halaman frontend stub → fungsional**: `settings`, `export`, `webhooks`, `search`.
- **Theme light/dark/auto** dengan toggle persistent (`lib/theme.ts`) di top bar + di Settings.
- **Backend baru**: `POST /auth/change-password`, `GET /auth/session`, `GET /readyz`, dan rute admin lengkap (`/admin/users` GET/POST/PATCH/DELETE, admin-only).
- **Login lockout**: 5 percobaan gagal per IP / 15 menit, audit `login_failed`.
- **Audit menyeluruh**: login, /me, /session, admin users CRUD, search, export CSV, webhook test (SSRF block), generate key, analytics, providers — semua hijau (lihat catatan di chat).

### Batch 2 (sesi lanjutan)

- **Endpoint backend baru**:
  - `POST /api/keys/:id/rotate` — generate ulang secret untuk key yang sama, naikkan `version`, audit `key.rotate`.
  - `GET /api/keys/expiring?days=N` — daftar key aktif yang habis dalam N hari (default 7, max 90).
  - `GET /api/analytics/timeseries?days=N` — keysCreated + validations per-tanggal (max 365 hari).
  - `GET /api/system/info` — versi node, uptime, latensi DB (`SELECT 1`), memori; admin dapat platform/arch/pid.
  - `POST /api/admin/prune` — admin only, hapus `validation_history` > N hari (default 90, min 7) & `audit_logs` > N hari (default 365, min 30).
- **Hardening**:
  - Per-user rate-limit (gabungan session + IP via `ipKeyGenerator`): `/api/validate` 30/min, `/api/keys|scheduled|webhooks` mutasi 60/min.
  - Log redaction (pino `redact`): authorization/cookie headers, body `password|currentPassword|newPassword|fullKey|key|apiKey|token`, dan query string `token|key|password|apiKey|secret|authorization` di URL.
  - CORS env-driven via `CORS_ORIGINS` (comma-separated); fallback `*` untuk dev.
  - `x-request-id` di-echo ke response header untuk debugging end-to-end.
- **Frontend**:
  - Halaman `/system` (sidebar item baru "System") dengan card DB/uptime/memory/runtime, auto-refresh 10 detik.
  - Tabel keys: kolom TTL (badge berwarna by horizon), checkbox multi-select dengan toolbar bulk Archive/Revoke.
  - Tombol **Rotate** di per-row menu — minta konfirmasi, panggil endpoint baru, copy hasil ke clipboard.
  - Semua aksi destruktif (delete/revoke/archive/rotate + bulk) pakai `AlertDialog` (no native `confirm()` lagi).
  - Dashboard menampilkan card "Keys Expiring Soon" (14 hari) dengan badge `days` & link langsung ke detail key.

## Frontend Pages (all improved)

- `generate.tsx` — format selector (uuid/hex/base64/alphanumeric), length, custom prefix, expiry, rate limit, environment; shows full key + entropy bar + copy button after generation
- `validate.tsx` — 3-tab layout: Single validation, Batch validation (up to 20 keys, sequential), History table with status colors + response time bars
- `notifications.tsx` — real list from API, mark-one/mark-all read, type icons
- `environments.tsx` — full CRUD: create with color picker, delete on hover, empty state
- `keys/[id].tsx` — 3-tab layout: Detail (prefix/suffix/stats), Riwayat (validation history), Tags (add/remove inline)

## Batch 3 (sesi lanjutan)

- **Endpoint backend baru**:
  - `GET /api/providers/templates` — daftar 15 provider built-in (curated) untuk one-click add.
  - `POST /api/providers/import` — batch import providers `{ providers: [...] }` dengan `onConflictDoNothing`, return `{ imported, skipped, errors }`.
  - `GET /api/environments/:id/keys` — daftar 500 key teratas per environment (id, name, provider, status, prefix, expiresAt).
  - `GET /api/system/metrics` — text/plain Prometheus exposition (`hamkeygen_up`, `db_up`, `db_latency_ms`, `uptime_seconds`, `memory_bytes`, `keys_total`, `validations_total`, `audit_logs_total`).
- **Tooling**:
  - `pnpm --filter @workspace/scripts run reset-admin` — reset/buat ulang user admin (`ADMIN_USERNAME`, `ADMIN_PASSWORD`, `ADMIN_DISPLAY` env-overridable).
- **Frontend**:
  - Top bar: indikator backend `online/offline/checking` (poll `/api/readyz` tiap 30 detik + listener `online/offline`) + avatar inisial user.
  - Notifikasi auto-refresh 60 detik (`refetchInterval`) + refetch on focus.
  - Halaman Providers: section "Add from template" — tombol per template yang belum ter-install, panggil `/providers/import` lalu invalidate query.
  - Halaman Key Detail: breadcrumb (`Dashboard › API Keys › <name>`) sebelum header.

## Backend Fix: validateKeyAgainstProvider

`providers.ts` `buildRequestParams()` now correctly handles:
- `"Authorization: Bearer"` → `Authorization: Bearer <key>` header
- `"query"` → key appended to URL query param (Gemini pattern)
- Plain header name (e.g. `"x-api-key"`) → direct header

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
