/* eslint-disable no-useless-assignment */
import { Opcode, HamASTNode } from '../core/types';
import { TranspilerStatements } from './transpiler_statements';

export abstract class TranspilerDeclarations extends TranspilerStatements {
    protected transpileDeclaration(opcode: Opcode, args: any[]): string | null {
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
            case Opcode.FUNC: {
                const name = args[0] as string;
                const params = args[1] as {name: string, type: string | null}[];
                const body = args[2] as HamASTNode[];
                const returnType = args[3] as string | null;
                const isArrow = args[4] as boolean;
                const isAsync = args[5] as boolean;
                
                const paramStr = params.map(p => {
                    if (this.isTypeScript && p.type) return `${p.name}: ${p.type}`;
                    return p.name;
                }).join(', ');
                
                let returnTypeStr = '';
                if (this.isTypeScript && returnType) {
                    returnTypeStr = `: ${returnType}`;
                }
                
                const asyncStr = isAsync ? 'async ' : '';
                
                let code = '';
                if (isArrow) {
                    code = `${asyncStr}(${paramStr})${returnTypeStr} => {\n`;
                } else {
                    code = `${asyncStr}function ${name}(${paramStr})${returnTypeStr} {\n`;
                }
                
                this.indentLevel++;
                for (const stmt of body) {
                    code += this.indent() + this.transpileNode(stmt) + ';\n';
                }
                this.indentLevel--;
                code += this.indent() + '}';
                
                return code;
            }
            case Opcode.CLASS: {
                const name = args[0] as string;
                const superclass = args[1] as string | null;
                const methods = args[2] as any[];
                
                let code = `class ${name}${superclass ? ` extends ${superclass}` : ''} {\n`;
                this.indentLevel++;
                
                for (const method of methods) {
                    const methodOp = Array.isArray(method) ? method[0] : method.type;
                    const methodArgs = Array.isArray(method) ? method.slice(1) : method.args;

                    const methodName = methodArgs[0] as string;
                    const params = methodArgs[1] as {name: string, type: string | null}[];
                    const body = methodArgs[2] as HamASTNode[];
                    const returnType = methodArgs[3] as string | null;
                    const isAsync = methodArgs[5] as boolean;
                    const modifier = methodArgs[6] as string | null;
                    
                    const paramStr = params.map(p => {
                        if (this.isTypeScript && p.type) return `${p.name}: ${p.type}`;
                        return p.name;
                    }).join(', ');
                    
                    let returnTypeStr = '';
                    if (this.isTypeScript && returnType) {
                        returnTypeStr = `: ${returnType}`;
                    }
                    
                    const asyncStr = isAsync ? 'async ' : '';
                    const modStr = modifier ? `${modifier} ` : '';
                    
                    code += this.indent() + `${modStr}${asyncStr}${methodName}(${paramStr})${returnTypeStr} {\n`;
                    this.indentLevel++;
                    for (const stmt of body) {
                        code += this.indent() + this.transpileNode(stmt) + ';\n';
                    }
                    this.indentLevel--;
                    code += this.indent() + '}\n';
                }
                
                this.indentLevel--;
                code += this.indent() + '}';
                return code;
            }
            case Opcode.IMPORT: {
                const moduleName = args[0] as string;
                if (args.length === 1) {
                    return `import "${moduleName}"`;
                }
                
                const defaultImport = args[1] as string | null;
                const namedImports = args[2] as { name: string, alias: string }[];
                const starImport = args[3] as string | null;
                
                const parts = [];
                if (defaultImport) parts.push(defaultImport);
                if (starImport) parts.push(`* as ${starImport}`);
                if (namedImports && namedImports.length > 0) {
                    const namedStr = namedImports.map(imp => imp.name === imp.alias ? imp.name : `${imp.name} as ${imp.alias}`).join(', ');
                    parts.push(`{ ${namedStr} }`);
                }
                
                return `import ${parts.join(', ')} from "${moduleName}"`;
            }
            case Opcode.EXPORT: {
                const name = args[0] as string;
                const value = args[1];
                
                let declOp: Opcode | null = null;
                if (Array.isArray(value)) {
                    declOp = value[0];
                } else if (typeof value === 'object' && value !== null && 'type' in value) {
                    declOp = value.type;
                }

                if (declOp !== null) {
                    if (declOp === Opcode.LET || declOp === Opcode.CONST || declOp === Opcode.REACTIVE || declOp === Opcode.FUNC || declOp === Opcode.CLASS) {
                        return `export ${this.transpileNode(value)}`;
                    }
                }
                
                return `export const ${name} = ${this.transpileNode(value)}`;
            }
            case Opcode.TYPE_DECL: {
                if (!this.isTypeScript) return '';
                const name = args[0] as string;
                return `// type ${name} (erased)`;
            }
            case Opcode.INTERFACE_DECL: {
                if (!this.isTypeScript) return '';
                const name = args[0] as string;
                return `// interface ${name} (erased)`;
            }
            default:
                return null;
        }
    }
}
