 
import { Opcode, HamEngineLanguage } from './types';

// ============================================================================
// Ham Engine V5.5: THE OMNI-DICTIONARY
// ============================================================================

/**
 * Lexer Dictionary: Maps human text to Machine Opcodes.
 * AI always uses 'EN' for maximum token efficiency.
 */
export const LexerDictionary: Record<HamEngineLanguage, Record<string, Opcode>> = {
    EN: {
        "if": Opcode.IF,
        "else": Opcode.ELSE,
        "while": Opcode.WHILE,
        "for": Opcode.FOR,
        "break": Opcode.BREAK,
        "continue": Opcode.CONTINUE,
        "try": Opcode.TRY,
        "catch": Opcode.CATCH,
        "finally": Opcode.FINALLY,
        "import": Opcode.IMPORT,
        "export": Opcode.EXPORT,
        "parallel": Opcode.PARALLEL,
        "bind": Opcode.BIND,
        "func": Opcode.FUNC,
        "function": Opcode.FUNC,
        "call": Opcode.CALL,
        "return": Opcode.RETURN,
        "let": Opcode.LET,
        "var": Opcode.LET,
        "const": Opcode.CONST,
        "typeof": Opcode.TYPEOF,
        "print": Opcode.PRINT,
        "os": Opcode.OS_CALL,
        "class": Opcode.CLASS,
        "new": Opcode.NEW,
        "this": Opcode.THIS,
        "super": Opcode.SUPER,
        "extends": Opcode.EXTENDS,
        "static": Opcode.STATIC,
        "public": Opcode.PUBLIC,
        "private": Opcode.PRIVATE,
        "protected": Opcode.PROTECTED,
        "true": Opcode.TRUE,
        "false": Opcode.FALSE,
        "null": Opcode.NULL,
        "throw": Opcode.THROW,
        "switch": Opcode.SWITCH,
        "case": Opcode.CASE,
        "default": Opcode.DEFAULT,
        "of": Opcode.OF,
        "in": Opcode.IN,
        "async": Opcode.ASYNC,
        "await": Opcode.AWAIT,
        "reactive": Opcode.REACTIVE,
        "type": Opcode.TYPE_DECL,
        "interface": Opcode.INTERFACE_DECL
    },
    ID: {
        "jika": Opcode.IF,
        "lain": Opcode.ELSE,
        "selama": Opcode.WHILE,
        "untuk": Opcode.FOR,
        "berhenti": Opcode.BREAK,
        "lanjut": Opcode.CONTINUE,
        "coba": Opcode.TRY,
        "tangkap": Opcode.CATCH,
        "akhirnya": Opcode.FINALLY,
        "impor": Opcode.IMPORT,
        "ekspor": Opcode.EXPORT,
        "paralel": Opcode.PARALLEL,
        "sambung": Opcode.BIND,
        "tugas": Opcode.FUNC,
        "panggil": Opcode.CALL,
        "kembali": Opcode.RETURN,
        "simpan": Opcode.LET,
        "tetap": Opcode.CONST,
        "tipe": Opcode.TYPEOF,
        "cetak": Opcode.PRINT,
        "sistem": Opcode.OS_CALL,
        "kelas": Opcode.CLASS,
        "baru": Opcode.NEW,
        "ini": Opcode.THIS,
        "super": Opcode.SUPER,
        "turunan": Opcode.EXTENDS,
        "statis": Opcode.STATIC,
        "publik": Opcode.PUBLIC,
        "privat": Opcode.PRIVATE,
        "terlindungi": Opcode.PROTECTED,
        "benar": Opcode.TRUE,
        "salah": Opcode.FALSE,
        "kosong": Opcode.NULL,
        "lempar": Opcode.THROW,
        "pilih": Opcode.SWITCH,
        "kasus": Opcode.CASE,
        "bawaan": Opcode.DEFAULT,
        "dari": Opcode.OF,
        "dalam": Opcode.IN,
        "asinkron": Opcode.ASYNC,
        "tunggu": Opcode.AWAIT,
        "reaktif": Opcode.REACTIVE,
        "tipe_decl": Opcode.TYPE_DECL,
        "antarmuka": Opcode.INTERFACE_DECL
    },
    JP: {
        "moshi": Opcode.IF,
        "hoka": Opcode.ELSE,
        "nagara": Opcode.WHILE,
        "tame": Opcode.FOR,
        "yameru": Opcode.BREAK,
        "tsuzukeru": Opcode.CONTINUE,
        "tamesu": Opcode.TRY,
        "tsukamaeru": Opcode.CATCH,
        "saigoni": Opcode.FINALLY,
        "yunyu": Opcode.IMPORT,
        "yushutsu": Opcode.EXPORT,
        "heiko": Opcode.PARALLEL,
        "tsunagu": Opcode.BIND,
        "kansu": Opcode.FUNC,
        "yobu": Opcode.CALL,
        "modoru": Opcode.RETURN,
        "kioku": Opcode.LET,
        "fuhen": Opcode.CONST,
        "kata": Opcode.TYPEOF,
        "hyoji": Opcode.PRINT,
        "kiban": Opcode.OS_CALL,
        "kurasu": Opcode.CLASS,
        "atarashii": Opcode.NEW,
        "kore": Opcode.THIS,
        "chou": Opcode.SUPER,
        "kakuchou": Opcode.EXTENDS,
        "seiteki": Opcode.STATIC,
        "koukai": Opcode.PUBLIC,
        "himitsu": Opcode.PRIVATE,
        "hogosumi": Opcode.PROTECTED,
        "honto": Opcode.TRUE,
        "uso": Opcode.FALSE,
        "mu": Opcode.NULL,
        "nageru": Opcode.THROW,
        "erabu": Opcode.SWITCH,
        "baai": Opcode.CASE,
        "kihon": Opcode.DEFAULT,
        "no": Opcode.OF,
        "naka": Opcode.IN,
        "hidouki": Opcode.ASYNC,
        "matsu": Opcode.AWAIT,
        "hannou": Opcode.REACTIVE,
        "kata_decl": Opcode.TYPE_DECL,
        "kyoukai": Opcode.INTERFACE_DECL
    }
};

/**
 * De-Parser Dictionary: Maps Machine Opcodes back to human text.
 * Used for real-time Holographic Translation.
 */
export const DeparserDictionary: Record<HamEngineLanguage, Record<number, string>> = {
    EN: {},
    ID: {},
    JP: {}
};

// Auto-generate the Reverse Dictionary (De-Parser) to ensure 100% sync and zero errors.
function buildReverseDictionary() {
    const languages: HamEngineLanguage[] = ['EN', 'ID', 'JP'];
    
    for (const lang of languages) {
        const forwardDict = LexerDictionary[lang];
        for (const [word, opcode] of Object.entries(forwardDict)) {
            DeparserDictionary[lang][opcode] = word;
        }
        
        // Add operator string representations (Universal across languages)
        DeparserDictionary[lang][Opcode.ADD] = "+";
        DeparserDictionary[lang][Opcode.SUB] = "-";
        DeparserDictionary[lang][Opcode.MUL] = "*";
        DeparserDictionary[lang][Opcode.DIV] = "/";
        DeparserDictionary[lang][Opcode.EQ] = "==";
        DeparserDictionary[lang][Opcode.NEQ] = "!=";
        DeparserDictionary[lang][Opcode.STRICT_EQ] = "===";
        DeparserDictionary[lang][Opcode.STRICT_NEQ] = "!==";
        DeparserDictionary[lang][Opcode.GT] = ">";
        DeparserDictionary[lang][Opcode.LT] = "<";
        DeparserDictionary[lang][Opcode.GTE] = ">=";
        DeparserDictionary[lang][Opcode.LTE] = "<=";
        DeparserDictionary[lang][Opcode.AND] = "&&";
        DeparserDictionary[lang][Opcode.OR] = "||";
        DeparserDictionary[lang][Opcode.ASSIGN] = "=";
        DeparserDictionary[lang][Opcode.MOD] = "%";
        DeparserDictionary[lang][Opcode.BIT_AND] = "&";
        DeparserDictionary[lang][Opcode.BIT_OR] = "|";
        DeparserDictionary[lang][Opcode.BIT_XOR] = "^";
        DeparserDictionary[lang][Opcode.BIT_LSHIFT] = "<<";
        DeparserDictionary[lang][Opcode.BIT_RSHIFT] = ">>";
        DeparserDictionary[lang][Opcode.ADD_ASSIGN] = "+=";
        DeparserDictionary[lang][Opcode.SUB_ASSIGN] = "-=";
        DeparserDictionary[lang][Opcode.MUL_ASSIGN] = "*=";
        DeparserDictionary[lang][Opcode.DIV_ASSIGN] = "/=";
        DeparserDictionary[lang][Opcode.MOD_ASSIGN] = "%=";
        DeparserDictionary[lang][Opcode.NOT] = "!";
        DeparserDictionary[lang][Opcode.TYPEOF] = "typeof";
        DeparserDictionary[lang][Opcode.INC] = "++";
        DeparserDictionary[lang][Opcode.DEC] = "--";
        DeparserDictionary[lang][Opcode.ARROW] = "=>";
        DeparserDictionary[lang][Opcode.EXP] = "**";
    }
}

// Initialize reverse mapping immediately
buildReverseDictionary();

/**
 * Operator Dictionary: Maps symbols to Opcodes.
 * These are universal and language-agnostic.
 */
export const OperatorDictionary: Record<string, Opcode> = {
    "+": Opcode.ADD,
    "-": Opcode.SUB,
    "*": Opcode.MUL,
    "/": Opcode.DIV,
    "==": Opcode.EQ,
    "!=": Opcode.NEQ,
    "===": Opcode.STRICT_EQ,
    "!==": Opcode.STRICT_NEQ,
    ">": Opcode.GT,
    "<": Opcode.LT,
    ">=": Opcode.GTE,
    "<=": Opcode.LTE,
    "&&": Opcode.AND,
    "||": Opcode.OR,
    "=": Opcode.ASSIGN,
    "%": Opcode.MOD,
    "&": Opcode.BIT_AND,
    "|": Opcode.BIT_OR,
    "^": Opcode.BIT_XOR,
    "!": Opcode.NOT,
    "typeof": Opcode.TYPEOF,
    "<<": Opcode.BIT_LSHIFT,
    ">>": Opcode.BIT_RSHIFT,
    "+=": Opcode.ADD_ASSIGN,
    "-=": Opcode.SUB_ASSIGN,
    "*=": Opcode.MUL_ASSIGN,
    "/=": Opcode.DIV_ASSIGN,
    "%=": Opcode.MOD_ASSIGN,
    "++": Opcode.INC,
    "--": Opcode.DEC,
    "=>": Opcode.ARROW,
    "**": Opcode.EXP,
    "...": Opcode.SPREAD,
    "?.": Opcode.OPTIONAL_CHAIN,
    "??": Opcode.NULLISH
};
