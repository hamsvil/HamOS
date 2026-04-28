/* eslint-disable no-unreachable */
/* eslint-disable no-useless-assignment */
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { Opcode, HamAST, HamASTNode } from '../core/types';
import { Token, TokenType, Lexer } from './lexer';
import { ParserExpressions } from './parser_expressions';

// ============================================================================
// Ham Engine V5.5: THE QUANTUM PARSER (AST GENERATOR)
// ============================================================================

export class Parser extends ParserExpressions {
    constructor(tokens: Token[]) {
        super(tokens);
    }

    protected parseExpressionFromString(str: string): HamASTNode {
        const lexer = new Lexer(str);
        const tokens = lexer.tokenizeAll();
        const parser = new Parser(tokens);
        return parser.expression();
    }

    public parse(): HamAST {
        const statements: HamAST = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration());
        }
        return statements;
    }

    private declaration(): HamASTNode {
        if (this.match(TokenType.KEYWORD, Opcode.LET) || this.match(TokenType.KEYWORD, Opcode.CONST) || this.match(TokenType.KEYWORD, Opcode.REACTIVE)) {
            const isConst = this.previous().value === Opcode.CONST;
            const isReactive = this.previous().value === Opcode.REACTIVE;
            return this.varDeclaration(isConst, isReactive);
        }
        if (this.match(TokenType.KEYWORD, Opcode.ASYNC)) {
            if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
                return this.funcDeclaration(false, false, true);
            }
            this.current--;
        }
        if (this.match(TokenType.KEYWORD, Opcode.FUNC)) return this.funcDeclaration();
        if (this.match(TokenType.KEYWORD, Opcode.CLASS)) return this.classDeclaration();
        if (this.match(TokenType.KEYWORD, Opcode.TYPE_DECL)) return this.typeDeclaration();
        if (this.match(TokenType.KEYWORD, Opcode.INTERFACE_DECL)) return this.interfaceDeclaration();
        return this.statement();
    }

    private statement(): HamASTNode {
        if (this.match(TokenType.KEYWORD, Opcode.IF)) return this.ifStatement();
        if (this.match(TokenType.KEYWORD, Opcode.WHILE)) return this.whileStatement();
        if (this.match(TokenType.KEYWORD, Opcode.FOR)) return this.forStatement();
        if (this.match(TokenType.KEYWORD, Opcode.PRINT)) return this.printStatement();
        if (this.match(TokenType.KEYWORD, Opcode.BIND)) return this.bindStatement();
        if (this.match(TokenType.KEYWORD, Opcode.RETURN)) return this.returnStatement();
        if (this.match(TokenType.KEYWORD, Opcode.BREAK)) return this.breakStatement();
        if (this.match(TokenType.KEYWORD, Opcode.CONTINUE)) return this.continueStatement();
        if (this.match(TokenType.KEYWORD, Opcode.TRY)) return this.tryStatement();
        if (this.match(TokenType.KEYWORD, Opcode.THROW)) return this.throwStatement();
        if (this.match(TokenType.KEYWORD, Opcode.SWITCH)) return this.switchStatement();
        if (this.match(TokenType.KEYWORD, Opcode.EXPORT)) return this.exportStatement();
        if (this.match(TokenType.KEYWORD, Opcode.IMPORT)) return this.importStatement();
        if (this.match(TokenType.KEYWORD, Opcode.PARALLEL)) return this.parallelStatement();
        
        return this.expressionStatement();
    }

    private tryStatement(): HamASTNode {
        this.consume(TokenType.PUNCTUATION, "Expect '{' after 'try'", '{');
        const tryBlock = this.block();
        
        let catchBlock: HamASTNode = null;
        let catchParam: string | null = null;
        
        if (this.match(TokenType.KEYWORD, Opcode.CATCH)) {
            if (this.match(TokenType.PUNCTUATION, '(')) {
                catchParam = this.consume(TokenType.IDENTIFIER, "Expect parameter name in catch").value as string;
                this.consume(TokenType.PUNCTUATION, "Expect ')' after catch parameter", ')');
            }
            
            this.consume(TokenType.PUNCTUATION, "Expect '{' before catch body", '{');
            catchBlock = this.block();
        }
        
        let finallyBlock: HamASTNode = null;
        if (this.match(TokenType.KEYWORD, Opcode.FINALLY)) {
            this.consume(TokenType.PUNCTUATION, "Expect '{' before finally body", '{');
            finallyBlock = this.block();
        }
        
        return this.node(Opcode.TRY, [tryBlock, catchParam, catchBlock, finallyBlock]);
    }

    private throwStatement(): HamASTNode {
        const startToken = this.previous();
        const value = this.expression();
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.THROW, [value], startToken);
    }

    private switchStatement(): HamASTNode {
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'switch'", '(');
        const condition = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after switch condition", ')');
        this.consume(TokenType.PUNCTUATION, "Expect '{' before switch body", '{');

        const cases: any[] = [];
        let defaultCase: HamASTNode[] | null = null;

        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            if (this.check(TokenType.KEYWORD, Opcode.CASE)) {
                const caseToken = this.advance();
                const caseValue = this.expression();
                this.consume(TokenType.PUNCTUATION, "Expect ':' after case value", ':');
                const caseBody: HamASTNode[] = [];
                while (!this.check(TokenType.KEYWORD, Opcode.CASE) && 
                       !this.check(TokenType.KEYWORD, Opcode.DEFAULT) && 
                       !this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
                    caseBody.push(this.declaration());
                }
                cases.push(this.node(Opcode.CASE, [caseValue, caseBody], caseToken));
            } else if (this.match(TokenType.KEYWORD, Opcode.DEFAULT)) {
                this.consume(TokenType.PUNCTUATION, "Expect ':' after default", ':');
                const defBody: HamASTNode[] = [];
                while (!this.check(TokenType.KEYWORD, Opcode.CASE) && 
                       !this.check(TokenType.KEYWORD, Opcode.DEFAULT) && 
                       !this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
                    defBody.push(this.declaration());
                }
                defaultCase = defBody;
            } else {
                throw new Error(`[Parser Error] Line ${this.peek().line}: Expect 'case' or 'default' inside switch`);
            }
        }

        this.consume(TokenType.PUNCTUATION, "Expect '}' after switch body", '}');
        return this.node(Opcode.SWITCH, [condition, cases, defaultCase]);
    }

    private importStatement(): HamASTNode {
        // import "module";
        // import defaultExport from "module";
        // import { a, b } from "module";
        // import * as alias from "module";
        
        if (this.match(TokenType.STRING)) {
            const moduleName = this.previous().value as string;
            this.consume(TokenType.PUNCTUATION, "Expect ';' after import", ';');
            return this.node(Opcode.IMPORT, [moduleName]);
        }

        let defaultImport: string | null = null;
        let namedImports: { name: string, alias: string }[] = [];
        let starImport: string | null = null;

        if (this.match(TokenType.IDENTIFIER)) {
            defaultImport = this.previous().value as string;
            if (this.match(TokenType.PUNCTUATION, ',')) {
                // Continue to named or star imports
            }
        }

        if (this.match(TokenType.OPERATOR, Opcode.MUL)) {
            this.consume(TokenType.IDENTIFIER, "Expect 'as' after '*'", "as"); // Wait, 'as' is an identifier in Ham Engine?
            // Let's just assume 'as' is an identifier
            starImport = this.consume(TokenType.IDENTIFIER, "Expect alias after 'as'").value as string;
        } else if (this.match(TokenType.PUNCTUATION, '{')) {
            do {
                const name = this.consume(TokenType.IDENTIFIER, "Expect import name").value as string;
                let alias = name;
                if (this.match(TokenType.IDENTIFIER)) {
                    if (this.previous().value === 'as') {
                        alias = this.consume(TokenType.IDENTIFIER, "Expect alias after 'as'").value as string;
                    } else {
                        this.current--; // Backtrack if not 'as'
                    }
                }
                namedImports.push({ name, alias });
            } while (this.match(TokenType.PUNCTUATION, ','));
            this.consume(TokenType.PUNCTUATION, "Expect '}' after import list", '}');
        }

        if (defaultImport || namedImports.length > 0 || starImport) {
            // Wait, 'from' is an identifier?
            const fromToken = this.consume(TokenType.IDENTIFIER, "Expect 'from' after import list");
            if (fromToken.value !== 'from') {
                throw new Error(`[Parser Error] Line ${fromToken.line}: Expect 'from' after import list`);
            }
            const moduleName = this.consume(TokenType.STRING, "Expect module name string").value as string;
            this.consume(TokenType.PUNCTUATION, "Expect ';' after import", ';');
            return this.node(Opcode.IMPORT, [moduleName, defaultImport, namedImports, starImport]);
        }

        throw new Error(`[Parser Error] Line ${this.peek().line}: Invalid import syntax`);
        return [];
    }

    private exportStatement(): HamASTNode {
        const startToken = this.previous();
        if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
            const func = this.funcDeclaration();
            return this.node(Opcode.EXPORT, [(func as any).args[0], func], startToken);
        } else if (this.match(TokenType.KEYWORD, Opcode.CLASS)) {
            const cls = this.classDeclaration();
            return this.node(Opcode.EXPORT, [(cls as any).args[0], cls], startToken);
        } else if (this.match(TokenType.KEYWORD, Opcode.LET) || this.match(TokenType.KEYWORD, Opcode.CONST)) {
            const decl = this.varDeclaration(this.previous().value === Opcode.CONST);
            return this.node(Opcode.EXPORT, [(decl as any).args[0], decl], startToken);
        } else {
            const name = this.consume(TokenType.IDENTIFIER, "Expect export name").value as string;
            this.consume(TokenType.OPERATOR, "Expect '=' after export name", Opcode.ASSIGN);
            const value = this.expression();
            this.match(TokenType.PUNCTUATION, ';');
            return this.node(Opcode.EXPORT, [name, value], startToken);
        }
    }

    private parallelStatement(): HamASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '{' after parallel", '{');
        const statements: HamASTNode[] = [];
        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            statements.push(this.statement());
        }
        this.consume(TokenType.PUNCTUATION, "Expect '}' after parallel block", '}');
        return this.node(Opcode.PARALLEL, statements, startToken);
    }

    private breakStatement(): HamASTNode {
        const startToken = this.previous();
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.BREAK, [], startToken);
    }

    private continueStatement(): HamASTNode {
        const startToken = this.previous();
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.CONTINUE, [], startToken);
    }

    private forStatement(): HamASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'for'", '(');
        
        let initializer: HamASTNode | null = null;
        let isForOf = false;
        let isForIn = false;
        let iteratorVarName = "";

        if (this.match(TokenType.KEYWORD, Opcode.LET) || this.match(TokenType.KEYWORD, Opcode.CONST)) {
            const isConst = this.previous().value === Opcode.CONST;
            if (this.check(TokenType.IDENTIFIER) && (this.peekNext().value === Opcode.OF || this.peekNext().value === Opcode.IN)) {
                // for (let x of y) or for (let x in y)
                iteratorVarName = this.consume(TokenType.IDENTIFIER, "Expect variable name").value as string;
                if (this.match(TokenType.KEYWORD, Opcode.OF)) isForOf = true;
                else if (this.match(TokenType.KEYWORD, Opcode.IN)) isForIn = true;
                
                const iterable = this.expression();
                this.consume(TokenType.PUNCTUATION, "Expect ')' after for clauses", ')');
                
                let body: HamASTNode;
                if (this.match(TokenType.PUNCTUATION, '{')) {
                    body = this.block();
                } else {
                    body = [this.statement()];
                }
                return this.node(isForOf ? Opcode.FOR_OF : Opcode.FOR_IN, [iteratorVarName, iterable, body, isConst], startToken);
            } else {
                initializer = this.varDeclaration(isConst);
            }
        } else if (this.match(TokenType.PUNCTUATION, ';')) {
            initializer = null;
        } else {
            initializer = this.expressionStatement();
        }
        
        let condition: HamASTNode | null = null;
        if (!this.check(TokenType.PUNCTUATION, ';')) {
            condition = this.expression();
        }
        this.consume(TokenType.PUNCTUATION, "Expect ';' after loop condition", ';');
        
        let increment: HamASTNode | null = null;
        if (!this.check(TokenType.PUNCTUATION, ')')) {
            increment = this.expression();
        }
        this.consume(TokenType.PUNCTUATION, "Expect ')' after for clauses", ')');
        
        let body: HamASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            body = this.block();
        } else {
            body = [this.statement()];
        }
        
        return this.node(Opcode.FOR, [initializer, condition, increment, body], startToken);
    }

    private whileStatement(): HamASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'while'", '(');
        const condition = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after while condition", ')');

        let body: HamASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            body = this.block();
        } else {
            body = [this.statement()];
        }

        return this.node(Opcode.WHILE, [condition, body], startToken);
    }

    private ifStatement(): HamASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'if'", '(');
        const condition = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after if condition", ')');

        let thenBranch: HamASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            thenBranch = this.block();
        } else {
            thenBranch = [this.statement()]; // Single statement block
        }

        let elseBranch: HamASTNode = null;
        if (this.match(TokenType.KEYWORD, Opcode.ELSE)) {
            if (this.match(TokenType.PUNCTUATION, '{')) {
                elseBranch = this.block();
            } else {
                elseBranch = [this.statement()];
            }
        }

        return this.node(Opcode.IF, [condition, thenBranch, elseBranch], startToken);
    }

    private printStatement(): HamASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'print'", '(');
        const value = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after print value", ')');
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.PRINT, [value], startToken);
    }

    private bindStatement(): HamASTNode {
        const startToken = this.previous();
        // Syntax: bind(Source -> Target)
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'bind'", '(');
        const source = this.expression();
        
        // The Lexer converts '->' to Opcode.BIND
        this.consume(TokenType.OPERATOR, "Expect '->' in bind statement", Opcode.BIND);
        
        const target = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after bind target", ')');
        this.match(TokenType.PUNCTUATION, ';');
        
        return this.node(Opcode.BIND, [source, target], startToken);
    }

    private returnStatement(): HamASTNode {
        const startToken = this.previous();
        let value: HamASTNode = null;
        if (!this.check(TokenType.PUNCTUATION, ';') && !this.check(TokenType.PUNCTUATION, '}')) {
            value = this.expression();
        }
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.RETURN, [value], startToken);
    }

    private expressionStatement(): HamASTNode {
        const expr = this.expression();
        this.match(TokenType.PUNCTUATION, ';');
        return expr;
    }

    protected block(): HamASTNode[] {
        this.beginScope();
        const statements: HamASTNode[] = [];
        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            statements.push(this.declaration());
        }
        this.consume(TokenType.PUNCTUATION, "Expect '}' after block", '}');
        this.endScope();
        return statements;
    }

    // --- Error Recovery ---
    private synchronize(): void {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.PUNCTUATION && this.previous().value === ';') return;
            
            switch (this.peek().type) {
                case TokenType.KEYWORD:
                    return;
            }
            this.advance();
        }
    }
}
