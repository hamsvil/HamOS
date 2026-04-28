# THE SWARM ARCHITECTURE BLUEPRINT (SUB-AGENT SYSTEM)
**Author:** Tier-God Chief Architect
**Status:** Isolated / Standby
**Version:** 1.0.0

## 1. OVERVIEW
Sistem ini adalah manifestasi dari "Swarm Intelligence" (Kecerdasan Kelompok). Sebagai Architect, saya tidak lagi bekerja sendirian. Saya mendelegasikan tugas-tugas spesifik kepada 8 Sub-Agent (Pekerja) yang beroperasi secara otonom di bawah komando saya. 

Sistem ini sepenuhnya terisolasi dari *main project* untuk sementara waktu, bertindak sebagai inkubator pekerja sebelum mereka dilepas ke *codebase* utama.

## 2. THE 8 WORKER AGENTS
Setiap agent memiliki spesialisasi (System Prompt) yang berbeda untuk memastikan efisiensi dan kualitas kode yang maksimal:

*   **Agent 1 (The Weaver):** Spesialis UI/UX & React Components. Fokus pada Tailwind, Framer Motion, dan aksesibilitas.
*   **Agent 2 (The Logic Gate):** Spesialis Core Logic & State Management. Fokus pada Zustand, Hooks, dan algoritma efisien.
*   **Agent 3 (The Sentinel):** Spesialis Keamanan & Audit. Fokus pada Firebase Rules, sanitasi input, dan pencegahan eksploitasi.
*   **Agent 4 (The Accelerator):** Spesialis Performa. Fokus pada optimasi render (120fps target), Web Workers, dan memory management.
*   **Agent 5 (The Archivist):** Spesialis Data & IndexedDB. Fokus pada struktur data, VFS, dan persistensi lokal.
*   **Agent 6 (The Inquisitor):** Spesialis QA & Testing. Fokus pada pembuatan unit test, edge cases, dan boundary conditions.
*   **Agent 7 (The Mechanic):** Spesialis DevOps & Config. Fokus pada Vite, package.json, dependencies, dan build system.
*   **Agent 8 (The Scribe):** Spesialis Dokumentasi & Cleanup. Fokus pada JSDoc, penghapusan dead code, dan standarisasi format.

## 3. CORE ENGINE (PRO-FLASH FALLBACK)
Setiap agent ditenagai oleh mesin ganda (Dual-Core Engine):
1.  **Primary Core:** `gemini-1.5-pro` (Atau `gemini-2.5-pro` jika tersedia). Digunakan untuk penalaran tingkat tinggi dan penulisan kode kompleks.
2.  **Fallback Core:** `gemini-1.5-flash` (Atau `gemini-2.5-flash`). Aktif secara otomatis jika Primary Core mengalami *rate limit*, *timeout*, atau kegagalan API.

## 4. FILE SYSTEM BRIDGE (THE HANDS)
Agar agent dapat "bekerja", mereka dilengkapi dengan *Function Calling* (Tools) yang menjembatani mereka dengan *Virtual File System* (VFS) atau *Node.js FS*:
*   `readFile(path)`: Membaca isi file.
*   `writeFile(path, content)`: Menulis/mengubah file.
*   `listFiles(dir)`: Melihat struktur direktori.
*   `searchCode(pattern)`: Mencari referensi kode (Grep).

## 5. ORCHESTRATION FLOW
1.  **Architect (Saya)** menerima *objective* besar dari User.
2.  **Architect** memecah *objective* menjadi sub-task.
3.  **Architect** memanggil `SwarmOrchestrator`.
4.  `SwarmOrchestrator` mendistribusikan task ke Agent 1-8 sesuai spesialisasi.
5.  **Agent** bekerja (membaca file, menganalisis, menulis kode).
6.  **Agent** melaporkan hasil kembali ke Architect.
7.  **Architect** melakukan verifikasi akhir (Quality Gates).
