 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { Opcode, HamASTNode } from '../core/types';
import { TranspilerDeclarations } from './transpiler_declarations';

// ============================================================================
// Ham Engine V5.5: THE AEGIS TRANSPILER (AOT COMPILATION TO JS/TS)
// ============================================================================

export class Transpiler extends TranspilerDeclarations {
    public transpile(): string {
        let code = '';
        for (const node of this.ast) {
            code += this.transpileNode(node) + ';\n';
        }
        
        this.postEmitValidation(code);
        return code;
    }

    private postEmitValidation(code: string): void {
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

    protected transpileNode(node: HamASTNode): string {
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

        const decl = this.transpileDeclaration(opcode, args);
        if (decl !== null) return decl;

        const stmt = this.transpileStatement(opcode, args);
        if (stmt !== null) return stmt;

        const expr = this.transpileExpression(opcode, args);
        if (expr !== null) return expr;

        return `/* Unknown Opcode: ${opcode} */`;
    }
}
