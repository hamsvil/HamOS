// ============================================================================
// cHams V5.5: THE OMNI-DNA (CORE TYPES)
// ============================================================================

/**
 * Opcode (Operation Code)
 * The fundamental atomic units of the cHams language.
 * Stored as integers to maximize storage efficiency and execution speed.
 */
export enum Opcode {
    // 0x00 - 0x0F: Core Logic & Control Flow
    IF = 1,
    ELSE = 2,
    BIND = 3,       // Reactive Stream Binding (A -> B)
    FUNC = 4,       // Function Definition
    CALL = 5,       // Function Execution
    RETURN = 6,
    WHILE = 7,      // While Loop
    FOR = 8,
    FOR_OF = 9,
    FOR_IN = 10,
    BREAK = 11,
    CONTINUE = 12,
    THROW = 13,
    TRY = 14,
    SWITCH = 15,
    
    // 0x10 - 0x1F: Memory & Variables
    LET = 16,       // Variable Declaration
    ASSIGN = 17,    // Variable Assignment
    ARRAY = 18,     // Array Literal
    OBJECT = 19,    // Object Literal
    GET = 20,       // Property/Index Access
    SET = 21,       // Property/Index Assignment
    CONST = 22,
    REACTIVE = 23,
    ADD_ASSIGN = 24,
    SUB_ASSIGN = 25,
    MUL_ASSIGN = 26,
    DIV_ASSIGN = 27,
    MOD_ASSIGN = 28,
    
    // 0x20 - 0x2F: I/O & Primitives
    PRINT = 32,     // Standard Output
    TRUE = 33,
    FALSE = 34,
    NULL = 35,
    THIS = 36,
    SUPER = 37,
    
    // 0x30 - 0x4F: Operators
    ADD = 48,
    SUB = 49,
    MUL = 50,
    DIV = 51,
    EQ = 52,        // ==
    NEQ = 53,       // !=
    GT = 54,        // >
    LT = 55,        // <
    GTE = 56,       // >=
    LTE = 57,       // <=
    AND = 58,       // &&
    OR = 59,        // ||
    MOD = 60,
    EXP = 61,
    STRICT_EQ = 62,
    STRICT_NEQ = 63,
    TERNARY = 64,
    NULLISH = 65,
    BIT_OR = 66,
    BIT_XOR = 67,
    BIT_AND = 68,
    BIT_LSHIFT = 69,
    BIT_RSHIFT = 70,

    // 0x50 - 0x5F: Unary & Meta
    NOT = 80,
    TYPEOF = 81,
    INC = 82,
    DEC = 83,
    SPREAD = 84,
    AWAIT = 85,
    ASYNC = 86,
    ARROW = 87,
    NEW = 88,
    OPTIONAL_CHAIN = 89,

    // 0x60 - 0x6F: Modules & Types
    IMPORT = 96,
    EXPORT = 97,
    TYPE_DECL = 98,
    INTERFACE_DECL = 99,
    CLASS = 100,
    
    // 0x70 - 0x7F: Blocks & Exceptions
    BLOCK = 112,
    EXTENDS = 113,
    CATCH = 114,
    FINALLY = 115,
    
    // 0xF0 - 0xFF: System & Meta
    OS_CALL = 240,  // Call to HAM OS God-Primitives
    PARALLEL = 241,
    EOF = 255       // End of File / Stream
}

/**
 * OmniAST (Abstract Syntax Tuple)
 * The JSON representation of cHams code. 
 * Format: [Opcode, Argument1, Argument2, ...]
 * Example: [Opcode.IF, [Opcode.GT, "x", 5], [Opcode.PRINT, "Hello"]]
 */
export type OmniASTNode = 
    | [Opcode, ...OmniASTNode[]] // Tuple format
    | { type: Opcode; args: OmniASTNode[]; loc?: { line: number; column: number } } // Object format
    | OmniASTNode[]      // Block
    | string             // Identifier/String
    | number             // Number
    | boolean            // Boolean
    | null;              // Null

export type OmniAST = OmniASTNode[];

/**
 * ChamsState
 * Represents the memory and execution context of a running cHams program.
 * Includes Gas Metering and Time-Travel Snapshots.
 */
export interface ChamsState {
    memory: Record<string, unknown>; // Reactive Signals/Variables
    gasLimit: number;            // Maximum operations allowed
    gasUsed: number;             // Operations consumed
    snapshots: {
        gasUsed: number;
        timestamp: number;
        dataSnapshot: Record<string, unknown>;
    }[]; // Time-Travel History (Max 50)
    status: 'idle' | 'running' | 'yielded' | 'halted' | 'error';
    errorLog: string[];
}

/**
 * Supported Languages for the Holographic De-Parser
 */
export type ChamsLanguage = 'EN' | 'ID' | 'JP';
