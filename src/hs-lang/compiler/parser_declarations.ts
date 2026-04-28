 
import { Opcode, HamASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserCore } from './parser_core';

export class ParserDeclarations extends ParserCore {
    protected scopes: Set<string>[] = [new Set()];

    protected beginScope(): void {
        this.scopes.push(new Set());
    }

    protected endScope(): void {
        this.scopes.pop();
    }

    protected declareVariable(name: string, line: number): void {
        const currentScope = this.scopes[this.scopes.length - 1];
        for (let i = this.scopes.length - 2; i >= 0; i--) {
            if (this.scopes[i].has(name)) {
                console.warn(`[Parser Warning] Line ${line}: Variable '${name}' shadows a variable in an outer scope.`);
                break;
            }
        }
        if (currentScope.has(name)) {
            throw new Error(`[Parser Error] Line ${line}: Variable '${name}' already declared in this scope.`);
        }
        currentScope.add(name);
    }

    protected varDeclaration(isConst: boolean = false, isReactive: boolean = false): HamASTNode {
        const parsePattern = (): any => {
            if (this.match(TokenType.PUNCTUATION, '[')) {
                const elements: any[] = [];
                while (!this.check(TokenType.PUNCTUATION, ']')) {
                    if (this.match(TokenType.OPERATOR, Opcode.SPREAD)) {
                        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name").value as string;
                        this.declareVariable(name, this.previous().line);
                        elements.push({ type: "rest", name });
                        break;
                    }
                    elements.push(parsePattern());
                    if (!this.match(TokenType.PUNCTUATION, ',')) break;
                }
                this.consume(TokenType.PUNCTUATION, "Expect ']'", ']');
                return { type: "array", elements };
            } else if (this.match(TokenType.PUNCTUATION, '{')) {
                const properties: any[] = [];
                while (!this.check(TokenType.PUNCTUATION, '}')) {
                    if (this.match(TokenType.OPERATOR, Opcode.SPREAD)) {
                        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name").value as string;
                        this.declareVariable(name, this.previous().line);
                        properties.push({ type: "rest", name });
                        break;
                    }
                    const key = this.consume(TokenType.IDENTIFIER, "Expect property name").value as string;
                    let value: any = key;
                    if (this.match(TokenType.PUNCTUATION, ':')) {
                        value = parsePattern();
                    } else {
                        this.declareVariable(key, this.previous().line);
                    }
                    properties.push({ key, value });
                    if (!this.match(TokenType.PUNCTUATION, ',')) break;
                }
                this.consume(TokenType.PUNCTUATION, "Expect '}'", '}');
                return { type: "object", properties };
            } else {
                const name = this.consume(TokenType.IDENTIFIER, "Expect variable name").value as string;
                this.declareVariable(name, this.previous().line);
                return name;
            }
        };

        const pattern = parsePattern();
        let typeAnnotation: string | null = null;
        if (this.match(TokenType.PUNCTUATION, ':')) {
            typeAnnotation = this.consume(TokenType.IDENTIFIER, "Expect type name").value as string;
        }
        let initializer: HamASTNode = null;
        if (this.match(TokenType.OPERATOR, Opcode.ASSIGN)) {
            initializer = (this as any).expression();
        }
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(isReactive ? Opcode.REACTIVE : Opcode.LET, [pattern, initializer, typeAnnotation, isConst]);
    }

    protected typeDeclaration(): HamASTNode {
        const name = this.consume(TokenType.IDENTIFIER, "Expect type name").value as string;
        this.consume(TokenType.OPERATOR, "Expect '=' after type name", Opcode.ASSIGN);
        let braceCount = 0;
        while (!this.isAtEnd()) {
            if (this.check(TokenType.PUNCTUATION, '{')) braceCount++;
            else if (this.check(TokenType.PUNCTUATION, '}')) braceCount--;
            if (this.check(TokenType.PUNCTUATION, ';') && braceCount === 0) break;
            this.advance();
        }
        this.consume(TokenType.PUNCTUATION, "Expect ';' after type declaration", ';');
        return this.node(Opcode.TYPE_DECL, [name]);
    }

    protected interfaceDeclaration(): HamASTNode {
        const name = this.consume(TokenType.IDENTIFIER, "Expect interface name").value as string;
        this.consume(TokenType.PUNCTUATION, "Expect '{' before interface body", '{');
        let braceCount = 1;
        while (braceCount > 0 && !this.isAtEnd()) {
            if (this.check(TokenType.PUNCTUATION, '{')) braceCount++;
            else if (this.check(TokenType.PUNCTUATION, '}')) braceCount--;
            this.advance();
        }
        return this.node(Opcode.INTERFACE_DECL, [name]);
    }

    protected classDeclaration(): HamASTNode {
        const name = this.consume(TokenType.IDENTIFIER, "Expect class name").value as string;
        let superclass: HamASTNode = null;
        if (this.match(TokenType.KEYWORD, Opcode.EXTENDS)) {
            superclass = this.consume(TokenType.IDENTIFIER, "Expect superclass name").value as string;
        }
        this.consume(TokenType.PUNCTUATION, "Expect '{' before class body", '{');
        const methods: HamASTNode[] = [];
        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            let modifier = null;
            let isAsync = false;
            if (this.match(TokenType.KEYWORD, Opcode.STATIC)) modifier = 'static';
            else if (this.match(TokenType.KEYWORD, Opcode.PUBLIC)) modifier = 'public';
            else if (this.match(TokenType.KEYWORD, Opcode.PRIVATE)) modifier = 'private';
            else if (this.match(TokenType.KEYWORD, Opcode.PROTECTED)) modifier = 'protected';
            if (this.match(TokenType.KEYWORD, Opcode.ASYNC)) isAsync = true;
            this.match(TokenType.KEYWORD, Opcode.FUNC);
            const method = this.funcDeclaration(true, false, isAsync) as any[];
            method.push(modifier);
            methods.push(method as HamASTNode);
        }
        this.consume(TokenType.PUNCTUATION, "Expect '}' after class body", '}');
        return this.node(Opcode.CLASS, [name, superclass, methods]);
    }

    protected funcDeclaration(isMethod: boolean = false, isAnonymous: boolean = false, isAsync: boolean = false): HamASTNode {
        let name = "";
        if (!isAnonymous) {
            const nameToken = this.consume(TokenType.IDENTIFIER, isMethod ? "Expect method name" : "Expect function name");
            name = nameToken.value as string;
            this.declareVariable(name, nameToken.line);
        }
        this.consume(TokenType.PUNCTUATION, "Expect '(' after function name", '(');
        this.beginScope();
        const parameters: {name: string, type: string | null}[] = [];
        if (!this.check(TokenType.PUNCTUATION, ')')) {
            do {
                const paramNameToken = this.consume(TokenType.IDENTIFIER, "Expect parameter name");
                const paramName = paramNameToken.value as string;
                this.declareVariable(paramName, paramNameToken.line);
                let paramType: string | null = null;
                if (this.match(TokenType.PUNCTUATION, ':')) {
                    paramType = this.consume(TokenType.IDENTIFIER, "Expect parameter type").value as string;
                }
                parameters.push({name: paramName, type: paramType});
            } while (this.match(TokenType.PUNCTUATION, ','));
        }
        this.consume(TokenType.PUNCTUATION, "Expect ')' after parameters", ')');
        let returnType: string | null = null;
        if (this.match(TokenType.PUNCTUATION, ':')) {
            returnType = this.consume(TokenType.IDENTIFIER, "Expect return type").value as string;
        }
        this.consume(TokenType.PUNCTUATION, "Expect '{' before function body", '{');
        const body = (this as any).block();
        this.endScope();
        return this.node(Opcode.FUNC, [name, parameters, body, returnType, false, isAsync]);
    }
}
