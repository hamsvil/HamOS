 
import { Opcode } from '../core/types';
import { Environment } from './memory';
import { EvaluatorCore } from './evaluator_core';

export abstract class EvaluatorExpressions_Part1 extends EvaluatorCore {
    protected fixPrecision(val: any): any {
        if (typeof val === 'number' && !Number.isInteger(val)) {
            return Number(val.toFixed(10));
        }
        return val;
    }

    protected async evaluateBinaryOp(opcode: Opcode, args: any[], env: Environment): Promise<{ handled: boolean, value?: any }> {
        switch (opcode) {
            case Opcode.ADD: {
                const left = await this.evaluateNode(args[0], env);
                const right = await this.evaluateNode(args[1], env);
                if (typeof left === 'string' && !isNaN(Number(left)) && typeof right === 'number') {
                    return { handled: true, value: this.fixPrecision(Number(left) + right) };
                }
                if (typeof right === 'string' && !isNaN(Number(right)) && typeof left === 'number') {
                    return { handled: true, value: this.fixPrecision(left + Number(right)) };
                }
                if (typeof left === 'string' && typeof right === 'string' && !isNaN(Number(left)) && !isNaN(Number(right))) {
                    return { handled: true, value: this.fixPrecision(Number(left) + Number(right)) };
                }
                if (typeof left === 'number' && typeof right === 'number') {
                    return { handled: true, value: this.fixPrecision(left + right) };
                }
                return { handled: true, value: left + right };
            }
            case Opcode.SUB: return { handled: true, value: this.fixPrecision((await this.evaluateNode(args[0], env)) - (await this.evaluateNode(args[1], env))) };
            case Opcode.MUL: return { handled: true, value: this.fixPrecision((await this.evaluateNode(args[0], env)) * (await this.evaluateNode(args[1], env))) };
            case Opcode.DIV: {
                const right = await this.evaluateNode(args[1], env);
                if (right === 0) throw new Error("[Runtime Error] Division by zero.");
                return { handled: true, value: this.fixPrecision((await this.evaluateNode(args[0], env)) / right) };
            }
            case Opcode.EQ: return { handled: true, value: (await this.evaluateNode(args[0], env)) == (await this.evaluateNode(args[1], env)) };
            case Opcode.NEQ: return { handled: true, value: (await this.evaluateNode(args[0], env)) != (await this.evaluateNode(args[1], env)) };
            case Opcode.STRICT_EQ: return { handled: true, value: (await this.evaluateNode(args[0], env)) === (await this.evaluateNode(args[1], env)) };
            case Opcode.STRICT_NEQ: return { handled: true, value: (await this.evaluateNode(args[0], env)) !== (await this.evaluateNode(args[1], env)) };
            case Opcode.GT: return { handled: true, value: (await this.evaluateNode(args[0], env)) > (await this.evaluateNode(args[1], env)) };
            case Opcode.LT: return { handled: true, value: (await this.evaluateNode(args[0], env)) < (await this.evaluateNode(args[1], env)) };
            case Opcode.GTE: return { handled: true, value: (await this.evaluateNode(args[0], env)) >= (await this.evaluateNode(args[1], env)) };
            case Opcode.LTE: return { handled: true, value: (await this.evaluateNode(args[0], env)) <= (await this.evaluateNode(args[1], env)) };
            case Opcode.AND: return { handled: true, value: this.isTruthy(await this.evaluateNode(args[0], env)) && this.isTruthy(await this.evaluateNode(args[1], env)) };
            case Opcode.OR: return { handled: true, value: this.isTruthy(await this.evaluateNode(args[0], env)) || this.isTruthy(await this.evaluateNode(args[1], env)) };
            case Opcode.MOD: return { handled: true, value: this.fixPrecision((await this.evaluateNode(args[0], env)) % (await this.evaluateNode(args[1], env))) };
            case Opcode.EXP: return { handled: true, value: Math.pow(await this.evaluateNode(args[0], env), await this.evaluateNode(args[1], env)) };
            case Opcode.BIT_OR: return { handled: true, value: (await this.evaluateNode(args[0], env)) | (await this.evaluateNode(args[1], env)) };
            case Opcode.BIT_XOR: return { handled: true, value: (await this.evaluateNode(args[0], env)) ^ (await this.evaluateNode(args[1], env)) };
            case Opcode.BIT_AND: return { handled: true, value: (await this.evaluateNode(args[0], env)) & (await this.evaluateNode(args[1], env)) };
            case Opcode.BIT_LSHIFT: return { handled: true, value: (await this.evaluateNode(args[0], env)) << (await this.evaluateNode(args[1], env)) };
            case Opcode.BIT_RSHIFT: return { handled: true, value: (await this.evaluateNode(args[0], env)) >> (await this.evaluateNode(args[1], env)) };
            case Opcode.NOT: return { handled: true, value: !this.isTruthy(await this.evaluateNode(args[0], env)) };
            case Opcode.TYPEOF: return { handled: true, value: typeof (await this.evaluateNode(args[0], env)) };
            case Opcode.SPREAD: return { handled: true, value: await this.evaluateNode(args[0], env) };
            case Opcode.AWAIT: return { handled: true, value: await this.evaluateNode(args[0], env) };
            
            case Opcode.TERNARY: {
                const condition = await this.evaluateNode(args[0], env);
                if (this.isTruthy(condition)) {
                    return { handled: true, value: await this.evaluateNode(args[1], env) };
                } else {
                    return { handled: true, value: await this.evaluateNode(args[2], env) };
                }
            }
            case Opcode.INC: {
                const target = args[0];
                const isPrefix = args[1];
                let value;

                let targetOpcode: Opcode | null = null;
                let targetArgs: any[] = [];
                if (Array.isArray(target)) {
                    targetOpcode = target[0];
                    targetArgs = target.slice(1);
                } else if (typeof target === 'object' && target !== null && 'type' in target) {
                    targetOpcode = target.type;
                    targetArgs = target.args;
                }

                if (typeof target === 'string') {
                    value = env.get(target);
                    env.assign(target, value + 1);
                } else if (targetOpcode === Opcode.GET) {
                    const obj = await this.evaluateNode(targetArgs[0], env);
                    const prop = await this.evaluateNode(targetArgs[1], env);
                    value = obj[prop];
                    obj[prop] = value + 1;
                    if (obj.__bindings__ && obj.__bindings__[prop]) {
                        for (const b of obj.__bindings__[prop]) {
                            await this.assignToTarget(b, value + 1, env);
                        }
                    }
                } else {
                    throw new Error(`[Runtime Error] Invalid increment target.`);
                }
                return { handled: true, value: isPrefix ? value + 1 : value };
            }
            case Opcode.DEC: {
                const target = args[0];
                const isPrefix = args[1];
                let value;

                let targetOpcode: Opcode | null = null;
                let targetArgs: any[] = [];
                if (Array.isArray(target)) {
                    targetOpcode = target[0];
                    targetArgs = target.slice(1);
                } else if (typeof target === 'object' && target !== null && 'type' in target) {
                    targetOpcode = target.type;
                    targetArgs = target.args;
                }

                if (typeof target === 'string') {
                    value = env.get(target);
                    env.assign(target, value - 1);
                } else if (targetOpcode === Opcode.GET) {
                    const obj = await this.evaluateNode(targetArgs[0], env);
                    const prop = await this.evaluateNode(targetArgs[1], env);
                    value = obj[prop];
                    obj[prop] = value - 1;
                    if (obj.__bindings__ && obj.__bindings__[prop]) {
                        for (const b of obj.__bindings__[prop]) {
                            await this.assignToTarget(b, value - 1, env);
                        }
                    }
                } else {
                    throw new Error(`[Runtime Error] Invalid decrement target.`);
                }
                return { handled: true, value: isPrefix ? value - 1 : value };
            }

            case Opcode.ADD_ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                const current = env.get(name);
                env.assign(name, current + value);
                return { handled: true, value: current + value };
            }
            case Opcode.SUB_ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                const current = env.get(name);
                env.assign(name, current - value);
                return { handled: true, value: current - value };
            }
            case Opcode.MUL_ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                const current = env.get(name);
                env.assign(name, current * value);
                return { handled: true, value: current * value };
            }
            case Opcode.DIV_ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                if (value === 0) throw new Error("[Runtime Error] Division by zero.");
                const current = env.get(name);
                env.assign(name, current / value);
                return { handled: true, value: current / value };
            }
            case Opcode.MOD_ASSIGN: {
                const name = args[0] as string;
                const value = await this.evaluateNode(args[1], env);
                const current = env.get(name);
                env.assign(name, current % value);
                return { handled: true, value: current % value };
            }
        }
        return { handled: false };
    }
}
