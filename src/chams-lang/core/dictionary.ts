 
import { Opcode, ChamsLanguage } from './types';

// ============================================================================
// cHams V5.5: THE OMNI-DICTIONARY
// ============================================================================

/**
 * Lexer Dictionary: Maps human text to Machine Opcodes.
 * AI always uses 'EN' for maximum token efficiency.
 */
export const LexerDictionary: Record<ChamsLanguage, Record<string, Opcode>> = {
    EN: {
        "if": Opcode.IF,
        "else": Opcode.ELSE,
        "while": Opcode.WHILE,
        "for": Opcode.FOR,
        "break": Opcode.BREAK,
        "continue": Opcode.CONTINUE,
        "return": Opcode.RETURN,
        "throw": Opcode.THROW,
        "try": Opcode.TRY,
        "catch": Opcode.CATCH,
        "finally": Opcode.FINALLY,
        "switch": Opcode.SWITCH,
        "case": Opcode.ELSE, // Case is handled in switch
        "default": Opcode.ELSE, // Default is handled in switch
        "let": Opcode.LET,
        "const": Opcode.CONST,
        "reactive": Opcode.REACTIVE,
        "func": Opcode.FUNC,
        "class": Opcode.CLASS,
        "extends": Opcode.EXTENDS,
        "new": Opcode.NEW,
        "this": Opcode.THIS,
        "super": Opcode.SUPER,
        "import": Opcode.IMPORT,
        "export": Opcode.EXPORT,
        "type": Opcode.TYPE_DECL,
        "interface": Opcode.INTERFACE_DECL,
        "async": Opcode.ASYNC,
        "await": Opcode.AWAIT,
        "parallel": Opcode.PARALLEL,
        "print": Opcode.PRINT,
        "os": Opcode.OS_CALL,
        "true": Opcode.TRUE,
        "false": Opcode.FALSE,
        "null": Opcode.NULL,
        "bind": Opcode.BIND
    },
    ID: {
        "jika": Opcode.IF,
        "lain": Opcode.ELSE,
        "selama": Opcode.WHILE,
        "untuk": Opcode.FOR,
        "henti": Opcode.BREAK,
        "lanjut": Opcode.CONTINUE,
        "kembali": Opcode.RETURN,
        "lempar": Opcode.THROW,
        "coba": Opcode.TRY,
        "tangkap": Opcode.CATCH,
        "akhirnya": Opcode.FINALLY,
        "pilih": Opcode.SWITCH,
        "simpan": Opcode.LET,
        "tetap": Opcode.CONST,
        "reaktif": Opcode.REACTIVE,
        "tugas": Opcode.FUNC,
        "kelas": Opcode.CLASS,
        "turunan": Opcode.EXTENDS,
        "baru": Opcode.NEW,
        "ini": Opcode.THIS,
        "induk": Opcode.SUPER,
        "impor": Opcode.IMPORT,
        "ekspor": Opcode.EXPORT,
        "tipe": Opcode.TYPE_DECL,
        "antarmuka": Opcode.INTERFACE_DECL,
        "asinkron": Opcode.ASYNC,
        "tunggu": Opcode.AWAIT,
        "paralel": Opcode.PARALLEL,
        "cetak": Opcode.PRINT,
        "sistem": Opcode.OS_CALL,
        "benar": Opcode.TRUE,
        "salah": Opcode.FALSE,
        "kosong": Opcode.NULL,
        "sambung": Opcode.BIND
    },
    JP: {
        "moshi": Opcode.IF,
        "hoka": Opcode.ELSE,
        "nagara": Opcode.WHILE,
        "kurikaesu": Opcode.FOR,
        "yameru": Opcode.BREAK,
        "tsuzuku": Opcode.CONTINUE,
        "modoru": Opcode.RETURN,
        "nageru": Opcode.THROW,
        "tamesu": Opcode.TRY,
        "tsukamaeru": Opcode.CATCH,
        "saigoni": Opcode.FINALLY,
        "sentaku": Opcode.SWITCH,
        "kioku": Opcode.LET,
        "fuen": Opcode.CONST,
        "hannou": Opcode.REACTIVE,
        "kansu": Opcode.FUNC,
        "kurasu": Opcode.CLASS,
        "kakucho": Opcode.EXTENDS,
        "atarashii": Opcode.NEW,
        "kore": Opcode.THIS,
        "oyabun": Opcode.SUPER,
        "yunyu": Opcode.IMPORT,
        "yushutsu": Opcode.EXPORT,
        "kata": Opcode.TYPE_DECL,
        "setsuzoku": Opcode.INTERFACE_DECL,
        "hidoki": Opcode.ASYNC,
        "matsu": Opcode.AWAIT,
        "heiretsu": Opcode.PARALLEL,
        "hyoji": Opcode.PRINT,
        "kiban": Opcode.OS_CALL,
        "tadashii": Opcode.TRUE,
        "machigai": Opcode.FALSE,
        "mu": Opcode.NULL,
        "tsunagu": Opcode.BIND
    }
};

/**
 * De-Parser Dictionary: Maps Machine Opcodes back to human text.
 * Used for real-time Holographic Translation.
 */
export const DeparserDictionary: Record<ChamsLanguage, Record<number, string>> = {
    EN: {},
    ID: {},
    JP: {}
};

// Auto-generate the Reverse Dictionary (De-Parser) to ensure 100% sync and zero errors.
function buildReverseDictionary() {
    const languages: ChamsLanguage[] = ['EN', 'ID', 'JP'];
    
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
        DeparserDictionary[lang][Opcode.GT] = ">";
        DeparserDictionary[lang][Opcode.LT] = "<";
        DeparserDictionary[lang][Opcode.GTE] = ">=";
        DeparserDictionary[lang][Opcode.LTE] = "<=";
        DeparserDictionary[lang][Opcode.AND] = "&&";
        DeparserDictionary[lang][Opcode.OR] = "||";
        DeparserDictionary[lang][Opcode.ASSIGN] = "=";
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
    "%": Opcode.MOD,
    "**": Opcode.EXP,
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
    "!": Opcode.NOT,
    "??": Opcode.NULLISH,
    "|": Opcode.BIT_OR,
    "^": Opcode.BIT_XOR,
    "&": Opcode.BIT_AND,
    "<<": Opcode.BIT_LSHIFT,
    ">>": Opcode.BIT_RSHIFT,
    "=": Opcode.ASSIGN,
    "+=": Opcode.ADD_ASSIGN,
    "-=": Opcode.SUB_ASSIGN,
    "*=": Opcode.MUL_ASSIGN,
    "/=": Opcode.DIV_ASSIGN,
    "%=": Opcode.MOD_ASSIGN,
    "++": Opcode.INC,
    "--": Opcode.DEC,
    "...": Opcode.SPREAD,
    "->": Opcode.BIND
};
