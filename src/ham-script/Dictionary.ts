export enum TokenType {
  // Single-character tokens
  LPAREN, RPAREN, LBRACE, RBRACE,
  COMMA, DOT, MINUS, PLUS, SEMICOLON, SLASH, STAR,

  // One or two character tokens
  BANG, BANG_EQUAL,
  EQUAL, EQUAL_EQUAL,
  GREATER, GREATER_EQUAL,
  LESS, LESS_EQUAL,

  // Literals
  IDENTIFIER, STRING, NUMBER,

  // Keywords (Internal/Universal)
  AND, CLASS, ELSE, FALSE, FUNC, FOR, IF, NULL, OR,
  PRINT, RETURN, SUPER, THIS, TRUE, VAR, WHILE,

  EOF
}

export interface Token {
  type: TokenType;
  lexeme: string;
  literal: any;
  line: number;
}

// Kamus Multi-Bahasa HAM-Script
export const HamScriptDictionary: Record<string, Record<string, TokenType>> = {
  "ID": { // Bahasa Indonesia
    "dan": TokenType.AND,
    "kelas": TokenType.CLASS,
    "lain": TokenType.ELSE,
    "salah": TokenType.FALSE,
    "tugas": TokenType.FUNC,
    "untuk": TokenType.FOR,
    "jika": TokenType.IF,
    "kosong": TokenType.NULL,
    "atau": TokenType.OR,
    "cetak": TokenType.PRINT,
    "kembali": TokenType.RETURN,
    "super": TokenType.SUPER,
    "ini": TokenType.THIS,
    "benar": TokenType.TRUE,
    "simpan": TokenType.VAR,
    "selama": TokenType.WHILE,
  },
  "EN": { // English
    "and": TokenType.AND,
    "class": TokenType.CLASS,
    "else": TokenType.ELSE,
    "false": TokenType.FALSE,
    "func": TokenType.FUNC,
    "for": TokenType.FOR,
    "if": TokenType.IF,
    "null": TokenType.NULL,
    "or": TokenType.OR,
    "print": TokenType.PRINT,
    "return": TokenType.RETURN,
    "super": TokenType.SUPER,
    "this": TokenType.THIS,
    "true": TokenType.TRUE,
    "var": TokenType.VAR,
    "while": TokenType.WHILE,
  }
};
