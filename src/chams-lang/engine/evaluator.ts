 
import { Opcode, OmniAST, OmniASTNode } from '../core/types';
import { Environment, MemoryManager } from './memory';

// ============================================================================
// cHams V5.5: THE AEGIS EVALUATOR (ASYNCHRONOUS WALKER)
// ============================================================================

// Registry for OS Primitives (The Standard Library)
export const OSRegistry: Record<string, Function> = {
    "time": () => Date.now(),
    "rand": (min: number = 0, max: number = 1) => Math.random() * (max - min) + min,
    "wait": (ms: number) => new Promise(resolve => setTimeout(resolve, ms)),
    "len": (val: any) => {
        if (val === null || val === undefined) return 0;
        if (typeof val === 'string' || Array.isArray(val)) return val.length;
        if (typeof val === 'object') return Object.keys(val).length;
        return 0;
    },
    "type": (val: any) => typeof val
};

/**
 * The Aegis Evaluator
 * Executes Omni-DNA (JSON AST) asynchronously.
 * Implements Time-Slicing to guarantee zero UI freeze.
 */
export class Evaluator {
    private memoryManager: MemoryManager;
    private lastYieldTime: number;
    private readonly YIELD_INTERVAL_MS = 5; // Yield every 5ms to keep UI responsive (60 FPS)

    constructor(memoryManager: MemoryManager) {
        this.memoryManager = memoryManager;
        this.lastYieldTime = Date.now();
    }

    /**
     * Time-Slicing Mechanism.
     * Yields execution back to the JavaScript Event Loop to prevent browser freeze.
     */
    private async checkYield(): Promise<void> {
        this.memoryManager.consumeGas(1);
        
        const now = Date.now();
        if (now - this.lastYieldTime > this.YIELD_INTERVAL_MS) {
            await new Promise(resolve => setTimeout(resolve, 0));
            this.lastYieldTime = Date.now();
        }
    }

    /**
     * Evaluates an entire OmniAST block.
     */
    public async evaluate(ast: OmniAST, env: Environment): Promise<any> {
        let lastResult: any = null;
        
        try {
            this.memoryManager.getState().status = 'running';
            
            for (const node of ast) {
                lastResult = await this.evaluateNode(node, env);
                
                // Take snapshot every 50 operations for Time-Travel Recovery
                if (this.memoryManager.getState().gasUsed % 50 === 0) {
                    this.memoryManager.takeSnapshot();
                }
            }
            
            this.memoryManager.getState().status = 'idle';
            return lastResult;
        } catch (error: any) {
            if (error.isReturn) {
                return error.value; // Unwind stack for return statement
            }
            
            this.memoryManager.getState().status = 'error';
            this.memoryManager.logError(error.message);
            
            // Self-Healing: Rewind to last safe state
            console.error(`[Aegis Evaluator Error] ${error.message}. Initiating Time-Travel Rewind...`);
            this.memoryManager.rewind();
            
            throw error;
        }
    }

    /**
     * Evaluates a single OmniASTNode.
     */
    private async evaluateNode(node: OmniASTNode, env: Environment): Promise<any> {
        await this.checkYield();

        if (node === null) return null;
        if (typeof node === 'boolean') return node;
        if (typeof node === 'number') return node;
        if (typeof node === 'string') {
            // String Literal vs Identifier Heuristic
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

        switch (opcode) {
            case Opcode.LET:
            case Opcode.CONST:
            case Opcode.REACTIVE: {
                const name = args[0] as string;
                const value = args[1] !== undefined && args[1] !== null ? await this.evaluateNode(args[1], env) : null;
                env.define(name, value);
                return value;
            }
            case Opcode.ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                env.assign(name, value);
                return value;
            }
            case Opcode.GET: {
                const obj = await this.evaluateNode(args[0], env);
                const key = await this.evaluateNode(args[1], env);
                if (obj === null || obj === undefined) {
                    throw new Error(`[Runtime Error] Cannot read property '${key}' of null or undefined.`);
                }
                return obj[key];
            }
            case Opcode.SET: {
                const obj = await this.evaluateNode(args[0], env);
                const key = await this.evaluateNode(args[1], env);
                const value = await this.evaluateNode(args[2], env);
                if (obj === null || obj === undefined) {
                    throw new Error(`[Runtime Error] Cannot set property '${key}' of null or undefined.`);
                }
                obj[key] = value;
                return value;
            }
            case Opcode.PRINT: {
                const value = await this.evaluateNode(args[0], env);
                // console.log(`[cHams Output]:`, value);
                return value;
            }
            case Opcode.BIND: {
                const source = args[0] as string;
                const target = args[1] as string;
                env.bind(source, target);
                return null;
            }
            case Opcode.IF: {
                const condition = await this.evaluateNode(args[0], env);
                if (this.isTruthy(condition)) {
                    return await this.evaluate(args[1] as OmniAST, new Environment(env));
                } else if (args[2] !== undefined && args[2] !== null) {
                    return await this.evaluate(args[2] as OmniAST, new Environment(env));
                }
                return null;
            }
            case Opcode.WHILE: {
                let result = null;
                while (this.isTruthy(await this.evaluateNode(args[0], env))) {
                    result = await this.evaluate(args[1] as OmniAST, new Environment(env));
                }
                return result;
            }
            case Opcode.FOR: {
                const init = args[0];
                const condition = args[1];
                const increment = args[2];
                const body = args[3] as OmniAST;
                
                const forEnv = new Environment(env);
                if (init) await this.evaluateNode(init, forEnv);
                
                let result = null;
                while (condition ? this.isTruthy(await this.evaluateNode(condition, forEnv)) : true) {
                    result = await this.evaluate(body, new Environment(forEnv));
                    if (increment) await this.evaluateNode(increment, forEnv);
                }
                return result;
            }
            case Opcode.ARRAY: {
                const arr = [];
                this.memoryManager.consumeGas(args.length);
                for (const arg of args) {
                    arr.push(await this.evaluateNode(arg, env));
                }
                return arr;
            }
            case Opcode.OBJECT: {
                const obj: Record<string, any> = {};
                this.memoryManager.consumeGas(args.length / 2);
                for (let i = 0; i < args.length; i += 2) {
                    const key = args[i] as string;
                    const value = await this.evaluateNode(args[i + 1], env);
                    obj[key] = value;
                }
                return obj;
            }
            case Opcode.FUNC: {
                const name = args[0] as string;
                const params = args[1] as string[];
                const body = args[2] as OmniAST;
                const _isAsync = args[3] as boolean;
                
                const func = async (...callArgs: any[]) => {
                    const closure = new Environment(env);
                    for (let i = 0; i < params.length; i++) {
                        closure.define(params[i], callArgs[i]);
                    }
                    try {
                        return await this.evaluate(body, closure);
                    } catch (e: any) {
                        if (e.isReturn) return e.value;
                        throw e;
                    }
                };
                
                if (name) env.define(name, func);
                return func;
            }
            case Opcode.CALL: {
                const callee = await this.evaluateNode(args[0], env);
                const callArgs = [];
                for (let i = 1; i < args.length; i++) {
                    callArgs.push(await this.evaluateNode(args[i], env));
                }
                
                if (typeof callee === 'function') {
                    return await callee(...callArgs);
                }
                throw new Error(`[Runtime Error] Attempted to call a non-function.`);
            }
            case Opcode.OS_CALL: {
                const funcName = args[0] as string;
                const osArgs = [];
                for (let i = 1; i < args.length; i++) {
                    osArgs.push(await this.evaluateNode(args[i], env));
                }
                
                if (OSRegistry[funcName]) {
                    return await OSRegistry[funcName](...osArgs);
                }
                throw new Error(`[Runtime Error] OS Primitive '${funcName}' is not registered.`);
            }
            case Opcode.RETURN: {
                const value = args[0] !== undefined && args[0] !== null ? await this.evaluateNode(args[0], env) : null;
                throw { isReturn: true, value };
            }
            case Opcode.BLOCK: {
                return await this.evaluate(args[0] as OmniAST, new Environment(env));
            }
            case Opcode.CLASS: {
                const name = args[0] as string;
                const superclassName = args[1] as string | null;
                const methodsNodes = args[2] as OmniASTNode[];
                
                const methods: Record<string, Function> = {};
                for (const methodNode of methodsNodes) {
                    // Method nodes are Opcode.FUNC
                    // We need to evaluate them in a way that captures their name
                    const methodFunc = await this.evaluateNode(methodNode, env);
                    // The Opcode.FUNC evaluation defines the function in the environment if it has a name
                    // But for class methods, we want to store them in the class object
                    // Let's assume the first arg of FUNC is the name
                    let methodName: string;
                    if (Array.isArray(methodNode)) {
                        methodName = methodNode[1] as string;
                    } else {
                        methodName = (methodNode as any).args[0] as string;
                    }
                    methods[methodName] = methodFunc;
                }

                const classDefinition = {
                    name,
                    superclassName,
                    methods,
                    // Basic instantiation
                    new: async (...instArgs: any[]) => {
                        const instance = {
                            __class__: name,
                            ...methods
                        };
                        if (methods['constructor']) {
                            await methods['constructor'].apply(instance, instArgs);
                        }
                        return instance;
                    }
                };
                
                env.define(name, classDefinition);
                return classDefinition;
            }
            case Opcode.TRY: {
                try {
                    return await this.evaluate(args[0] as OmniAST, new Environment(env));
                } catch (e: any) {
                    if (e.isReturn) throw e;
                    if (args[1]) {
                        const catchEnv = new Environment(env);
                        if (args[1].param) catchEnv.define(args[1].param, e.message || e);
                        return await this.evaluate(args[1].body as OmniAST, catchEnv);
                    }
                    throw e;
                } finally {
                    if (args[2]) await this.evaluate(args[2] as OmniAST, new Environment(env));
                }
            }
            
            // Binary Operators
            case Opcode.ADD: {
                const left = await this.evaluateNode(args[0], env);
                const right = await this.evaluateNode(args[1], env);
                if (typeof left === 'string' || typeof right === 'string') {
                    const result = String(left) + String(right);
                    this.memoryManager.consumeGas(Math.ceil(result.length / 1024)); 
                    return result;
                }
                return left + right;
            }
            case Opcode.SUB: return (await this.evaluateNode(args[0], env)) - (await this.evaluateNode(args[1], env));
            case Opcode.MUL: return (await this.evaluateNode(args[0], env)) * (await this.evaluateNode(args[1], env));
            case Opcode.DIV: {
                const right = await this.evaluateNode(args[1], env);
                if (right === 0) throw new Error("[Runtime Error] Division by zero.");
                return (await this.evaluateNode(args[0], env)) / right;
            }
            case Opcode.MOD: return (await this.evaluateNode(args[0], env)) % (await this.evaluateNode(args[1], env));
            case Opcode.EXP: return (await this.evaluateNode(args[0], env)) ** (await this.evaluateNode(args[1], env));
            case Opcode.EQ: return (await this.evaluateNode(args[0], env)) == (await this.evaluateNode(args[1], env));
            case Opcode.NEQ: return (await this.evaluateNode(args[0], env)) != (await this.evaluateNode(args[1], env));
            case Opcode.STRICT_EQ: return (await this.evaluateNode(args[0], env)) === (await this.evaluateNode(args[1], env));
            case Opcode.STRICT_NEQ: return (await this.evaluateNode(args[0], env)) !== (await this.evaluateNode(args[1], env));
            case Opcode.GT: return (await this.evaluateNode(args[0], env)) > (await this.evaluateNode(args[1], env));
            case Opcode.LT: return (await this.evaluateNode(args[0], env)) < (await this.evaluateNode(args[1], env));
            case Opcode.GTE: return (await this.evaluateNode(args[0], env)) >= (await this.evaluateNode(args[1], env));
            case Opcode.LTE: return (await this.evaluateNode(args[0], env)) <= (await this.evaluateNode(args[1], env));
            case Opcode.AND: return this.isTruthy(await this.evaluateNode(args[0], env)) && this.isTruthy(await this.evaluateNode(args[1], env));
            case Opcode.OR: return this.isTruthy(await this.evaluateNode(args[0], env)) || this.isTruthy(await this.evaluateNode(args[1], env));
            case Opcode.NOT: return !this.isTruthy(await this.evaluateNode(args[0], env));
            case Opcode.AWAIT: return await this.evaluateNode(args[0], env);
            case Opcode.NULLISH: {
                const left = await this.evaluateNode(args[0], env);
                return (left !== null && left !== undefined) ? left : await this.evaluateNode(args[1], env);
            }
            
            // Bitwise
            case Opcode.BIT_AND: return (await this.evaluateNode(args[0], env)) & (await this.evaluateNode(args[1], env));
            case Opcode.BIT_OR: return (await this.evaluateNode(args[0], env)) | (await this.evaluateNode(args[1], env));
            case Opcode.BIT_XOR: return (await this.evaluateNode(args[0], env)) ^ (await this.evaluateNode(args[1], env));
            case Opcode.BIT_LSHIFT: return (await this.evaluateNode(args[0], env)) << (await this.evaluateNode(args[1], env));
            case Opcode.BIT_RSHIFT: return (await this.evaluateNode(args[0], env)) >> (await this.evaluateNode(args[1], env));
            
            default:
                throw new Error(`[Runtime Error] Unknown Opcode: ${opcode}`);
        }
    }

    private isTruthy(value: any): boolean {
        if (value === null || value === undefined) return false;
        if (typeof value === 'boolean') return value;
        if (typeof value === 'number') return value !== 0;
        if (typeof value === 'string') return value !== '';
        return true;
    }
}
