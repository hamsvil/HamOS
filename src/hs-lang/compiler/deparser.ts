 
/* eslint-disable no-case-declarations */
import { Opcode, HamAST, HamASTNode, HamEngineLanguage } from '../core/types';
import { DeparserDictionary } from '../core/dictionary';

// ============================================================================
// Ham Engine V5.5: THE HOLOGRAPHIC DE-PARSER
// ============================================================================

/**
 * The Holographic De-Parser
 * Converts Ham-DNA (Minified JSON AST) back into human-readable text.
 * Translates instantly based on the target language.
 */
export class Deparser {
    private language: HamEngineLanguage;
    private indentLevel: number = 0;

    constructor(language: HamEngineLanguage = 'EN') {
        this.language = language;
    }

    private indent(): string {
        return '  '.repeat(this.indentLevel);
    }

    private getKeyword(opcode: Opcode): string {
        return DeparserDictionary[this.language][opcode] || `[UNKNOWN_OPCODE_${opcode}]`;
    }

    public deparse(ast: HamAST): string {
        let result = '';
        for (const node of ast) {
            result += this.deparseNode(node) + '\n';
        }
        return result.trim();
    }

    private deparseNode(node: HamASTNode): string {
        if (node === null) return 'null';
        if (typeof node === 'boolean') return node ? 'true' : 'false';
        if (typeof node === 'number') return node.toString();
        if (typeof node === 'string') {
            // In Ham Engine AST, string literals are wrapped in quotes (e.g. '"hello"').
            // Identifiers do not have quotes (e.g. 'x').
            if (node.startsWith('"') && node.endsWith('"')) {
                return node; // It's already a string literal
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
            return `/* INVALID_NODE: ${JSON.stringify(node)} */`;
        }
            
        switch (opcode) {
            case Opcode.LET:
            case Opcode.CONST:
                return `${this.indent()}${this.getKeyword(opcode)} ${args[0]}${args[1] !== null ? ` = ${this.deparseNode(args[1])}` : ''};`;
            
            case Opcode.TYPE_DECL:
                return `${this.indent()}${this.getKeyword(Opcode.TYPE_DECL)} ${args[0]} = ${this.deparseNode(args[1])};`;

            case Opcode.INTERFACE_DECL: {
                const name = args[0];
                const extendsList = args[1] as string[];
                const body = args[2] as { name: string, type: string, optional: boolean }[];
                let intStr = `${this.indent()}${this.getKeyword(Opcode.INTERFACE_DECL)} ${name}`;
                if (extendsList && extendsList.length > 0) {
                    intStr += ` ${this.getKeyword(Opcode.EXTENDS)} ${extendsList.join(', ')}`;
                }
                intStr += ` {\n`;
                this.indentLevel++;
                for (const prop of body) {
                    intStr += `${this.indent()}${prop.name}${prop.optional ? '?' : ''}: ${prop.type};\n`;
                }
                this.indentLevel--;
                intStr += `${this.indent()}}`;
                return intStr;
            }

            case Opcode.ASSIGN:
                return `${this.deparseNode(args[0])} = ${this.deparseNode(args[1])}`;
            
            case Opcode.PRINT:
                return `${this.indent()}${this.getKeyword(Opcode.PRINT)}(${this.deparseNode(args[0])});`;
            
            case Opcode.BIND:
                return `${this.indent()}${this.getKeyword(Opcode.BIND)}(${this.deparseNode(args[0])} -> ${this.deparseNode(args[1])});`;
            
            case Opcode.RETURN:
                return `${this.indent()}${this.getKeyword(Opcode.RETURN)}${args[0] !== null ? ` ${this.deparseNode(args[0])}` : ''};`;
            
            case Opcode.OS_CALL:
                return `OS.${args[0]}`;
            
            case Opcode.CALL:
                const callee = this.deparseNode(args[0]);
                const callArgs = args.slice(1).map(arg => this.deparseNode(arg)).join(', ');
                return `${callee}(${callArgs})`;
            
            case Opcode.FUNC:
                const funcName = args[0];
                const params = (args[1] as {name: string, type: string | null}[]).map(p => p.type ? `${p.name}: ${p.type}` : p.name).join(', ');
                let funcStr = `${this.indent()}${this.getKeyword(Opcode.FUNC)} ${funcName}(${params}) {\n`;
                this.indentLevel++;
                funcStr += this.deparse(args[2] as HamAST);
                this.indentLevel--;
                funcStr += `\n${this.indent()}}`;
                return funcStr;
            
            case Opcode.CLASS:
                const className = args[0];
                const superclass = args[1];
                const methods = args[2] as HamASTNode[];
                let classStr = `${this.indent()}${this.getKeyword(Opcode.CLASS)} ${className}`;
                if (superclass) {
                    classStr += ` ${this.getKeyword(Opcode.EXTENDS)} ${superclass}`;
                }
                classStr += ` {\n`;
                this.indentLevel++;
                for (const method of methods) {
                    classStr += this.deparseNode(method) + '\n';
                }
                this.indentLevel--;
                classStr += `${this.indent()}}`;
                return classStr;

            case Opcode.NEW:
                return `${this.getKeyword(Opcode.NEW)} ${this.deparseNode(args[0])}`;

            case Opcode.THIS:
                return this.getKeyword(Opcode.THIS);

            case Opcode.SUPER:
                return this.getKeyword(Opcode.SUPER);

            case Opcode.GET: {
                const obj = this.deparseNode(args[0]);
                const keyNode = args[1];
                if (typeof keyNode === 'string' && keyNode.startsWith('"') && keyNode.endsWith('"')) {
                    const key = keyNode.slice(1, -1);
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                        return `${obj}.${key}`;
                    }
                }
                return `${obj}[${this.deparseNode(keyNode)}]`;
            }

            case Opcode.SET: {
                const obj = this.deparseNode(args[0]);
                const keyNode = args[1];
                const value = this.deparseNode(args[2]);
                let access = `[${this.deparseNode(keyNode)}]`;
                if (typeof keyNode === 'string' && keyNode.startsWith('"') && keyNode.endsWith('"')) {
                    const key = keyNode.slice(1, -1);
                    if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                        access = `.${key}`;
                    }
                }
                return `${obj}${access} = ${value}`;
            }

            case Opcode.AWAIT:
                return `${this.getKeyword(Opcode.AWAIT)} ${this.deparseNode(args[0])}`;
                
            case Opcode.SPREAD:
                return `...${this.deparseNode(args[0])}`;
                
            case Opcode.ARRAY:
                return `[${args.map(el => this.deparseNode(el)).join(', ')}]`;

            case Opcode.OBJECT: {
                const props: string[] = [];
                for (let i = 0; i < args.length; i += 2) {
                    const keyNode = args[i];
                    // Check if it's a spread node
                    const isSpread = (Array.isArray(keyNode) && keyNode[0] === Opcode.SPREAD) || 
                                     (typeof keyNode === 'object' && keyNode !== null && 'type' in keyNode && keyNode.type === Opcode.SPREAD);

                    if (isSpread) {
                        const spreadArg = Array.isArray(keyNode) ? keyNode[1] : (keyNode as any).args[0];
                        props.push(`...${this.deparseNode(spreadArg)}`);
                        i--; // Adjust loop index because spread only takes 1 slot
                    } else {
                        const valNode = args[i + 1];
                        let keyStr = this.deparseNode(keyNode);
                        if (typeof keyNode === 'string' && keyNode.startsWith('"') && keyNode.endsWith('"')) {
                            const key = keyNode.slice(1, -1);
                            if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(key)) {
                                keyStr = key;
                            }
                        }
                        // Shorthand property
                        if (typeof valNode === 'string' && valNode === keyStr) {
                            props.push(keyStr);
                        } else {
                            props.push(`${keyStr}: ${this.deparseNode(valNode)}`);
                        }
                    }
                }
                return `{ ${props.join(', ')} }`;
            }
            
            case Opcode.WHILE:
                let whileStr = `${this.indent()}${this.getKeyword(Opcode.WHILE)} (${this.deparseNode(args[0])}) {\n`;
                this.indentLevel++;
                whileStr += this.deparse(args[1] as HamAST);
                this.indentLevel--;
                whileStr += `\n${this.indent()}}`;
                return whileStr;

            case Opcode.FOR_OF:
            case Opcode.FOR_IN: {
                const isForOf = opcode === Opcode.FOR_OF;
                const loopType = isForOf ? this.getKeyword(Opcode.OF) : this.getKeyword(Opcode.IN);
                const varName = args[0] as string;
                const iterable = this.deparseNode(args[1]);
                const body = args[2] as HamAST;
                const isConst = args[3] as boolean;
                
                let forStr = `${this.indent()}${this.getKeyword(Opcode.FOR)} (${isConst ? this.getKeyword(Opcode.CONST) : this.getKeyword(Opcode.LET)} ${varName} ${loopType} ${iterable}) {\n`;
                this.indentLevel++;
                forStr += this.deparse(body);
                this.indentLevel--;
                forStr += `\n${this.indent()}}`;
                return forStr;
            }

            case Opcode.FOR: {
                let forStr = `${this.indent()}${this.getKeyword(Opcode.FOR)} (`;
                if (args[0]) forStr += this.deparseNode(args[0]).trim().replace(/;$/, '');
                forStr += '; ';
                if (args[1]) forStr += this.deparseNode(args[1]);
                forStr += '; ';
                if (args[2]) forStr += this.deparseNode(args[2]);
                forStr += `) {\n`;
                this.indentLevel++;
                forStr += this.deparse(args[3] as HamAST);
                this.indentLevel--;
                forStr += `\n${this.indent()}}`;
                return forStr;
            }

            case Opcode.BREAK:
                return `${this.indent()}${this.getKeyword(Opcode.BREAK)};`;

            case Opcode.CONTINUE:
                return `${this.indent()}${this.getKeyword(Opcode.CONTINUE)};`;

            case Opcode.TRY:
                let tryStr = `${this.indent()}${this.getKeyword(Opcode.TRY)} {\n`;
                this.indentLevel++;
                tryStr += this.deparse(args[0] as HamAST);
                this.indentLevel--;
                tryStr += `\n${this.indent()}}`;
                if (args[2]) {
                    if (args[1]) {
                        tryStr += ` ${this.getKeyword(Opcode.CATCH)} (${args[1]}) {\n`;
                    } else {
                        tryStr += ` ${this.getKeyword(Opcode.CATCH)} {\n`;
                    }
                    this.indentLevel++;
                    tryStr += this.deparse(args[2] as HamAST);
                    this.indentLevel--;
                    tryStr += `\n${this.indent()}}`;
                }
                if (args[3]) {
                    tryStr += ` ${this.getKeyword(Opcode.FINALLY)} {\n`;
                    this.indentLevel++;
                    tryStr += this.deparse(args[3] as HamAST);
                    this.indentLevel--;
                    tryStr += `\n${this.indent()}}`;
                }
                return tryStr;

            case Opcode.IMPORT: {
                if (args.length === 1) {
                    return `${this.indent()}${this.getKeyword(Opcode.IMPORT)} "${args[0]}";`;
                }
                const moduleName = args[0] as string;
                const defaultImport = args[1] as string | null;
                const namedImports = args[2] as { name: string, alias: string }[];
                const starImport = args[3] as string | null;

                let importStr = `${this.indent()}${this.getKeyword(Opcode.IMPORT)} `;
                let parts = [];

                if (defaultImport) {
                    parts.push(defaultImport);
                }
                if (starImport) {
                    parts.push(`* as ${starImport}`);
                } else if (namedImports && namedImports.length > 0) {
                    const namedStr = namedImports.map(imp => imp.name === imp.alias ? imp.name : `${imp.name} as ${imp.alias}`).join(', ');
                    parts.push(`{ ${namedStr} }`);
                }

                importStr += parts.join(', ');
                importStr += ` from "${moduleName}";`;
                return importStr;
            }

            case Opcode.EXPORT:
                if (args[0] === 'default') {
                    return `${this.indent()}${this.getKeyword(Opcode.EXPORT)} ${this.getKeyword(Opcode.DEFAULT)} ${this.deparseNode(args[1])};`;
                }
                // Check if it's a declaration
                const exportedNode = args[1];
                let exportedOpcode: Opcode | null = null;
                if (Array.isArray(exportedNode)) {
                    exportedOpcode = exportedNode[0];
                } else if (typeof exportedNode === 'object' && exportedNode !== null && 'type' in exportedNode) {
                    exportedOpcode = exportedNode.type;
                }

                if (exportedOpcode === Opcode.LET || exportedOpcode === Opcode.CONST || exportedOpcode === Opcode.FUNC || exportedOpcode === Opcode.CLASS) {
                    return `${this.indent()}${this.getKeyword(Opcode.EXPORT)} ${this.deparseNode(exportedNode)}`;
                }
                return `${this.indent()}${this.getKeyword(Opcode.EXPORT)} ${args[0]} = ${this.deparseNode(args[1])};`;

            case Opcode.PARALLEL:
                let parStr = `${this.indent()}${this.getKeyword(Opcode.PARALLEL)} {\n`;
                this.indentLevel++;
                for (let i = 0; i < args.length; i++) {
                    parStr += this.deparseNode(args[i]) + '\n';
                }
                this.indentLevel--;
                parStr += `${this.indent()}}`;
                return parStr;

            case Opcode.SWITCH: {
                let switchStr = `${this.indent()}${this.getKeyword(Opcode.SWITCH)} (${this.deparseNode(args[0])}) {\n`;
                this.indentLevel++;
                const cases = args[1] as { value: HamASTNode, body: HamASTNode[] }[];
                const defaultCase = args[2] as HamASTNode[] | null;
                
                for (const c of cases) {
                    switchStr += `${this.indent()}${this.getKeyword(Opcode.CASE)} ${this.deparseNode(c.value)}:\n`;
                    this.indentLevel++;
                    switchStr += this.deparse(c.body);
                    this.indentLevel--;
                }
                
                if (defaultCase) {
                    switchStr += `${this.indent()}${this.getKeyword(Opcode.DEFAULT)}:\n`;
                    this.indentLevel++;
                    switchStr += this.deparse(defaultCase);
                    this.indentLevel--;
                }
                
                this.indentLevel--;
                switchStr += `${this.indent()}}`;
                return switchStr;
            }

            case Opcode.IF:
                let ifStr = `${this.indent()}${this.getKeyword(Opcode.IF)} (${this.deparseNode(args[0])}) {\n`;
                this.indentLevel++;
                ifStr += this.deparse(args[1] as HamAST);
                this.indentLevel--;
                ifStr += `\n${this.indent()}}`;
                
                if (args[2] !== null) {
                    ifStr += ` ${this.getKeyword(Opcode.ELSE)} {\n`;
                    this.indentLevel++;
                    ifStr += this.deparse(args[2] as HamAST);
                    this.indentLevel--;
                    ifStr += `\n${this.indent()}}`;
                }
                return ifStr;
            
            // Binary Operators
            case Opcode.ADD:
            case Opcode.SUB:
            case Opcode.MUL:
            case Opcode.DIV:
            case Opcode.EQ:
            case Opcode.NEQ:
            case Opcode.GT:
            case Opcode.LT:
            case Opcode.GTE:
            case Opcode.LTE:
            case Opcode.AND:
            case Opcode.OR:
                return `${this.deparseNode(args[0])} ${this.getKeyword(opcode)} ${this.deparseNode(args[1])}`;
            
            default:
                return `/* UNKNOWN_NODE: ${JSON.stringify(node)} */`;
        }
    }
}
