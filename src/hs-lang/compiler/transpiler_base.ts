import { HamAST, HamASTNode } from '../core/types';

export abstract class TranspilerBase {
    protected ast: HamAST;
    protected indentLevel: number = 0;
    protected isTypeScript: boolean;

    constructor(ast: HamAST, isTypeScript: boolean = true) {
        this.ast = ast;
        this.isTypeScript = isTypeScript;
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

    protected abstract transpileNode(node: HamASTNode): string;
}
