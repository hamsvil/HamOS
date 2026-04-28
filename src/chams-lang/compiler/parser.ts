/* eslint-disable no-useless-assignment */
import { Opcode, OmniAST, OmniASTNode } from '../core/types';
import { Token, TokenType, Lexer } from './lexer';
import { ParserExpressions } from './parser_expressions';

// ============================================================================
// cHams V5.5: THE QUANTUM PARSER (AST GENERATOR)
// ============================================================================

/**
 * The Quantum Parser
 * Converts a stream of Tokens into a Minified JSON Object (Omni-DNA).
 * Implements Strict Mode: Zero-Coercion and strict grammar validation.
 */
export class Parser extends ParserExpressions {
    constructor(tokens: Token[]) {
        super(tokens);
    }

    // --- Grammar Rules (Recursive Descent) ---

    public parse(): OmniAST {
        const statements: OmniAST = [];
        while (!this.isAtEnd()) {
            statements.push(this.declaration());
        }
        return statements;
    }

    private declaration(): OmniASTNode {
        try {
            if (this.match(TokenType.KEYWORD, Opcode.LET)) return this.varDeclaration(Opcode.LET);
            if (this.match(TokenType.KEYWORD, Opcode.CONST)) return this.varDeclaration(Opcode.CONST);
            if (this.match(TokenType.KEYWORD, Opcode.REACTIVE)) return this.varDeclaration(Opcode.REACTIVE);
            if (this.match(TokenType.KEYWORD, Opcode.ASYNC)) {
                if (this.match(TokenType.KEYWORD, Opcode.FUNC)) return this.funcDeclaration();
                throw new Error("Expect 'func' after 'async'");
            }
            if (this.match(TokenType.KEYWORD, Opcode.FUNC)) return this.funcDeclaration();
            if (this.match(TokenType.KEYWORD, Opcode.CLASS)) return this.classDeclaration();
            return this.statement();
        } catch (error: any) {
            this.synchronize(); // Error recovery (Self-Healing)
            throw error;
        }
    }

    private varDeclaration(type: Opcode): OmniASTNode {
        const startToken = this.previous();
        const name = this.consume(TokenType.IDENTIFIER, "Expect variable name").value as string;
        let initializer: OmniASTNode = null;

        if (this.match(TokenType.OPERATOR, Opcode.ASSIGN)) {
            initializer = this.expression();
        }

        // Optional semicolon
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(type, [name, initializer], startToken);
    }

    private funcDeclaration(_isMethod: boolean = false): OmniASTNode {
        const startToken = this.previous();
        const isAsync = startToken.value === Opcode.ASYNC;
        
        const name = this.consume(TokenType.IDENTIFIER, "Expect function name").value as string;
        this.consume(TokenType.PUNCTUATION, "Expect '(' after function name", '(');
        
        const parameters: string[] = [];
        if (!this.check(TokenType.PUNCTUATION, ')')) {
            do {
                parameters.push(this.consume(TokenType.IDENTIFIER, "Expect parameter name").value as string);
            } while (this.match(TokenType.PUNCTUATION, ','));
        }
        this.consume(TokenType.PUNCTUATION, "Expect ')' after parameters", ')');
        
        this.consume(TokenType.PUNCTUATION, "Expect '{' before function body", '{');
        const body = this.block();
        
        return this.node(Opcode.FUNC, [name, parameters, body, isAsync], startToken);
    }

    private classDeclaration(): OmniASTNode {
        const startToken = this.previous();
        const name = this.consume(TokenType.IDENTIFIER, "Expect class name").value as string;
        
        let superclass: string | null = null;
        if (this.match(TokenType.KEYWORD, Opcode.EXTENDS)) {
            superclass = this.consume(TokenType.IDENTIFIER, "Expect superclass name").value as string;
        }

        this.consume(TokenType.PUNCTUATION, "Expect '{' before class body", '{');
        
        const methods: OmniASTNode[] = [];
        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
                methods.push(this.funcDeclaration(true));
            } else {
                // Handle constructor or other class members if needed
                const _memberName = this.consume(TokenType.IDENTIFIER, "Expect method name").value as string;
                // Simplified: treat everything as a function for now
                this.consume(TokenType.PUNCTUATION, "Expect '('", '(');
                // ... (similar to funcDeclaration)
            }
        }
        
        this.consume(TokenType.PUNCTUATION, "Expect '}' after class body", '}');
        
        return this.node(Opcode.CLASS, [name, superclass, methods], startToken);
    }

    private statement(): OmniASTNode {
        if (this.match(TokenType.KEYWORD, Opcode.IF)) return this.ifStatement();
        if (this.match(TokenType.KEYWORD, Opcode.WHILE)) return this.whileStatement();
        if (this.match(TokenType.KEYWORD, Opcode.FOR)) return this.forStatement();
        if (this.match(TokenType.KEYWORD, Opcode.PRINT)) return this.printStatement();
        if (this.match(TokenType.KEYWORD, Opcode.BIND)) return this.bindStatement();
        if (this.match(TokenType.KEYWORD, Opcode.RETURN)) return this.returnStatement();
        if (this.match(TokenType.KEYWORD, Opcode.TRY)) return this.tryStatement();
        if (this.match(TokenType.PUNCTUATION, '{')) return this.node(Opcode.BLOCK, [this.block()], this.previous());
        
        return this.expressionStatement();
    }

    protected block(): OmniAST {
        const statements: OmniAST = [];
        while (!this.check(TokenType.PUNCTUATION, '}') && !this.isAtEnd()) {
            statements.push(this.declaration());
        }
        this.consume(TokenType.PUNCTUATION, "Expect '}' after block", '}');
        return statements;
    }

    private whileStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'while'", '(');
        const condition = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after while condition", ')');

        let body: OmniASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            body = this.node(Opcode.BLOCK, [this.block()], this.previous());
        } else {
            body = this.node(Opcode.BLOCK, [[this.statement()]], this.previous());
        }

        return this.node(Opcode.WHILE, [condition, body], startToken);
    }

    private forStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'for'", '(');
        
        let init: OmniASTNode = null;
        if (this.match(TokenType.PUNCTUATION, ';')) {
            init = null;
        } else if (this.match(TokenType.KEYWORD, Opcode.LET)) {
            init = this.varDeclaration(Opcode.LET);
        } else {
            init = this.expressionStatement();
        }

        let condition: OmniASTNode = null;
        if (!this.check(TokenType.PUNCTUATION, ';')) {
            condition = this.expression();
        }
        this.consume(TokenType.PUNCTUATION, "Expect ';' after loop condition", ';');

        let increment: OmniASTNode = null;
        if (!this.check(TokenType.PUNCTUATION, ')')) {
            increment = this.expression();
        }
        this.consume(TokenType.PUNCTUATION, "Expect ')' after for clauses", ')');

        let body: OmniASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            body = this.node(Opcode.BLOCK, [this.block()], this.previous());
        } else {
            body = this.node(Opcode.BLOCK, [[this.statement()]], this.previous());
        }

        return this.node(Opcode.FOR, [init, condition, increment, body], startToken);
    }

    private ifStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'if'", '(');
        const condition = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after if condition", ')');

        let thenBranch: OmniASTNode;
        if (this.match(TokenType.PUNCTUATION, '{')) {
            thenBranch = this.node(Opcode.BLOCK, [this.block()], this.previous());
        } else {
            thenBranch = this.node(Opcode.BLOCK, [[this.statement()]], this.previous());
        }

        let elseBranch: OmniASTNode = null;
        if (this.match(TokenType.KEYWORD, Opcode.ELSE)) {
            if (this.match(TokenType.PUNCTUATION, '{')) {
                elseBranch = this.node(Opcode.BLOCK, [this.block()], this.previous());
            } else {
                elseBranch = this.node(Opcode.BLOCK, [[this.statement()]], this.previous());
            }
        }

        return this.node(Opcode.IF, [condition, thenBranch, elseBranch], startToken);
    }

    private tryStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '{' after 'try'", '{');
        const tryBlock = this.block();
        
        let catchBlock: { param: string | null, body: OmniAST } | null = null;
        if (this.match(TokenType.KEYWORD, Opcode.CATCH)) {
            let param: string | null = null;
            if (this.match(TokenType.PUNCTUATION, '(')) {
                param = this.consume(TokenType.IDENTIFIER, "Expect exception name").value as string;
                this.consume(TokenType.PUNCTUATION, "Expect ')'", ')');
            }
            this.consume(TokenType.PUNCTUATION, "Expect '{'", '{');
            catchBlock = { param, body: this.block() };
        }

        let finallyBlock: OmniAST | null = null;
        if (this.match(TokenType.KEYWORD, Opcode.FINALLY)) {
            this.consume(TokenType.PUNCTUATION, "Expect '{'", '{');
            finallyBlock = this.block();
        }

        return this.node(Opcode.TRY, [tryBlock, catchBlock, finallyBlock], startToken);
    }

    private printStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'print'", '(');
        const value = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after print value", ')');
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.PRINT, [value], startToken);
    }

    private bindStatement(): OmniASTNode {
        const startToken = this.previous();
        this.consume(TokenType.PUNCTUATION, "Expect '(' after 'bind'", '(');
        const source = this.expression();
        this.consume(TokenType.OPERATOR, "Expect '->' in bind statement", Opcode.BIND);
        const target = this.expression();
        this.consume(TokenType.PUNCTUATION, "Expect ')' after bind target", ')');
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.BIND, [source, target], startToken);
    }

    private returnStatement(): OmniASTNode {
        const startToken = this.previous();
        let value: OmniASTNode = null;
        if (!this.check(TokenType.PUNCTUATION, ';') && !this.check(TokenType.PUNCTUATION, '}')) {
            value = this.expression();
        }
        this.match(TokenType.PUNCTUATION, ';');
        return this.node(Opcode.RETURN, [value], startToken);
    }

    private expressionStatement(): OmniASTNode {
        const expr = this.expression();
        this.match(TokenType.PUNCTUATION, ';');
        return expr;
    }

    protected parseExpressionFromString(str: string): OmniASTNode {
        const lexer = new Lexer(str);
        const tokens = lexer.tokenizeAll();
        const parser = new Parser(tokens);
        return parser.expression();
    }

    private synchronize(): void {
        this.advance();
        while (!this.isAtEnd()) {
            if (this.previous().type === TokenType.PUNCTUATION && this.previous().value === ';') return;
            
            const nextOp = this.peek().value;
            if (typeof nextOp === 'number') {
                switch (nextOp) {
                    case Opcode.CLASS:
                    case Opcode.FUNC:
                    case Opcode.LET:
                    case Opcode.FOR:
                    case Opcode.IF:
                    case Opcode.WHILE:
                    case Opcode.PRINT:
                    case Opcode.RETURN:
                        return;
                }
            }
            this.advance();
        }
    }
}
