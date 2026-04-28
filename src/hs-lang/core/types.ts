 
// ============================================================================
// Ham Engine V5.5: THE OMNI-DNA (CORE TYPES)
// ============================================================================

/**
 * Opcode (Operation Code)
 * The fundamental atomic units of the Ham Engine language.
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
    IMPORT = 8,     // Import Module (File Resolution)
    EXPORT = 9,     // Export from Module
    PARALLEL = 10,  // Parallel Execution (Promise.all)
    FOR = 11,
    BREAK = 12,
    CONTINUE = 13,
    TRY = 14,
    CATCH = 15,
    FINALLY = 27,
    
    // 0x10 - 0x1F: Memory & Variables
    LET = 16,       // Variable Declaration
    ASSIGN = 17,    // Variable Assignment
    ARRAY = 18,     // Array Literal
    OBJECT = 19,    // Object Literal
    GET = 20,       // Property/Index Access
    SET = 21,       // Property/Index Assignment
    CLASS = 22,     // Class Declaration
    NEW = 23,       // Object Instantiation
    THIS = 24,      // Current Instance
    SUPER = 25,     // Superclass Reference
    EXTENDS = 26,   // Class Inheritance
    CONST = 28,     // Immutable Variable
    STATIC = 29,    // Static Class Member
    PUBLIC = 30,    // Public Access Modifier
    PRIVATE = 31,   // Private Access Modifier
    PROTECTED = 33, // Protected Access Modifier
    TRUE = 34,      // Boolean True
    FALSE = 35,     // Boolean False
    NULL = 36,      // Null Value
    
    // 0x20 - 0x2F: I/O & Primitives
    PRINT = 32,     // Standard Output
    
    // 0x30 - 0x4F: Operators
    ADD = 48,
    SUB = 49,
    MUL = 50,
    DIV = 51,
    MOD = 60,
    BIT_OR = 61,
    BIT_XOR = 62,
    BIT_AND = 63,
    BIT_LSHIFT = 64,
    BIT_RSHIFT = 65,
    ADD_ASSIGN = 66,
    SUB_ASSIGN = 67,
    MUL_ASSIGN = 68,
    DIV_ASSIGN = 69,
    MOD_ASSIGN = 70,
    NOT = 71,       // !
    TYPEOF = 72,    // typeof
    INC = 73,       // ++
    DEC = 74,       // --
    ARROW = 75,     // =>
    STRICT_EQ = 76, // ===
    STRICT_NEQ = 77,// !==
    EXP = 78,       // **
    TERNARY = 79,   // ? :
    EQ = 52,        // ==
    NEQ = 53,       // !=
    GT = 54,        // >
    LT = 55,        // <
    GTE = 56,       // >=
    LTE = 57,       // <=
    AND = 58,       // &&
    OR = 59,        // ||
    
    // 0x50 - 0x5F: Modern JS Features
    THROW = 80,
    SWITCH = 81,
    CASE = 82,
    DEFAULT = 83,
    OF = 84,
    IN = 85,
    SPREAD = 86,
    FOR_OF = 87,
    FOR_IN = 88,
    ASYNC = 89,
    AWAIT = 90,
    OPTIONAL_CHAIN = 91,
    NULLISH = 92,
    REACTIVE = 93,
    TYPE_DECL = 94,
    INTERFACE_DECL = 95,
    
    // 0xF0 - 0xFF: System & Meta
    OS_CALL = 240,  // Call to HAM OS God-Primitives
    EOF = 255       // End of File / Stream
}

/**
 * HamAST (Abstract Syntax Tuple/Object)
 * The JSON representation of Ham Engine code. 
 * Format: { type: Opcode, args: [...], loc: { line, column } }
 * Legacy Format: [Opcode, Argument1, Argument2, ...]
 */
export interface HamASTLocation {
    line: number;
    column: number;
}

export type HamASTNode = 
    | { type: Opcode; args: any[]; loc: HamASTLocation } // A standard operation node (Object)
    | [Opcode, ...any[]] // A standard operation node (Legacy Array)
    | HamASTNode[]      // A block of nodes
    | string             // Identifier or String Literal
    | number             // Number Literal
    | boolean            // Boolean Literal
    | null;              // Null Literal

export type HamAST = HamASTNode[];

export type HamNode = HamASTNode;
export type HamType = 'string' | 'number' | 'boolean' | 'object' | 'array' | 'null' | 'undefined' | 'function';

/**
 * HamEngineProgram
 * Represents a compiled Ham Engine program with versioning metadata.
 * Prevents Semantic Drift by ensuring code is executed with the correct logic version.
 */
export interface HamEngineProgram {
    version: string;
    ast: HamAST;
    metadata?: Record<string, any>;
}

/**
 * HamEngineState
 * Represents the memory and execution context of a running Ham Engine program.
 * Includes Gas Metering and Time-Travel Snapshots.
 */
export interface HamEngineState {
    memory: Record<string, any>; // Reactive Signals/Variables
    gasLimit: number;            // Maximum operations allowed
    gasUsed: number;             // Operations consumed
    snapshots: Record<string, any>[]; // Time-Travel History (Max 50)
    status: 'idle' | 'running' | 'yielded' | 'halted' | 'error';
    errorLog: string[];
    lastSnapshotMemory: Record<string, any>; // Added for Diff-based Snapshot
    
    // Kelompok 1 & 3: Security & Concurrency
    syncGate: boolean;           // Temporal Sync-Gate (Hardware Ready Signal)
    locks: Set<string>;          // Mutex/Lock Manager for God-Primitives
}

export const TypeValidator = {
    validate: (funcName: string, args: any[], expectedTypes: string[]): void => {
        for (let i = 0; i < args.length; i++) {
            if (expectedTypes[i] && typeof args[i] !== expectedTypes[i]) {
                throw new Error(`[Runtime Error] Invalid argument type for ${funcName}. Expected ${expectedTypes[i]}, got ${typeof args[i]}.`);
            }
        }
    }
};

/**
 * Supported Languages for the Holographic De-Parser
 */
export type HamEngineLanguage = 'EN' | 'ID' | 'JP';
