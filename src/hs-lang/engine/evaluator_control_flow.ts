/* eslint-disable no-useless-assignment */
import { HamASTNode, Opcode, HamAST } from '../core/types';
import { Environment } from './memory';

export async function handleControlFlow(evaluator: any, opcode: Opcode, args: any[], env: Environment): Promise<any> {
    switch (opcode) {
        case Opcode.IF: {
            const condition = await evaluator.evaluateNode(args[0], env);
            if (evaluator.isTruthy(condition)) {
                return await evaluator.evaluate(args[1] as HamAST, new Environment(env));
            } else if (args[2] !== null) {
                return await evaluator.evaluate(args[2] as HamAST, new Environment(env));
            }
            return null;
        }
        case Opcode.WHILE: {
            let result = null;
            while (evaluator.isTruthy(await evaluator.evaluateNode(args[0], env))) {
                try {
                    result = await evaluator.evaluate(args[1] as HamAST, new Environment(env));
                } catch (e: any) {
                    if (e.isBreak) break;
                    if (e.isContinue) continue;
                    throw e;
                }
            }
            return result;
        }
        case Opcode.FOR: {
            let result = null;
            const forEnv = new Environment(env);
            if (args[0]) await evaluator.evaluateNode(args[0], forEnv);
            while (evaluator.isTruthy(await evaluator.evaluateNode(args[1], forEnv))) {
                try {
                    result = await evaluator.evaluate(args[3] as HamAST, new Environment(forEnv));
                } catch (e: any) {
                    if (e.isBreak) break;
                    if (e.isContinue) {
                        if (args[2]) await evaluator.evaluateNode(args[2], forEnv);
                        continue;
                    }
                    throw e;
                }
                if (args[2]) await evaluator.evaluateNode(args[2], forEnv);
            }
            return result;
        }
        case Opcode.FOR_OF: {
            const varName = args[0] as string;
            const iterable = await evaluator.evaluateNode(args[1], env);
            const body = args[2] as HamAST;
            const isConst = args[3] as boolean;
            if (!iterable || typeof iterable[Symbol.iterator] !== 'function') {
                throw new Error(`[Runtime Error] Target is not iterable in for...of loop.`);
            }
            let result = null;
            for (const item of iterable) {
                const loopEnv = new Environment(env);
                loopEnv.define(varName, item, isConst);
                try {
                    result = await evaluator.evaluate(body, loopEnv);
                } catch (e: any) {
                    if (e.isBreak) break;
                    if (e.isContinue) continue;
                    throw e;
                }
            }
            return result;
        }
        case Opcode.FOR_IN: {
            const varName = args[0] as string;
            const obj = await evaluator.evaluateNode(args[1], env);
            const body = args[2] as HamAST;
            const isConst = args[3] as boolean;
            if (obj === null || obj === undefined) {
                throw new Error(`[Runtime Error] Cannot iterate over null or undefined in for...in loop.`);
            }
            let result = null;
            for (const key in obj) {
                const loopEnv = new Environment(env);
                loopEnv.define(varName, key, isConst);
                try {
                    result = await evaluator.evaluate(body, loopEnv);
                } catch (e: any) {
                    if (e.isBreak) break;
                    if (e.isContinue) continue;
                    throw e;
                }
            }
            return result;
        }
        case Opcode.SWITCH: {
            const condition = await evaluator.evaluateNode(args[0], env);
            const cases = args[1] as any[];
            const defaultCase = args[2] as HamASTNode[] | null;
            let matched = false;
            let result = null;
            const switchEnv = new Environment(env);
            for (const c of cases) {
                let caseOpcode: Opcode | null = null;
                let caseArgs: any[] = [];
                if (Array.isArray(c)) {
                    caseOpcode = c[0];
                    caseArgs = c.slice(1);
                } else if (typeof c === 'object' && c !== null && 'type' in c) {
                    caseOpcode = c.type;
                    caseArgs = c.args;
                }
                const caseVal = await evaluator.evaluateNode(caseArgs[0], env);
                if (matched || condition === caseVal) {
                    matched = true;
                    try {
                        result = await evaluator.evaluate(caseArgs[1] as HamAST, switchEnv);
                    } catch (e: any) {
                        if (e.isBreak) break;
                        throw e;
                    }
                }
            }
            if (!matched && defaultCase) {
                try {
                    result = await evaluator.evaluate(defaultCase as HamAST, switchEnv);
                } catch (e: any) {
                    if (e.isBreak) return result;
                    throw e;
                }
            }
            return result;
        }
        case Opcode.TRY: {
            let result = null;
            try {
                result = await evaluator.evaluate(args[0] as HamAST, new Environment(env));
            } catch (e: any) {
                if (e.isReturn || e.isBreak || e.isContinue) throw e;
                if (args[2]) {
                    const catchEnv = new Environment(env);
                    if (args[1]) catchEnv.define(args[1] as string, e.message || e);
                    result = await evaluator.evaluate(args[2] as HamAST, catchEnv);
                } else {
                    throw e;
                }
            } finally {
                if (args[3]) {
                    await evaluator.evaluate(args[3] as HamAST, new Environment(env));
                }
            }
            return result;
        }
        case Opcode.RETURN: {
            const value = args[0] !== null ? await evaluator.evaluateNode(args[0], env) : null;
            throw { isReturn: true, value };
        }
        default:
            return undefined;
    }
}
