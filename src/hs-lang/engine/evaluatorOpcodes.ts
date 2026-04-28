/* eslint-disable no-useless-assignment */
 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { HamASTNode, Opcode, HamAST } from '../core/types';
import { Environment } from './memory';
import { Lexer } from '../compiler/lexer';
import { Parser } from '../compiler/parser';
import { vfs } from '../../services/vfsService';
import { ModuleCache } from './evaluator_core';

import { handleControlFlow } from './evaluator_control_flow';

export async function handleComplexOpcode(evaluator: any, opcode: Opcode, args: any[], env: Environment): Promise<unknown> {
    const controlFlowResult = await handleControlFlow(evaluator, opcode, args, env);
    if (controlFlowResult !== undefined) return controlFlowResult;

    switch (opcode) {
        case Opcode.LET:
        case Opcode.REACTIVE: {
            const pattern = args[0];
            const value = args[1] !== null ? await evaluator.evaluateNode(args[1], env) : null;
            const typeAnnotation = args[2] as string | null;
            const isConst = args[3] as boolean;

            if (typeof pattern === 'object' && pattern !== null) {
                if (pattern.type === "array") {
                    if (!Array.isArray(value)) throw new Error(`[Runtime Error] Cannot destructure non-array.`);
                    for (let i = 0; i < pattern.elements.length; i++) {
                        const el = pattern.elements[i];
                        if (typeof el === 'string') {
                            env.define(el, value[i], isConst);
                        } else if (el.type === 'rest') {
                            env.define(el.name, value.slice(i), isConst);
                        }
                    }
                    return value;
                } else if (pattern.type === "object") {
                    if (typeof value !== 'object' || value === null) throw new Error(`[Runtime Error] Cannot destructure non-object.`);
                    for (const prop of pattern.properties) {
                        if (prop.type === 'rest') {
                            const restObj = { ...value };
                            for (const p of pattern.properties) {
                                if (p.type !== 'rest') delete restObj[p.key];
                            }
                            env.define(prop.name, restObj, isConst);
                        } else {
                            const key = prop.key;
                            const varName = typeof prop.value === 'string' ? prop.value : prop.key;
                            env.define(varName, value[key], isConst);
                        }
                    }
                    return value;
                }
            }

            const name = args[0] as string;

            if (typeAnnotation && value !== null && value !== undefined) {
                const actualType = typeof value;
                if (typeAnnotation === 'string' && actualType !== 'string') throw new Error(`[Type Error] Variable '${name}' expected string, got ${actualType}`);
                if (typeAnnotation === 'number' && actualType !== 'number') throw new Error(`[Type Error] Variable '${name}' expected number, got ${actualType}`);
                if (typeAnnotation === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Variable '${name}' expected boolean, got ${actualType}`);
            }

            env.define(name, value, isConst);
            return value;
        }
        case Opcode.ASSIGN: {
            const name = args[0] as string;
            const value = await evaluator.evaluateNode(args[1], env);
            env.assign(name, value);
            return value;
        }
        case Opcode.PRINT: {
            const value = await evaluator.evaluateNode(args[0], env);
            // console.log(`[Ham Engine Output]:`, value);
            return value;
        }
        case Opcode.BIND: {
            const sourceNode = args[0];
            const targetNode = args[1];
            
            let sourceOpcode: Opcode | null = null;
            let sourceArgs: any[] = [];
            if (Array.isArray(sourceNode)) {
                sourceOpcode = sourceNode[0];
                sourceArgs = sourceNode.slice(1);
            } else if (typeof sourceNode === 'object' && sourceNode !== null && 'type' in sourceNode) {
                sourceOpcode = sourceNode.type;
                sourceArgs = sourceNode.args;
            }

            if (typeof sourceNode === 'string' && typeof targetNode === 'string') {
                env.bind(sourceNode, targetNode);
            } else if (sourceOpcode === Opcode.GET) {
                const obj = await evaluator.evaluateNode(sourceArgs[0], env);
                const prop = await evaluator.evaluateNode(sourceArgs[1], env);
                
                if (!obj.__bindings__) {
                    Object.defineProperty(obj, '__bindings__', { value: {}, writable: true, enumerable: false });
                }
                if (!obj.__bindings__[prop]) {
                    obj.__bindings__[prop] = [];
                }
                obj.__bindings__[prop].push(targetNode);
                
                const val = obj[prop];
                await evaluator.assignToTarget(targetNode, val, env);
            } else {
                throw new Error(`[Runtime Error] Invalid bind source.`);
            }
            return null;
        }
        case Opcode.THROW: {
            const value = await evaluator.evaluateNode(args[0], env);
            throw new Error(value);
        }
        case Opcode.IMPORT: {
            const modulePath = args[0] as string;
            let moduleExports: any = null;

            if (ModuleCache[modulePath]) {
                moduleExports = ModuleCache[modulePath];
            } else {
                if (modulePath === 'react') {
                    try {
                        moduleExports = await import('react');
                        ModuleCache[modulePath] = moduleExports;
                    } catch (e) {
                        if (typeof window !== 'undefined' && (window as any).React) moduleExports = (window as any).React;
                    }
                } else if (modulePath === 'react-dom') {
                    try {
                        moduleExports = await import('react-dom');
                        ModuleCache[modulePath] = moduleExports;
                    } catch (e) {
                        if (typeof window !== 'undefined' && (window as any).ReactDOM) moduleExports = (window as any).ReactDOM;
                    }
                } else if (modulePath === 'lucide-react') {
                    try {
                        moduleExports = await import('lucide-react');
                        ModuleCache[modulePath] = moduleExports;
                    } catch (e) {}
                } else if (modulePath === 'framer-motion') {
                    try {
                        moduleExports = await import('framer-motion');
                        ModuleCache[modulePath] = moduleExports;
                    } catch (e) {}
                } else {
                    try {
                        const fileContent = await vfs.readFile(modulePath);
                        if (!fileContent) throw new Error(`[Runtime Error] Module not found: ${modulePath}`);
                        
                        let ast: HamAST;
                        try {
                            ast = JSON.parse(fileContent);
                        } catch (e) {
                            const lexer = new Lexer(fileContent);
                            const tokens = lexer.tokenizeAll();
                            const parser = new Parser(tokens);
                            ast = parser.parse();
                        }
                        
                        const moduleEnv = new Environment(evaluator.memoryManager.getGlobalEnv());
                        moduleEnv.define('__exports__', {});
                        ModuleCache[modulePath] = moduleEnv.get('__exports__');
                        await evaluator.evaluate(ast, moduleEnv);
                        moduleExports = moduleEnv.get('__exports__');
                        ModuleCache[modulePath] = moduleExports;
                    } catch (e: any) {
                        throw new Error(`[Runtime Error] Failed to import module '${modulePath}': ${e.message}`, { cause: e });
                    }
                }
            }

            if (!moduleExports) throw new Error(`[Runtime Error] Failed to load module '${modulePath}'`);
            if (args.length === 1) return moduleExports;

            const defaultImport = args[1] as string | null;
            const namedImports = args[2] as { name: string, alias: string }[];
            const starImport = args[3] as string | null;

            if (defaultImport) env.define(defaultImport, moduleExports.default || moduleExports);
            if (starImport) env.define(starImport, moduleExports);
            if (namedImports && namedImports.length > 0) {
                for (const imp of namedImports) {
                    env.define(imp.alias, moduleExports[imp.name]);
                }
            }
            return moduleExports;
        }
        case Opcode.EXPORT: {
            const key = args[0];
            let value = await evaluator.evaluateNode(args[1], env);
            
            if (args[1] && (Array.isArray(args[1]) || (typeof args[1] === 'object' && 'type' in args[1]))) {
                let declOp: Opcode | null = null;
                if (Array.isArray(args[1])) declOp = args[1][0] as Opcode;
                else declOp = (args[1] as any).type as Opcode;

                if (declOp === Opcode.LET || declOp === Opcode.CONST || declOp === Opcode.REACTIVE || declOp === Opcode.FUNC || declOp === Opcode.CLASS) {
                    try { if (typeof key === 'string') value = env.get(key); } catch (e) {}
                }
            }

            try {
                const exportsObj = env.get('__exports__');
                if (typeof key === 'string') {
                    exportsObj[key] = value;
                } else if (typeof key === 'object' && key !== null) {
                    if (key.type === "array") {
                        for (let i = 0; i < key.elements.length; i++) {
                            const el = key.elements[i];
                            if (typeof el === 'string') exportsObj[el] = env.get(el);
                            else if (el.type === 'rest') exportsObj[el.name] = env.get(el.name);
                        }
                    } else if (key.type === "object") {
                        for (const prop of key.properties) {
                            if (prop.type === 'rest') exportsObj[prop.name] = env.get(prop.name);
                            else {
                                const varName = typeof prop.value === 'string' ? prop.value : prop.key;
                                exportsObj[varName] = env.get(varName);
                            }
                        }
                    }
                }
            } catch (e) {
                throw new Error(`[Runtime Error] EXPORT can only be used at the top level of a module.`, { cause: e });
            }
            return value;
        }
        case Opcode.PARALLEL: {
            const promises = [];
            for (let i = 0; i < args.length; i++) {
                promises.push(evaluator.evaluateNode(args[i], env));
            }
            return await Promise.all(promises);
        }
        case Opcode.NEW: {
            const callNode = args[0];
            let callOpcode: Opcode | null = null;
            let callArgs: any[] = [];
            if (Array.isArray(callNode)) {
                callOpcode = callNode[0];
                callArgs = callNode.slice(1);
            } else if (typeof callNode === 'object' && callNode !== null && 'type' in callNode) {
                callOpcode = callNode.type;
                callArgs = callNode.args;
            }

            if (callOpcode !== Opcode.CALL) throw new Error(`[Runtime Error] Invalid 'new' expression.`);
            const callee = await evaluator.evaluateNode(callArgs[0], env);
            if (typeof callee !== 'function') throw new Error(`[Runtime Error] Target is not a constructor.`);
            const newArgs = [];
            for (let i = 1; i < callArgs.length; i++) {
                newArgs.push(await evaluator.evaluateNode(callArgs[i], env));
            }
            if (callee.isHamEngineClass) return await callee(...newArgs);
            else return new callee(...newArgs);
        }
        case Opcode.CLASS: {
            const name = args[0] as string;
            const superclassName = args[1] as string | null;
            const methods = args[2] as HamASTNode[];

            let superclass: any = null;
            if (superclassName) {
                superclass = env.get(superclassName);
                if (typeof superclass !== 'function' || !superclass.isHamEngineClass) {
                    throw new Error(`[Runtime Error] Superclass '${superclassName}' must be a class.`);
                }
            }

            const classConstructor = async function(this: any, ...classArgs: any[]) {
                const instance = this instanceof classConstructor ? this : Object.create(classConstructor.prototype);
                instance.__class__ = name;
                if (instance['__init__']) await instance['__init__'](...classArgs);
                return instance;
            };

            classConstructor.isHamEngineClass = true;
            if (superclass) classConstructor.prototype = Object.create(superclass.prototype);
            else classConstructor.prototype = {};
            
            for (const methodNode of methods) {
                let methodOpcode: Opcode | null = null;
                let methodArgs: any[] = [];
                if (Array.isArray(methodNode)) {
                    methodOpcode = methodNode[0] as Opcode;
                    methodArgs = methodNode.slice(1);
                } else if (typeof methodNode === 'object' && methodNode !== null && 'type' in methodNode) {
                    methodOpcode = (methodNode as any).type as Opcode;
                    methodArgs = (methodNode as any).args;
                }

                if (methodOpcode === Opcode.FUNC) {
                    const methodName = methodArgs[0] as string;
                    const params = methodArgs[1] as {name: string, type: string | null}[];
                    const body = methodArgs[2] as HamAST;
                    const returnType = methodArgs[3] as string | null;
                    const modifier = methodArgs[5] as string | null;

                    const methodFunc = async function(this: any, ...methodArgs: any[]) {
                        if (evaluator.callStackDepth >= evaluator.MAX_CALL_STACK_DEPTH) throw new Error(`[Runtime Error] Maximum call stack size exceeded.`);
                        evaluator.callStackDepth++;
                        try {
                            const closure = new Environment(env);
                            closure.define('this', this);
                            if (superclass) closure.define('super', superclass.prototype);
                            for (let i = 0; i < params.length; i++) {
                                const param = params[i];
                                const argValue = methodArgs[i];
                                if (param.type && argValue !== undefined && argValue !== null) {
                                    const actualType = typeof argValue;
                                    if (param.type === 'string' && actualType !== 'string') throw new Error(`[Type Error] Parameter '${param.name}' expected string, got ${actualType}`);
                                    if (param.type === 'number' && actualType !== 'number') throw new Error(`[Type Error] Parameter '${param.name}' expected number, got ${actualType}`);
                                    if (param.type === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Parameter '${param.name}' expected boolean, got ${actualType}`);
                                }
                                closure.define(param.name, argValue);
                            }
                            try {
                                const result = await evaluator.evaluate(body, closure);
                                if (returnType && result !== undefined && result !== null) {
                                    const actualType = typeof result;
                                    if (returnType === 'string' && actualType !== 'string') throw new Error(`[Type Error] Method '${methodName}' expected return type string, got ${actualType}`);
                                    if (returnType === 'number' && actualType !== 'number') throw new Error(`[Type Error] Method '${methodName}' expected return type number, got ${actualType}`);
                                    if (returnType === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Method '${methodName}' expected return type boolean, got ${actualType}`);
                                }
                                return result;
                            } catch (e: any) {
                                if (e.isReturn) {
                                    const result = e.value;
                                    if (returnType && result !== undefined && result !== null) {
                                        const actualType = typeof result;
                                        if (returnType === 'string' && actualType !== 'string') throw new Error(`[Type Error] Method '${methodName}' expected return type string, got ${actualType}`, { cause: e });
                                        if (returnType === 'number' && actualType !== 'number') throw new Error(`[Type Error] Method '${methodName}' expected return type number, got ${actualType}`, { cause: e });
                                        if (returnType === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Method '${methodName}' expected return type boolean, got ${actualType}`, { cause: e });
                                    }
                                    return result;
                                }
                                throw e;
                            }
                        } finally {
                            evaluator.callStackDepth--;
                        }
                    };
                    
                    methodFunc.__modifier__ = modifier;
                    if (modifier === 'static') classConstructor[methodName] = methodFunc;
                    else {
                        if (methodName === 'constructor') classConstructor.prototype['__init__'] = methodFunc;
                        else classConstructor.prototype[methodName] = methodFunc;
                    }
                }
            }
            env.define(name, classConstructor);
            return null;
        }
        case Opcode.FUNC: {
            const name = args[0] as string;
            const params = args[1] as {name: string, type: string | null}[];
            const body = args[2] as HamAST;
            const returnType = args[3] as string | null;
            const isArrow = args[4] as boolean;
            
            const func = async function(this: any, ...funcArgs: any[]) {
                if (evaluator.callStackDepth >= evaluator.MAX_CALL_STACK_DEPTH) throw new Error(`[Runtime Error] Maximum call stack size exceeded.`);
                evaluator.callStackDepth++;
                try {
                    const closure = new Environment(env);
                    if (!isArrow) closure.define('this', this);
                    else {
                        try { closure.define('this', env.get('this')); } catch (e) {}
                        try { closure.define('super', env.get('super')); } catch (e) {}
                    }
                    
                    for (let i = 0; i < params.length; i++) {
                        const param = params[i];
                        const argValue = funcArgs[i];
                        if (param.type && argValue !== undefined && argValue !== null) {
                            const actualType = typeof argValue;
                            if (param.type === 'string' && actualType !== 'string') throw new Error(`[Type Error] Parameter '${param.name}' expected string, got ${actualType}`);
                            if (param.type === 'number' && actualType !== 'number') throw new Error(`[Type Error] Parameter '${param.name}' expected number, got ${actualType}`);
                            if (param.type === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Parameter '${param.name}' expected boolean, got ${actualType}`);
                        }
                        closure.define(param.name, argValue);
                    }
                    try {
                        const result = await evaluator.evaluate(body, closure);
                        if (returnType && result !== undefined && result !== null) {
                            const actualType = typeof result;
                            if (returnType === 'string' && actualType !== 'string') throw new Error(`[Type Error] Function '${name}' expected return type string, got ${actualType}`);
                            if (returnType === 'number' && actualType !== 'number') throw new Error(`[Type Error] Function '${name}' expected return type number, got ${actualType}`);
                            if (returnType === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Function '${name}' expected return type boolean, got ${actualType}`);
                        }
                        return result;
                    } catch (e: any) {
                        if (e.isReturn) {
                            const result = e.value;
                            if (returnType && result !== undefined && result !== null) {
                                const actualType = typeof result;
                                if (returnType === 'string' && actualType !== 'string') throw new Error(`[Type Error] Function '${name}' expected return type string, got ${actualType}`, { cause: e });
                                if (returnType === 'number' && actualType !== 'number') throw new Error(`[Type Error] Function '${name}' expected return type number, got ${actualType}`, { cause: e });
                                if (returnType === 'boolean' && actualType !== 'boolean') throw new Error(`[Type Error] Function '${name}' expected return type boolean, got ${actualType}`, { cause: e });
                            }
                            return result;
                        }
                        throw e;
                    }
                } finally {
                    evaluator.callStackDepth--;
                }
            };
            
            if (name) env.define(name, func);
            return func;
        }
        default:
            return undefined;
    }
}
