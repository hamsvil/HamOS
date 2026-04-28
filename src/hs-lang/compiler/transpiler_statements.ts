 
import { Opcode, HamASTNode } from '../core/types';
import { TranspilerExpressions } from './transpiler_expressions';

export abstract class TranspilerStatements extends TranspilerExpressions {
    protected transpileStatement(opcode: Opcode, args: any[]): string | null {
        switch (opcode) {
            case Opcode.PRINT: return `console.log(${this.transpileNode(args[0])})`;
            case Opcode.IF: {
                const cond = this.transpileNode(args[0]);
                let code = `if (${cond}) {\n`;
                this.indentLevel++;
                const thenBranch = args[1] as HamASTNode[];
                for (const stmt of thenBranch) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                
                if (args[2]) {
                    code += ' else {\n';
                    this.indentLevel++;
                    const elseBranch = args[2] as HamASTNode[];
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
                const body = args[1] as HamASTNode[];
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
                const body = args[3] as HamASTNode[];
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
                const body = args[2] as HamASTNode[];
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
                const body = args[2] as HamASTNode[];
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
            case Opcode.TRY: {
                let code = `try {\n`;
                this.indentLevel++;
                const tryBlock = args[0] as HamASTNode[];
                for (const stmt of tryBlock) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                
                if (args[2]) {
                    const catchParam = args[1] as string | null;
                    code += ` catch ${catchParam ? `(${catchParam}) ` : ''}{\n`;
                    this.indentLevel++;
                    const catchBlock = args[2] as HamASTNode[];
                    for (const stmt of catchBlock) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                    code += this.indent() + '}';
                }
                
                if (args[3]) {
                    code += ` finally {\n`;
                    this.indentLevel++;
                    const finallyBlock = args[3] as HamASTNode[];
                    for (const stmt of finallyBlock) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                    code += this.indent() + '}';
                }
                return code;
            }
            case Opcode.SWITCH: {
                const cond = this.transpileNode(args[0]);
                let code = `switch (${cond}) {\n`;
                this.indentLevel++;
                const cases = args[1] as any[];
                for (const c of cases) {
                    const caseOp = Array.isArray(c) ? c[0] : c.type;
                    const caseArgs = Array.isArray(c) ? c.slice(1) : c.args;
                    code += this.indent() + `case ${this.transpileNode(caseArgs[0])}:\n`;
                    this.indentLevel++;
                    for (const stmt of caseArgs[1]) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                }
                const defaultCase = args[2] as HamASTNode[] | null;
                if (defaultCase) {
                    code += this.indent() + `default:\n`;
                    this.indentLevel++;
                    for (const stmt of defaultCase) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                }
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.PARALLEL: {
                const stmts = args.map(stmt => this.transpileNode(stmt)).join(', ');
                return `await Promise.all([${stmts}])`;
            }
            default:
                return null;
        }
    }
}
