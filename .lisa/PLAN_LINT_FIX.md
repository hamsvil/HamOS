# PLAN_LINT_FIX - Perbaikan Error TypeScript Pre-existing

## Analisis Baseline
- **Total Error**: ~118 error (berdasarkan output `npm run lint`)
- **Kategori Utama**:
  1. **Missing Module/Types (TS2307, TS2664)**: Mayoritas di `src/_archive/` (wouter, tanstack-query, firebase, dll).
  2. **Property Missing (TS2339)**: Error `session` pada `Request` express (missing express-session types).
  3. **Module Member Missing (TS2305, TS2724)**: `lucide-react` (Github, Twitter, dll) dan `react-resizable-panels`.
  4. **Reference Error (TS2304)**: `useMemo` tidak di-import di `AgentWorker.tsx`.
  5. **Type Incompatibility (TS2344, TS2352)**: Error di `chart.tsx` dan `agent-tools.ts`.

## Strategi Prioritas
1. **Fokus**: File server aktif dan komponen UI di `src/` (bukan archive).
2. **Skip**: Semua file di `src/_archive/` (meskipun muncul di lint, fokus kita adalah stabilitas sistem aktif). *Catatan: tsconfig.json sudah mencoba exclude archive tapi sepertinya tsc tetap memprosesnya karena di-import atau include pattern.*
3. **Metode**: Perbaikan melalui penambahan type definitions, import yang hilang, atau penyesuaian kode.

---

## Rencana Kerja

### 1. Perbaikan Import useMemo di AgentWorker
- **APA**: Menambahkan import `useMemo` dari 'react' di `src/components/AgentWorker/AgentWorker.tsx`.
- **MENGAPA**: Terjadi error `TS2304: Cannot find name 'useMemo'`.
- **BAGAIMANA**: Edit file `src/components/AgentWorker/AgentWorker.tsx` untuk menyertakan `useMemo` dalam import React.

### 2. Resolusi Error Lucide-React (Missing Members)
- **APA**: Mengganti atau memperbaiki import icon yang dianggap hilang (Github, Twitter, Facebook, Instagram, Linkedin, Youtube).
- **MENGAPA**: Error `TS2305: Module '"lucide-react"' has no exported member '...'`. Ini kemungkinan karena versi library atau typo (misal: `Github` vs `GithubIcon` atau memang tidak ada di versi terpasang).
- **BAGAIMANA**: Cek `src/components/HamAiStudio/Deployment/DeploymentModal.tsx`, `src/components/HamAiStudio/Settings/IntegrationsSettings.tsx`, `src/features/SocialWorker/index.tsx`, dll. Gunakan icon yang tersedia atau sesuaikan penamaan.

### 3. Resolusi Error React-Resizable-Panels
- **APA**: Memperbaiki import `PanelGroup` dan `PanelResizeHandle` di `src/components/HamAiStudio/TerminalEmulator/TerminalEmulator_Part1.tsx`.
- **MENGAPA**: Error `TS2724/TS2305` menyatakan member tersebut tidak ditemukan. Kemungkinan perubahan API pada library `react-resizable-panels`.
- **BAGAIMANA**: Periksa dokumentasi versi terpasang (v4.10.0 di package.json) dan sesuaikan import.

### 4. Penanganan Error Firebase (Missing Types)
- **APA**: Memastikan type definitions untuk firebase tersedia atau memperbaiki cara import.
- **MENGAPA**: Error `TS2307: Cannot find module 'firebase/app'`.
- **BAGAIMANA**: Edit `src/lib/firebase.ts`. Karena `firebase` ada di `package.json` (melalui dependencies tak langsung atau memang dibutuhkan), pastikan cara import sesuai dengan Firebase v9+ (modular).

### 5. Optimasi tsconfig.json untuk Benar-benar Mengabaikan Archive
- **APA**: Memperketat `exclude` di `tsconfig.json` agar `src/_archive` benar-benar tidak diproses oleh `tsc`.
- **MENGAPA**: Meskipun sudah ada di exclude, error dari archive masih memenuhi output lint, menyulitkan monitoring error di file aktif.
- **BAGAIMANA**: Pastikan path di `exclude` tsconfig sesuai dan tidak ada file aktif yang meng-import dari archive.

## Kriteria PASS
- Tidak ada error **BARU**.
- Total error berkurang minimal 20% dari baseline (~24 error berkurang).
- `npm run lint` berjalan lebih cepat dan output lebih bersih dari file non-aktif.
