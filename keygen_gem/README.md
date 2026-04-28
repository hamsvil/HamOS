# 🔑 Keygen Gemini (Singularity Engine)

Folder ini berisi logika otonom untuk pembuatan dan validasi mockup API Key Gemini.

## Unit Komponen:
1.  **`generator.ts`**: Mesin inti yang menghasilkan string acak dengan prefix `AIza`.
2.  **`validator.ts`** [BARU]: Sensor validasi yang melakukan "Ping" ke Google API untuk memverifikasi apakah key tersebut aktif dan valid.
3.  **`agent.ts`**: Agen digital yang kini dilengkapi dengan filter cerdas. Ia hanya akan menyimpan key ke `valid_keys.log` jika lolos uji validasi.

## [PENTING] Deklarasi Teknis & Validasi:
Agen menggunakan Protokol **Gold Standard Filter**:
- Setiap key yang di-generate akan diuji langsung ke endpoint `generativelanguage.googleapis.com`.
- **`valid_keys.log`**: Hanya berisi key yang mendapatkan respon `HTTP 200 (OK)`.
- **`keygen_attempts.log`**: Mencatat semua percobaan, termasuk alasan kegagalan (misal: `401 API_KEY_INVALID`).

Untuk mendapatkan kunci asli, Anda tetap harus melalui [Google AI Studio](https://aistudio.google.com/).

## Cara Menjalankan:
Import `GeminiGeneratorAgent` dari `agent.ts` dan panggil `agent.start24hProcess()`.
Hasil generasi akan dicatat secara real-time di `/logs/keygen_gemini.log`.

---
*Generated under Agentic Supreme Protocol.*
