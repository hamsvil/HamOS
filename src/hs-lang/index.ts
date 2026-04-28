 
 
import { Lexer } from './compiler/lexer';
import { Parser } from './compiler/parser';
import { Deparser } from './compiler/deparser';
import { Evaluator } from './engine/evaluator';
import { MemoryManager, Environment } from './engine/memory';
import { registerGodPrimitives } from './stdlib/os_primitives';
import { HamEngineLanguage, HamAST, HamEngineProgram, Opcode, HamASTNode, HamEngineState } from './core/types';

export { Lexer, Parser, Deparser, Evaluator, MemoryManager, Environment, registerGodPrimitives };
export { Opcode };
export type { HamEngineLanguage, HamAST, HamASTNode, HamEngineProgram, HamEngineState };

// ============================================================================
// Ham Engine V5.5: THE OMNI-API (PUBLIC INTERFACE)
// ============================================================================

export class HamEngineEngine {
    private memoryManager: MemoryManager;
    private evaluator: Evaluator;
    private globalEnv: Environment;
    private isInitialized: boolean = false;
    private readonly CURRENT_VERSION = "5.5.0";

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
        
        // Inject standard JS globals
        this.globalEnv.define('console', console);
        this.globalEnv.define('Math', Math);
        this.globalEnv.define('Date', Date);
        this.globalEnv.define('JSON', JSON);
        this.globalEnv.define('Object', Object);
        this.globalEnv.define('Array', Array);
        this.globalEnv.define('String', String);
        this.globalEnv.define('Number', Number);
        this.globalEnv.define('Boolean', Boolean);
        this.globalEnv.define('Promise', Promise);
        this.globalEnv.define('setTimeout', setTimeout);
        this.globalEnv.define('setInterval', setInterval);
        this.globalEnv.define('clearTimeout', clearTimeout);
        this.globalEnv.define('clearInterval', clearInterval);
        if (typeof fetch !== 'undefined') {
            this.globalEnv.define('fetch', fetch);
        }
        if (typeof window !== 'undefined') {
            this.globalEnv.define('window', window);
        }
        if (typeof document !== 'undefined') {
            this.globalEnv.define('document', document);
        }
        
        this.isInitialized = true;
    }

    /**
     * Compiles raw text into Ham-DNA (Minified JSON AST).
     * @param sourceCode The raw Ham Engine code (e.g., "jika (x > 5) cetak(x);")
     * @param language The language of the source code ('EN', 'ID', 'JP')
     * @returns HamEngineProgram (Versioned AST)
     */
    public compile(sourceCode: string, language: HamEngineLanguage = 'EN'): HamEngineProgram {
        try {
            if (!sourceCode || sourceCode.trim() === '') {
                throw new Error("Source code cannot be empty.");
            }
            const lexer = new Lexer(sourceCode, language);
            const tokens = lexer.tokenizeAll();
            const parser = new Parser(tokens);
            const ast = parser.parse();
            if (ast.length === 0) {
                throw new Error("Source code produced an empty AST.");
            }
            
            // Kelompok 1: Semantic Drift (Versioning)
            // Tag the program with the current engine version to ensure backward compatibility.
            return {
                version: this.CURRENT_VERSION,
                ast: ast
            };
        } catch (error: any) {
            throw new Error(`[Ham Engine Compile Error] ${error.message}`, { cause: error });
        }
    }

    /**
     * Compiles raw text into Ham-DNA (Minified JSON AST) asynchronously, utilizing SQLite AST Cache.
     * @param sourceCode The raw Ham Engine code
     * @param language The language of the source code
     * @param filePath Optional file path for caching
     * @returns HamEngineProgram (Versioned AST)
     */
    public async compileAsync(sourceCode: string, language: HamEngineLanguage = 'EN', filePath?: string): Promise<HamEngineProgram> {
        let hash = '';
        if (filePath) {
            try {
                const { massiveDb } = await import('../db/massiveDb');
                const encoder = new TextEncoder();
                const data = encoder.encode(sourceCode);
                const hashBuffer = await crypto.subtle.digest('SHA-256', data);
                const hashArray = Array.from(new Uint8Array(hashBuffer));
                hash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
                
                const cached = await massiveDb.getAstCache(filePath);
                if (cached && cached.hash === hash) {
                    return {
                        version: this.CURRENT_VERSION,
                        ast: JSON.parse(cached.astJson)
                    };
                }
            } catch (e) {
                console.warn('[Ham Engine] AST Cache read failed:', e);
            }
        }
        
        const program = this.compile(sourceCode, language);
        
        if (filePath && hash) {
            try {
                const { massiveDb } = await import('../db/massiveDb');
                await massiveDb.setAstCache(filePath, JSON.stringify(program.ast), hash);
            } catch (e) {
                console.warn('[Ham Engine] AST Cache write failed:', e);
            }
        }
        
        return program;
    }

    /**
     * De-compiles Ham-DNA back into human-readable text.
     * @param ast The Ham-DNA (JSON Array)
     * @param targetLanguage The desired output language
     * @returns Formatted source code string
     */
    public decompile(ast: HamAST, targetLanguage: HamEngineLanguage = 'EN'): string {
        try {
            const deparser = new Deparser(targetLanguage);
            return deparser.deparse(ast);
        } catch (error: any) {
            throw new Error(`[Ham Engine Decompile Error] ${error.message}`, { cause: error });
        }
    }

    /**
     * Executes Ham-DNA asynchronously with Gas Limits and Time-Slicing.
     * @param program The HamEngineProgram (Versioned AST)
     * @returns The result of the last evaluated expression
     */
    public async execute(program: HamEngineProgram | HamAST): Promise<unknown> {
        if (!this.isInitialized) {
            throw new Error("[Ham Engine Error] Engine must be initialized before execution. Call init() first.");
        }
        
        try {
            // Kelompok 1: Semantic Drift (Versioning)
            // Handle both legacy HamAST and new HamEngineProgram.
            let ast: HamAST;
            let version: string;

            if (Array.isArray(program)) {
                ast = program;
                version = "legacy";
            } else {
                ast = program.ast;
                version = program.version;
            }

            // In a real implementation, we would switch logic based on 'version'
            // For now, we just log it and proceed with current logic.
            if (version !== this.CURRENT_VERSION && version !== "legacy") {
                console.warn(`[Ham Engine Warning] Executing program with version ${version} on engine ${this.CURRENT_VERSION}. Potential Semantic Drift.`);
            }

            // Reset Gas for new execution
            this.memoryManager.getState().gasUsed = 0;
            return await this.evaluator.evaluate(ast, this.globalEnv);
        } catch (error: any) {
            console.error("[Ham Engine Execution Error]", error);
            console.error(`[Aegis Evaluator Error] ${error.message}. Initiating Time-Travel Rewind...`);
            this.memoryManager.rewind();
            throw error;
        }
    }

    /**
     * Convenience method: Compile and Execute in one step.
     */
    public async run(sourceCode: string, language: HamEngineLanguage = 'EN'): Promise<unknown> {
        const program = this.compile(sourceCode, language);
        return await this.execute(program);
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

    /**
     * Destroys the engine instance, triggering any ON_DESTROY hooks and cleaning up memory.
     */
    public async destroy(): Promise<void> {
        try {
            // Trigger ON_DESTROY if defined in the global environment
            const onDestroy = this.globalEnv.get('ON_DESTROY');
            if (typeof onDestroy === 'function') {
                await onDestroy();
            }
        } catch (e) {
            // Ignore if ON_DESTROY is not defined or fails
        } finally {
            this.memoryManager.destroy();
            this.isInitialized = false;
        }
    }
}

export default HamEngineEngine;
