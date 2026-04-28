 
/* eslint-disable no-case-declarations */
import { Opcode, OmniAST, OmniASTNode, ChamsLanguage } from '../core/types';
import { DeparserDictionary } from '../core/dictionary';

// ============================================================================
// cHams V5.5: THE HOLOGRAPHIC DE-PARSER
// ============================================================================

/**
 * The Holographic De-Parser
 * Converts Omni-DNA (Minified JSON AST) back into human-readable text.
 * Translates instantly based on the target language.
 */
export class Deparser {
    private language: ChamsLanguage;
    private indentLevel: number = 0;

    constructor(language: ChamsLanguage = 'EN') {
        this.language = language;
    }

    private indent(): string {
        return '  '.repeat(this.indentLevel);
    }

    private getKeyword(opcode: Opcode): string {
        return DeparserDictionary[this.language][opcode] || `[UNKNOWN_OPCODE_${opcode}]`;
    }

    public deparse(ast: OmniAST): string {
        let result = '';
        for (const node of ast) {
            result += this.deparseNode(node) + '\n';
        }
        return result.trim();
    }

    private deparseNode(node: OmniASTNode): string {
        if (node === null) return 'null';
        if (typeof node === 'boolean') return node ? 'true' : 'false';
        if (typeof node === 'number') return node.toString();
        if (typeof node === 'string') {
            if (node.includes(' ') || node.includes('"') || node.includes('\n')) {
                return `"${node.replace(/"/g, '\\"')}"`;
            }
            return node; // Identifier
        }

        let opcode: Opcode;
        let args: any[];

        if (Array.isArray(node)) {
            if (node.length === 0) return '';
            opcode = node[0] as Opcode;
            args = node.slice(1);
        } else if (typeof node === 'object' && node !== null && 'type' in node) {
            opcode = node.type;
            args = node.args;
        } else {
            return '';
        }

        switch (opcode) {
            case Opcode.LET:
            case Opcode.CONST:
            case Opcode.REACTIVE:
                return `${this.indent()}${this.getKeyword(opcode)} ${args[0]}${args[1] !== undefined && args[1] !== null ? ` = ${this.deparseNode(args[1])}` : ''};`;
            
            case Opcode.ASSIGN:
                return `${this.deparseNode(args[0])} = ${this.deparseNode(args[1])}`;
            
            case Opcode.PRINT:
                return `${this.indent()}${this.getKeyword(Opcode.PRINT)}(${this.deparseNode(args[0])});`;
            
            case Opcode.BIND:
                return `${this.indent()}${this.getKeyword(Opcode.BIND)}(${this.deparseNode(args[0])} -> ${this.deparseNode(args[1])});`;
            
            case Opcode.RETURN:
                return `${this.indent()}${this.getKeyword(Opcode.RETURN)}${args[0] !== undefined && args[0] !== null ? ` ${this.deparseNode(args[0])}` : ''};`;
            
            case Opcode.OS_CALL:
                return `OS.${args[0]}`;
            
            case Opcode.CALL:
                const callee = this.deparseNode(args[0]);
                const callArgs = args.slice(1).map(arg => this.deparseNode(arg)).join(', ');
                return `${callee}(${callArgs})`;
            
            case Opcode.FUNC:
                const funcName = args[0];
                const params = (args[1] as string[]).join(', ');
                let funcStr = `${this.indent()}${this.getKeyword(Opcode.FUNC)} ${funcName}(${params}) {\n`;
                this.indentLevel++;
                funcStr += this.deparse(args[2] as OmniAST);
                this.indentLevel--;
                funcStr += `\n${this.indent()}}`;
                return funcStr;
            
            case Opcode.IF:
                let ifStr = `${this.indent()}${this.getKeyword(Opcode.IF)} (${this.deparseNode(args[0])}) {\n`;
                this.indentLevel++;
                ifStr += this.deparse(args[1] as OmniAST);
                this.indentLevel--;
                ifStr += `\n${this.indent()}}`;
                
                if (args[2] !== undefined && args[2] !== null) {
                    ifStr += ` ${this.getKeyword(Opcode.ELSE)} {\n`;
                    this.indentLevel++;
                    ifStr += this.deparse(args[2] as OmniAST);
                    this.indentLevel--;
                    ifStr += `\n${this.indent()}}`;
                }
                return ifStr;
            
            case Opcode.WHILE:
                let whileStr = `${this.indent()}${this.getKeyword(Opcode.WHILE)} (${this.deparseNode(args[0])}) {\n`;
                this.indentLevel++;
                whileStr += this.deparse(args[1] as OmniAST);
                this.indentLevel--;
                whileStr += `\n${this.indent()}}`;
                return whileStr;

            case Opcode.FOR:
                let forStr = `${this.indent()}${this.getKeyword(Opcode.FOR)} (${args[0] ? this.deparseNode(args[0]) : ''}; ${args[1] ? this.deparseNode(args[1]) : ''}; ${args[2] ? this.deparseNode(args[2]) : ''}) {\n`;
                this.indentLevel++;
                forStr += this.deparse(args[3] as OmniAST);
                this.indentLevel--;
                forStr += `\n${this.indent()}}`;
                return forStr;

            case Opcode.BLOCK:
                let blockStr = `${this.indent()}{\n`;
                this.indentLevel++;
                blockStr += this.deparse(args[0] as OmniAST);
                this.indentLevel--;
                blockStr += `\n${this.indent()}}`;
                return blockStr;

            case Opcode.CLASS:
                let classStr = `${this.indent()}${this.getKeyword(Opcode.CLASS)} ${args[0]}${args[1] ? ` ${this.getKeyword(Opcode.EXTENDS)} ${args[1]}` : ''} {\n`;
                this.indentLevel++;
                for (const method of args[2] as OmniASTNode[]) {
                    classStr += this.deparseNode(method) + '\n';
                }
                this.indentLevel--;
                classStr += `${this.indent()}}`;
                return classStr;

            case Opcode.TRY:
                let tryStr = `${this.indent()}${this.getKeyword(Opcode.TRY)} {\n`;
                this.indentLevel++;
                tryStr += this.deparse(args[0] as OmniAST);
                this.indentLevel--;
                tryStr += `\n${this.indent()}}`;
                
                if (args[1]) {
                    tryStr += ` ${this.getKeyword(Opcode.CATCH)}${args[1].param ? ` (${args[1].param})` : ''} {\n`;
                    this.indentLevel++;
                    tryStr += this.deparse(args[1].body as OmniAST);
                    this.indentLevel--;
                    tryStr += `\n${this.indent()}}`;
                }
                
                if (args[2]) {
                    tryStr += ` ${this.getKeyword(Opcode.FINALLY)} {\n`;
                    this.indentLevel++;
                    tryStr += this.deparse(args[2] as OmniAST);
                    this.indentLevel--;
                    tryStr += `\n${this.indent()}}`;
                }
                return tryStr;

            case Opcode.GET:
                return `${this.deparseNode(args[0])}.${args[1]}`;
            
            case Opcode.SET:
                return `${this.deparseNode(args[0])}.${args[1]} = ${this.deparseNode(args[2])}`;

            case Opcode.ARRAY:
                return `[${args.map(arg => this.deparseNode(arg)).join(', ')}]`;
            
            case Opcode.OBJECT:
                const props = [];
                for (let i = 0; i < args.length; i += 2) {
                    props.push(`${args[i]}: ${this.deparseNode(args[i + 1])}`);
                }
                return `{ ${props.join(', ')} }`;

            // Binary Operators
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
                return `${this.deparseNode(args[0])} ${this.getKeyword(opcode)} ${this.deparseNode(args[1])}`;
            
            default:
                return `/* UNKNOWN_NODE: ${opcode} */`;
        }
    }
}
