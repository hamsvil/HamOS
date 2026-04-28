 
import { Opcode, OmniAST, OmniASTNode } from '../core/types';

// ============================================================================
// cHams V5.5: THE AEGIS TRANSPILER (AOT COMPILATION TO JS/TS) - PART 1
// ============================================================================

export class TranspilerPart1 {
    protected ast: OmniAST;
    protected indentLevel: number = 0;
    protected isTypeScript: boolean;

    constructor(ast: OmniAST, isTypeScript: boolean = true) {
        this.ast = ast;
        this.isTypeScript = isTypeScript;
    }

    public transpile(): string {
        let code = '';
        for (const node of this.ast) {
            code += this.transpileNode(node) + ';\n';
        }
        
        this.postEmitValidation(code);
        return code;
    }

    protected postEmitValidation(code: string): void {
        // Structural identity check: ensure balanced braces and parentheses
        let braces = 0;
        let parens = 0;
        let brackets = 0;
        let inString = false;
        let stringQuote = '';
        
        for (let i = 0; i < code.length; i++) {
            const char = code[i];
            if (!inString) {
                if (char === '{') braces++;
                else if (char === '}') braces--;
                else if (char === '(') parens++;
                else if (char === ')') parens--;
                else if (char === '[') brackets++;
                else if (char === ']') brackets--;
                else if (char === '"' || char === "'" || char === '`') {
                    inString = true;
                    stringQuote = char;
                }
            } else {
                if (char === stringQuote && code[i-1] !== '\\') {
                    inString = false;
                }
            }
        }
        
        if (braces !== 0 || parens !== 0 || brackets !== 0) {
            throw new Error(`[Transpiler Error] Structural mismatch detected in generated code. Braces: ${braces}, Parens: ${parens}, Brackets: ${brackets}. Possible truncation.`);
        }
    }

    protected indent(): string {
        return '    '.repeat(this.indentLevel);
    }

    protected transpilePattern(pattern: any): string {
        if (typeof pattern === 'string') return pattern;
        if (pattern.type === "array") {
            return `[${pattern.elements.map((el: any) => {
                if (el.type === "rest") return `...${el.name}`;
                return this.transpilePattern(el);
            }).join(', ')}]`;
        }
        if (pattern.type === "object") {
            return `{${pattern.properties.map((prop: any) => {
                if (prop.type === "rest") return `...${prop.name}`;
                if (prop.key === prop.value) return prop.key;
                return `${prop.key}: ${this.transpilePattern(prop.value)}`;
            }).join(', ')}}`;
        }
        return String(pattern);
    }

    protected transpileNode(node: OmniASTNode): string {
        if (node === null) return 'null';
        if (node === undefined) return 'undefined';
        if (typeof node === 'string') return node;
        if (typeof node === 'number' || typeof node === 'boolean') return String(node);

        let opcode: Opcode;
        let args: any[];

        if (Array.isArray(node)) {
            if (typeof node[0] === 'number') {
                // Legacy Array Node
                opcode = node[0] as Opcode;
                args = node.slice(1);
            } else {
                // It's a block of nodes
                return node.map(n => this.transpileNode(n)).join(';\n');
            }
        } else if (typeof node === 'object' && 'type' in node) {
            // New Object Node
            opcode = node.type;
            args = node.args;
        } else {
            return '';
        }

        switch (opcode) {
            case Opcode.LET:
            case Opcode.CONST:
            case Opcode.REACTIVE: {
                const pattern = args[0];
                const init = args[1] ? this.transpileNode(args[1]) : undefined;
                const typeAnnotation = args[2] as string | null;
                const isConst = args[3] as boolean;
                const keyword = isConst ? 'const' : 'let';
                const isReactive = opcode === Opcode.REACTIVE;

                let typeStr = '';
                if (this.isTypeScript && typeAnnotation) {
                    typeStr = `: ${typeAnnotation}`;
                }

                const patternStr = this.transpilePattern(pattern);

                if (isReactive) {
                    return `let /* reactive */ ${patternStr}${typeStr}${init !== undefined ? ` = ${init}` : ''}`;
                }

                return `${keyword} ${patternStr}${typeStr}${init !== undefined ? ` = ${init}` : ''}`;
            }
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
                    const key = args[i] as string | OmniASTNode;
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
            case Opcode.PRINT: return `console.log(${this.transpileNode(args[0])})`;
            case Opcode.IF: {
                const cond = this.transpileNode(args[0]);
                let code = `if (${cond}) {\n`;
                this.indentLevel++;
                const thenBranch = args[1] as OmniASTNode[];
                for (const stmt of thenBranch) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                
                if (args[2]) {
                    code += ' else {\n';
                    this.indentLevel++;
                    const elseBranch = args[2] as OmniASTNode[];
                    for (const stmt of elseBranch) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                    code += this.indent() + '}';
                }
                return code;
            }
            case Opcode.WHILE: {
                const cond = this.transpileNode(args[0]);
                let code = `while (${cond}) {\n`;
                this.indentLevel++;
                const body = args[1] as OmniASTNode[];
                for (const stmt of body) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.FOR: {
                const init = args[0] ? this.transpileNode(args[0]) : '';
                const cond = args[1] ? this.transpileNode(args[1]) : '';
                const inc = args[2] ? this.transpileNode(args[2]) : '';
                let code = `for (${init}; ${cond}; ${inc}) {\n`;
                this.indentLevel++;
                const body = args[3] as OmniASTNode[];
                for (const stmt of body) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.FOR_OF: {
                const varName = args[0] as string;
                const iterable = this.transpileNode(args[1]);
                const isConst = args[3] as boolean;
                const keyword = isConst ? 'const' : 'let';
                let code = `for (${keyword} ${varName} of ${iterable}) {\n`;
                this.indentLevel++;
                const body = args[2] as OmniASTNode[];
                for (const stmt of body) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.FOR_IN: {
                const varName = args[0] as string;
                const obj = this.transpileNode(args[1]);
                const isConst = args[3] as boolean;
                const keyword = isConst ? 'const' : 'let';
                let code = `for (${keyword} ${varName} in ${obj}) {\n`;
                this.indentLevel++;
                const body = args[2] as OmniASTNode[];
                for (const stmt of body) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.BREAK: return 'break';
            case Opcode.CONTINUE: return 'continue';
            case Opcode.RETURN: return `return ${args[0] ? this.transpileNode(args[0]) : ''}`;
            case Opcode.THROW: return `throw ${this.transpileNode(args[0])}`;
            default:
                return this.transpileNodePart2(opcode, args);
        }
    }
    
    protected transpileNodePart2(_opcode: Opcode, _args: any[]): string {
        // This method will be implemented in transpiler_part2.ts
        return '';
    }
}
