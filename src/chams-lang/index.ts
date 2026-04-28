 
 
import { Lexer } from './compiler/lexer';
import { Parser } from './compiler/parser';
import { Deparser } from './compiler/deparser';
import { Evaluator } from './engine/evaluator';
import { MemoryManager, Environment } from './engine/memory';
import { registerGodPrimitives } from './stdlib/os_primitives';
import { ChamsLanguage, OmniAST } from './core/types';

// ============================================================================
// cHams V5.5: THE OMNI-API (PUBLIC INTERFACE)
// ============================================================================

export class ChamsEngine {
    private memoryManager: MemoryManager;
    private evaluator: Evaluator;
    private globalEnv: Environment;
    private isInitialized: boolean = false;

    constructor(gasLimit: number = 100000) {
        this.memoryManager = new MemoryManager(gasLimit);
        this.globalEnv = this.memoryManager.getGlobalEnv();
        this.evaluator = new Evaluator(this.memoryManager);
    }

    /**
     * Initializes the engine and registers God-Primitives.
     * Must be called before executing any code.
     */
    public async init(): Promise<void> {
        if (this.isInitialized) return;
        registerGodPrimitives();
        this.isInitialized = true;
    }

    /**
     * Compiles raw text into Omni-DNA (Minified JSON AST).
     * @param sourceCode The raw cHams code (e.g., "jika (x > 5) cetak(x);")
     * @param language The language of the source code ('EN', 'ID', 'JP')
     * @returns OmniAST (JSON Array)
     */
    public compile(sourceCode: string, language: ChamsLanguage = 'EN'): OmniAST {
        try {
            const lexer = new Lexer(sourceCode, language);
            const tokens = lexer.tokenizeAll();
            const parser = new Parser(tokens);
            return parser.parse();
        } catch (error: any) {
            throw new Error(`[cHams Compile Error] ${error?.message || String(error)}`, { cause: error });
        }
    }

    /**
     * De-compiles Omni-DNA back into human-readable text.
     * @param ast The Omni-DNA (JSON Array)
     * @param targetLanguage The desired output language
     * @returns Formatted source code string
     */
    public decompile(ast: OmniAST, targetLanguage: ChamsLanguage = 'EN'): string {
        try {
            const deparser = new Deparser(targetLanguage);
            return deparser.deparse(ast);
        } catch (error: any) {
            throw new Error(`[cHams Decompile Error] ${error?.message || String(error)}`, { cause: error });
        }
    }

    /**
     * Executes Omni-DNA asynchronously with Gas Limits and Time-Slicing.
     * @param ast The Omni-DNA (JSON Array)
     * @returns The result of the last evaluated expression
     */
    public async execute(ast: OmniAST): Promise<any> {
        if (!this.isInitialized) {
            throw new Error("[cHams Error] Engine must be initialized before execution. Call init() first.");
        }
        
        try {
            // Reset Gas for new execution
            this.memoryManager.getState().gasUsed = 0;
            return await this.evaluator.evaluate(ast, this.globalEnv);
        } catch (error: any) {
            console.error("[cHams Execution Error]", error);
            throw error;
        }
    }

    /**
     * Convenience method: Compile and Execute in one step.
     */
    public async run(sourceCode: string, language: ChamsLanguage = 'EN'): Promise<any> {
        const ast = this.compile(sourceCode, language);
        return await this.execute(ast);
    }

    /**
     * Injects a custom variable or function into the global environment.
     */
    public inject(name: string, value: any): void {
        this.globalEnv.define(name, value);
    }

    /**
     * Retrieves the current state of the engine (Memory, Gas, Status).
     */
    public getState() {
        return this.memoryManager.getState();
    }
}
