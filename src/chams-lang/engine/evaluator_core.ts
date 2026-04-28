 
import { Opcode, OmniAST, OmniASTNode } from '../core/types';
import { Environment, MemoryManager } from './memory';

// ============================================================================
// cHams V5.5: THE AEGIS EVALUATOR CORE
// ============================================================================

export const OSRegistry: Record<string, Function> = {};
export const ModuleCache: Record<string, any> = {};

export abstract class EvaluatorCore {
    protected memoryManager: MemoryManager;
    protected lastYieldTime: number;
    protected readonly YIELD_INTERVAL_MS = 5;
    
    public callStackDepth: number = 0;
    public readonly MAX_CALL_STACK_DEPTH = 1000;

    constructor(memoryManager: MemoryManager) {
        this.memoryManager = memoryManager;
        this.lastYieldTime = Date.now();
    }

    protected async checkYield(): Promise<void> {
        this.memoryManager.consumeGas(1);
        
        // Kelompok 1: Temporal Desync (Sync-Gate)
        // Ensure AI waits for hardware "Ready" signal before proceeding.
        await this.memoryManager.waitForSync();

        const now = Date.now();
        if (now - this.lastYieldTime > this.YIELD_INTERVAL_MS) {
            await new Promise(resolve => setTimeout(resolve, 0));
            this.lastYieldTime = Date.now();
        }
    }

    public async evaluate(ast: OmniAST, env: Environment): Promise<any> {
        let lastResult: any = null;
        
        try {
            this.memoryManager.getState().status = 'running';
            
            // Kelompok 2: Decompression Bombing (Memory Limit)
            // Prevent OOM by checking AST node count before execution.
            const nodeCount = this.countNodes(ast);
            if (nodeCount > 50000) { // Safety threshold
                throw new Error(`[Security Error] Decompression Bomb detected. AST size (${nodeCount}) exceeds safety limit.`);
            }

            for (const node of ast) {
                lastResult = await this.evaluateNode(node, env);
                
                if (this.memoryManager.getState().gasUsed % 50 === 0) {
                    this.memoryManager.takeSnapshot();
                }
            }
            
            this.memoryManager.getState().status = 'idle';
            return lastResult;
        } catch (error: any) {
            if (error.isReturn) {
                return error.value;
            }
            
            this.memoryManager.getState().status = 'error';
            this.memoryManager.logError(error.message);
            
            throw error;
        }
    }

    private countNodes(ast: any): number {
        if (!Array.isArray(ast)) return 1;
        let count = 1;
        for (const item of ast) {
            count += this.countNodes(item);
        }
        return count;
    }

    protected async evaluateNode(node: OmniASTNode | undefined, env: Environment): Promise<any> {
        await this.checkYield();

        if (node === null || node === undefined) return null;
        if (typeof node === 'boolean') return node;
        if (typeof node === 'number') return node;
        if (typeof node === 'string') {
            if (node.startsWith('"') && node.endsWith('"')) {
                return node.substring(1, node.length - 1);
            }
            return env.get(node);
        }

        let opcode: Opcode;
        let args: any[];

        if (Array.isArray(node)) {
            if (node.length === 0) return null;
            opcode = node[0] as Opcode;
            args = node.slice(1);
        } else if (typeof node === 'object' && node !== null && 'type' in node) {
            opcode = node.type;
            args = node.args;
        } else {
            return null;
        }

        return this.evaluateOpcode(opcode, args, env);
    }

    protected abstract evaluateOpcode(opcode: Opcode, args: any[], env: Environment): Promise<any>;

    protected isTruthy(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value !== '';
        return true;
    }

    protected bindingDepth: number = 0;
    protected readonly MAX_BINDING_DEPTH = 100;

    protected async assignToTarget(targetNode: any, value: any, env: Environment) {
        if (this.bindingDepth > this.MAX_BINDING_DEPTH) {
            console.warn(`[Reactive Cascade] Maximum binding depth exceeded. Possible infinite loop detected.`);
            return;
        }
        this.bindingDepth++;
        try {
            let opcode: Opcode | null = null;
            let args: any[] = [];

            if (Array.isArray(targetNode)) {
                opcode = targetNode[0];
                args = targetNode.slice(1);
            } else if (typeof targetNode === 'object' && targetNode !== null && 'type' in targetNode) {
                opcode = targetNode.type;
                args = targetNode.args;
            }

            if (typeof targetNode === 'string') {
                env.assign(targetNode, value);
            } else if (opcode === Opcode.GET) {
                const obj = await this.evaluateNode(args[0], env);
                const prop = await this.evaluateNode(args[1], env);
                obj[prop] = value;
                
                // Trigger cascading bindings for object properties
                if (obj.__bindings__ && obj.__bindings__[prop]) {
                    for (const target of obj.__bindings__[prop]) {
                        await this.assignToTarget(target, value, env);
                    }
                }
            }
        } finally {
            this.bindingDepth--;
        }
    }
}
