 
import { Opcode } from '../core/types';
import { Environment } from './memory';
import { OSRegistry } from './evaluator_core';
import { EvaluatorExpressions_Part1 } from './evaluator_expressions_Part1';

// ============================================================================
// Ham Engine V5.5: THE AEGIS EVALUATOR EXPRESSIONS
// ============================================================================

export abstract class EvaluatorExpressions extends EvaluatorExpressions_Part1 {
    /**
     * God-Primitive Masking Protection
     * Scans arguments for hidden system calls or malicious patterns.
     */
    private validateGodPrimitive(funcName: string, args: any[]): void {
        const maliciousPatterns = ['Sys.Exec', 'VFS.Write', 'VFS.Delete', 'eval', 'Function'];
        
        // If the function being called is a UI function, ensure it doesn't contain system commands in strings
        if (funcName.startsWith('UI.')) {
            const strArgs = JSON.stringify(args);
            for (const pattern of maliciousPatterns) {
                if (strArgs.includes(pattern)) {
                    throw new Error(`[Security Error] God-Primitive Masking detected. UI call '${funcName}' contains forbidden system pattern: ${pattern}`);
                }
            }
        }
    }

    protected async evaluateExpressionOp(opcode: Opcode, args: any[], env: Environment): Promise<{ handled: boolean, value?: any }> {
        // Try binary ops first
        const binaryResult = await this.evaluateBinaryOp(opcode, args, env);
        if (binaryResult.handled) return binaryResult;

        switch (opcode) {
            case Opcode.GET: {
                const obj = await this.evaluateNode(args[0], env);
                const key = await this.evaluateNode(args[1], env);
                if (obj === null || obj === undefined) {
                    throw new Error(`[Runtime Error] Cannot read property '${key}' of null or undefined.`);
                }
                return { handled: true, value: obj[key] };
            }
            case Opcode.OPTIONAL_CHAIN: {
                const obj = await this.evaluateNode(args[0], env);
                if (obj === null || obj === undefined) {
                    return { handled: true, value: undefined };
                }
                const key = await this.evaluateNode(args[1], env);
                return { handled: true, value: obj[key] };
            }
            case Opcode.NULLISH: {
                const left = await this.evaluateNode(args[0], env);
                if (left !== null && left !== undefined) {
                    return { handled: true, value: left };
                }
                return { handled: true, value: await this.evaluateNode(args[1], env) };
            }
            case Opcode.SET: {
                let obj = await this.evaluateNode(args[0], env);
                const key = await this.evaluateNode(args[1], env);
                const value = await this.evaluateNode(args[2], env);
                if (obj === null || obj === undefined) {
                    throw new Error(`[Runtime Error] Cannot set property '${key}' of null or undefined.`);
                }
                
                const targetNode = args[0];
                let targetOpcode: Opcode | null = null;
                if (Array.isArray(targetNode)) targetOpcode = targetNode[0];
                else if (typeof targetNode === 'object' && targetNode !== null && 'type' in targetNode) targetOpcode = targetNode.type;

                if (targetOpcode === Opcode.SUPER) {
                    obj = env.get('this');
                }
                
                obj[key] = value;

                // Trigger object property bindings
                if (obj.__bindings__ && obj.__bindings__[key]) {
                    for (const target of obj.__bindings__[key]) {
                        await this.assignToTarget(target, value, env);
                    }
                }
                
                return { handled: true, value };
            }
            case Opcode.CALL: {
                let callee: any;
                let thisContext: any = null;
                
                const calleeNode = args[0];
                let calleeOpcode: Opcode | null = null;
                let calleeArgs: any[] = [];

                if (Array.isArray(calleeNode)) {
                    calleeOpcode = calleeNode[0];
                    calleeArgs = calleeNode.slice(1);
                } else if (typeof calleeNode === 'object' && calleeNode !== null && 'type' in calleeNode) {
                    calleeOpcode = calleeNode.type;
                    calleeArgs = calleeNode.args;
                }

                if (calleeOpcode === Opcode.GET) {
                    thisContext = await this.evaluateNode(calleeArgs[0], env);
                    const key = await this.evaluateNode(calleeArgs[1], env);
                    if (thisContext === null || thisContext === undefined) {
                        throw new Error(`[Runtime Error] Cannot read property '${key}' of null or undefined.`);
                    }
                    callee = thisContext[key];
                    
                    const subCalleeNode = calleeArgs[0];
                    let subCalleeOpcode: Opcode | null = null;
                    if (Array.isArray(subCalleeNode)) subCalleeOpcode = subCalleeNode[0];
                    else if (typeof subCalleeNode === 'object' && subCalleeNode !== null && 'type' in subCalleeNode) subCalleeOpcode = subCalleeNode.type;

                    if (subCalleeOpcode === Opcode.SUPER) {
                        thisContext = env.get('this');
                    }
                } else if (calleeOpcode === Opcode.SUPER) {
                    const superPrototype = await this.evaluateNode(calleeNode, env);
                    callee = superPrototype['__init__'];
                    thisContext = env.get('this');
                } else {
                    callee = await this.evaluateNode(calleeNode, env);
                }

                const callArgs = [];
                for (let i = 1; i < args.length; i++) {
                    const argNode = args[i];
                    let argOpcode: Opcode | null = null;
                    let argArgs: any[] = [];
                    if (Array.isArray(argNode)) {
                        argOpcode = argNode[0];
                        argArgs = argNode.slice(1);
                    } else if (typeof argNode === 'object' && argNode !== null && 'type' in argNode) {
                        argOpcode = argNode.type;
                        argArgs = argNode.args;
                    }

                    if (argOpcode === Opcode.SPREAD) {
                        const spreadVal = await this.evaluateNode(argArgs[0], env);
                        if (Array.isArray(spreadVal)) {
                            callArgs.push(...spreadVal);
                        } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
                            callArgs.push(...spreadVal);
                        } else {
                            throw new Error(`[Runtime Error] Spread target is not iterable.`);
                        }
                    } else {
                        callArgs.push(await this.evaluateNode(argNode, env));
                    }
                }
                
                if (typeof callee === 'function') {
                    if (thisContext !== null) {
                        return { handled: true, value: await callee.apply(thisContext, callArgs) };
                    }
                    return { handled: true, value: await callee(...callArgs) };
                }
                
                if (calleeOpcode === Opcode.SUPER) {
                    return { handled: true, value: null };
                }
                
                throw new Error(`[Runtime Error] Attempted to call a non-function.`);
            }
            case Opcode.OS_CALL: {
                const funcName = args[0] as string;
                const osArgs = [];
                for (let i = 1; i < args.length; i++) {
                    const argNode = args[i];
                    let argOpcode: Opcode | null = null;
                    let argArgs: any[] = [];
                    if (Array.isArray(argNode)) {
                        argOpcode = argNode[0];
                        argArgs = argNode.slice(1);
                    } else if (typeof argNode === 'object' && argNode !== null && 'type' in argNode) {
                        argOpcode = argNode.type;
                        argArgs = argNode.args;
                    }

                    if (argOpcode === Opcode.SPREAD) {
                        const spreadVal = await this.evaluateNode(argArgs[0], env);
                        if (Array.isArray(spreadVal)) {
                            osArgs.push(...spreadVal);
                        } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
                            osArgs.push(...spreadVal);
                        } else {
                            throw new Error(`[Runtime Error] Spread target is not iterable.`);
                        }
                    } else {
                        osArgs.push(await this.evaluateNode(argNode, env));
                    }
                }
                
                // Kelompok 1: God-Primitive Masking (Security)
                // Validator Token: Deep-check arguments for malicious system calls.
                this.validateGodPrimitive(funcName, osArgs);

                if (OSRegistry[funcName]) {
                    return { handled: true, value: await OSRegistry[funcName](...osArgs) };
                }
                throw new Error(`[Runtime Error] OS Primitive '${funcName}' is not registered in the Standard Library.`);
            }
            case Opcode.NEW: {
                const calleeNode = args[0];
                let classConstructor: any;
                let newArgs: any[] = [];
                
                let calleeOpcode: Opcode | null = null;
                let calleeArgs: any[] = [];
                if (Array.isArray(calleeNode)) {
                    calleeOpcode = calleeNode[0];
                    calleeArgs = calleeNode.slice(1);
                } else if (typeof calleeNode === 'object' && calleeNode !== null && 'type' in calleeNode) {
                    calleeOpcode = calleeNode.type;
                    calleeArgs = calleeNode.args;
                }

                if (calleeOpcode === Opcode.CALL) {
                    classConstructor = await this.evaluateNode(calleeArgs[0], env);
                    for (let i = 1; i < calleeArgs.length; i++) {
                        const argNode = calleeArgs[i];
                        let argOpcode: Opcode | null = null;
                        let argArgs: any[] = [];
                        if (Array.isArray(argNode)) {
                            argOpcode = argNode[0];
                            argArgs = argNode.slice(1);
                        } else if (typeof argNode === 'object' && argNode !== null && 'type' in argNode) {
                            argOpcode = argNode.type;
                            argArgs = argNode.args;
                        }

                        if (argOpcode === Opcode.SPREAD) {
                            const spreadVal = await this.evaluateNode(argArgs[0], env);
                            if (Array.isArray(spreadVal)) {
                                newArgs.push(...spreadVal);
                            } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
                                newArgs.push(...spreadVal);
                            } else {
                                throw new Error(`[Runtime Error] Spread target is not iterable.`);
                            }
                        } else {
                            newArgs.push(await this.evaluateNode(argNode, env));
                        }
                    }
                } else {
                    classConstructor = await this.evaluateNode(calleeNode, env);
                }

                if (typeof classConstructor !== 'function' || !classConstructor.isHamEngineClass) {
                    throw new Error(`[Runtime Error] Target is not a class.`);
                }

                return { handled: true, value: await classConstructor(...newArgs) };
            }
            case Opcode.THIS: return { handled: true, value: env.get('this') };
            case Opcode.SUPER: return { handled: true, value: env.get('super') };
            case Opcode.ARRAY: {
                const arr = [];
                for (let i = 0; i < args.length; i++) {
                    const el = args[i];
                    let elOpcode: Opcode | null = null;
                    let elArgs: any[] = [];
                    if (Array.isArray(el)) {
                        elOpcode = el[0];
                        elArgs = el.slice(1);
                    } else if (typeof el === 'object' && el !== null && 'type' in el) {
                        elOpcode = el.type;
                        elArgs = el.args;
                    }

                    if (elOpcode === Opcode.SPREAD) {
                        const spreadVal = await this.evaluateNode(elArgs[0], env);
                        if (Array.isArray(spreadVal)) {
                            arr.push(...spreadVal);
                        } else if (spreadVal && typeof spreadVal[Symbol.iterator] === 'function') {
                            arr.push(...spreadVal);
                        } else {
                            throw new Error(`[Runtime Error] Spread target is not iterable.`);
                        }
                    } else {
                        arr.push(await this.evaluateNode(el, env));
                    }
                }
                return { handled: true, value: arr };
            }
            case Opcode.OBJECT: {
                const obj: Record<string, any> = {};
                for (let i = 0; i < args.length; i += 2) {
                    const keyNode = args[i];
                    let keyOpcode: Opcode | null = null;
                    let keyArgs: any[] = [];
                    if (Array.isArray(keyNode)) {
                        keyOpcode = keyNode[0];
                        keyArgs = keyNode.slice(1);
                    } else if (typeof keyNode === 'object' && keyNode !== null && 'type' in keyNode) {
                        keyOpcode = keyNode.type;
                        keyArgs = keyNode.args;
                    }

                    if (keyOpcode === Opcode.SPREAD) {
                        const spreadVal = await this.evaluateNode(keyArgs[0], env);
                        if (spreadVal && typeof spreadVal === 'object') {
                            Object.assign(obj, spreadVal);
                        } else {
                            throw new Error(`[Runtime Error] Spread target is not an object.`);
                        }
                        i--; // Adjust index because spread only takes 1 slot, not 2 (key, value)
                    } else {
                        const key = keyNode as string;
                        const value = await this.evaluateNode(args[i + 1], env);
                        obj[key] = value;
                    }
                }
                return { handled: true, value: obj };
            }
        }
        return { handled: false };
    }
}

