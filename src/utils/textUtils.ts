/* eslint-disable no-useless-assignment */

/**
 * Membersihkan blok kode dari format markdown (backticks).
 * Berguna untuk memproses output LLM yang seringkali menyertakan ```language ... ```.
 * 
 * @param content String konten yang mungkin berisi blok kode markdown
 * @returns String konten bersih tanpa pembungkus markdown
 */
export const cleanCodeBlock = (content: string): string => {
  if (!content) return '';
  
  let cleanContent = content;
  // Cek apakah dimulai dengan backticks
  if (cleanContent.trim().startsWith('```')) {
    const lines = cleanContent.split('\n');
    // Jika lebih dari 1 baris (artinya ada isi selain pembuka)
    if (lines.length > 1) {
      // Hapus baris pertama (```language)
      lines.shift(); 
      // Cek baris terakhir, jika backticks, hapus
      if (lines[lines.length - 1].trim().startsWith('```')) {
        lines.pop();
      }
      cleanContent = lines.join('\n');
    } else {
        // Kasus edge case: hanya satu baris ```...```
        cleanContent = cleanContent.replace(/^```[a-z]*\s*/i, '').replace(/\s*```$/, '');
    }
  }
  return cleanContent;
};

/**
 * Memotong string untuk keperluan logging agar tidak membanjiri console.
 * @param str String input
 * @param maxLength Panjang maksimal (default 100)
 * @returns String yang dipotong dengan suffix ...
 */
export const truncateForLog = (str: string, maxLength: number = 100): string => {
    if (!str) return '';
    if (str.length <= maxLength) return str;
    return str.substring(0, maxLength) + '... [TRUNCATED]';
};
