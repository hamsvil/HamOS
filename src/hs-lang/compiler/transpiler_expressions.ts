 
import { Opcode, HamASTNode } from '../core/types';
import { TranspilerBase } from './transpiler_base';

export abstract class TranspilerExpressions extends TranspilerBase {
    protected transpileExpression(opcode: Opcode, args: any[]): string | null {
        switch (opcode) {
            case Opcode.ASSIGN: {
                const name = args[0] as string;
                const value = this.transpileNode(args[1]);
                return `${name} = ${value}`;
            }
            case Opcode.ADD:
            case Opcode.SUB:
            case Opcode.MUL:
            case Opcode.DIV:
            case Opcode.MOD:
            case Opcode.EXP:
            case Opcode.EQ:
            case Opcode.NEQ:
            case Opcode.STRICT_EQ:
            case Opcode.STRICT_NEQ:
            case Opcode.GT:
            case Opcode.LT:
            case Opcode.GTE:
            case Opcode.LTE:
            case Opcode.AND:
            case Opcode.OR:
            case Opcode.BIT_OR:
            case Opcode.BIT_XOR:
            case Opcode.BIT_AND:
            case Opcode.BIT_LSHIFT:
            case Opcode.BIT_RSHIFT:
            case Opcode.NULLISH: {
                const opMap: Record<number, string> = {
                    [Opcode.ADD]: '+', [Opcode.SUB]: '-', [Opcode.MUL]: '*', [Opcode.DIV]: '/',
                    [Opcode.MOD]: '%', [Opcode.EXP]: '**', [Opcode.EQ]: '==', [Opcode.NEQ]: '!=',
                    [Opcode.STRICT_EQ]: '===', [Opcode.STRICT_NEQ]: '!==', [Opcode.GT]: '>',
                    [Opcode.LT]: '<', [Opcode.GTE]: '>=', [Opcode.LTE]: '<=', [Opcode.AND]: '&&',
                    [Opcode.OR]: '||', [Opcode.BIT_OR]: '|', [Opcode.BIT_XOR]: '^', [Opcode.BIT_AND]: '&',
                    [Opcode.BIT_LSHIFT]: '<<', [Opcode.BIT_RSHIFT]: '>>', [Opcode.NULLISH]: '??'
                };
                return `(${this.transpileNode(args[0])} ${opMap[opcode]} ${this.transpileNode(args[1])})`;
            }
            case Opcode.NOT: return `!(${this.transpileNode(args[0])})`;
            case Opcode.TYPEOF: return `typeof (${this.transpileNode(args[0])})`;
            case Opcode.SPREAD: return `...${this.transpileNode(args[0])}`;
            case Opcode.AWAIT: return `await ${this.transpileNode(args[0])}`;
            case Opcode.GET: return `${this.transpileNode(args[0])}[${this.transpileNode(args[1])}]`;
            case Opcode.OPTIONAL_CHAIN: return `${this.transpileNode(args[0])}?.${this.transpileNode(args[1]).replace(/^"|"$/g, '')}`;
            case Opcode.SET: return `${this.transpileNode(args[0])}[${this.transpileNode(args[1])}] = ${this.transpileNode(args[2])}`;
            case Opcode.CALL: {
                const callee = this.transpileNode(args[0]);
                const callArgs = args.slice(1).map(arg => this.transpileNode(arg)).join(', ');
                return `${callee}(${callArgs})`;
            }
            case Opcode.OS_CALL: {
                const funcName = args[0] as string;
                const callArgs = args.slice(1).map(arg => this.transpileNode(arg)).join(', ');
                return `OS.${funcName}(${callArgs})`;
            }
            case Opcode.NEW: {
                const expr = this.transpileNode(args[0]);
                return `new ${expr}`;
            }
            case Opcode.THIS: return 'this';
            case Opcode.SUPER: return 'super';
            case Opcode.ARRAY: {
                const elements = args.map(el => this.transpileNode(el)).join(', ');
                return `[${elements}]`;
            }
            case Opcode.OBJECT: {
                const props = [];
                for (let i = 0; i < args.length; i += 2) {
                    const key = args[i] as string | HamASTNode;
                    if (typeof key === 'object' && key !== null && !Array.isArray(key) && 'type' in key && key.type === Opcode.SPREAD) {
                        props.push(`...${this.transpileNode(key.args[0])}`);
                    } else if (Array.isArray(key) && key[0] === Opcode.SPREAD) {
                        props.push(`...${this.transpileNode(key[1])}`);
                    } else {
                        const valNode = args[i + 1];
                        const value = this.transpileNode(valNode);
                        if (typeof key === 'string' && key === value) {
                            props.push(key);
                        } else {
                            props.push(`${key}: ${value}`);
                        }
                    }
                }
                return `{ ${props.join(', ')} }`;
            }
            case Opcode.TERNARY: {
                const cond = this.transpileNode(args[0]);
                const trueExpr = this.transpileNode(args[1]);
                const falseExpr = this.transpileNode(args[2]);
                return `(${cond} ? ${trueExpr} : ${falseExpr})`;
            }
            case Opcode.INC: {
                const target = this.transpileNode(args[0]);
                const isPrefix = args[1] as boolean;
                return isPrefix ? `++${target}` : `${target}++`;
            }
            case Opcode.DEC: {
                const target = this.transpileNode(args[0]);
                const isPrefix = args[1] as boolean;
                return isPrefix ? `--${target}` : `${target}--`;
            }
            case Opcode.BIND: {
                const source = this.transpileNode(args[0]);
                const target = this.transpileNode(args[1]);
                return `/* bind(${source} -> ${target}) */`;
            }
            default:
                return null;
        }
    }
}
