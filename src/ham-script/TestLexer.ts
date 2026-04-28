 
import { Lexer } from './Lexer';

// Contoh penggunaan sederhana untuk menguji Lexer
export function testHamScriptLexer() {
  const kodeIndonesia = `
    // Ini adalah program pertama HAM-Script
    simpan nama = "HAM OS";
    jika (nama == "HAM OS") {
      cetak "Sistem Aktif!";
    }
  `;

  const kodeInggris = `
    // This is the first HAM-Script program
    var nama = "HAM OS";
    if (nama == "HAM OS") {
      print "System Active!";
    }
  `;

  console.log("--- MENGUJI LEXER (BAHASA INDONESIA) ---");
  const lexerID = new Lexer(kodeIndonesia, "ID");
  console.log(lexerID.scanTokens());

  console.log("\n--- MENGUJI LEXER (BAHASA INGGRIS) ---");
  const lexerEN = new Lexer(kodeInggris, "EN");
  console.log(lexerEN.scanTokens());
}
