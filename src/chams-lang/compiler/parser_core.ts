 
import { Token, TokenType } from './lexer';
import { Opcode, OmniASTNode } from '../core/types';

// ============================================================================
// cHams V5.5: THE QUANTUM PARSER CORE
// ============================================================================

export class ParserCore {
    protected tokens: Token[];
    protected current: number = 0;

    constructor(tokens: Token[]) {
        this.tokens = tokens;
    }

    protected peek(): Token {
        return this.tokens[this.current];
    }

    protected peekNext(): Token {
        if (this.current + 1 >= this.tokens.length) return this.tokens[this.tokens.length - 1];
        return this.tokens[this.current + 1];
    }

    protected previous(): Token {
        return this.tokens[this.current - 1];
    }

    protected isAtEnd(): boolean {
        return this.peek().type === TokenType.EOF;
    }

    protected advance(): Token {
        if (!this.isAtEnd()) this.current++;
        return this.previous();
    }

    protected check(type: TokenType, value?: any): boolean {
        if (this.isAtEnd()) return false;
        if (this.peek().type !== type) return false;
        if (value !== undefined && this.peek().value !== value) return false;
        return true;
    }

    protected match(type: TokenType, value?: any): boolean {
        if (this.check(type, value)) {
            this.advance();
            return true;
        }
        return false;
    }

    protected consume(type: TokenType, errorMessage: string, value?: any): Token {
        if (this.check(type, value)) return this.advance();
        const token = this.peek();
        throw new Error(`[Parser Error] Line ${token.line}, Col ${token.column}: ${errorMessage}. Found '${token.value}' instead.`);
    }

    protected node(type: any, args: any[] = [], startToken?: Token): OmniASTNode {
        const token = startToken || this.previous();
        return {
            type: type as Opcode,
            args,
            loc: {
                line: token.line,
                column: token.column
            }
        } as OmniASTNode;
    }
}
