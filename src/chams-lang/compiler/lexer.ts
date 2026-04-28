 
import { Opcode } from '../core/types';
import { LexerDictionary, OperatorDictionary } from '../core/dictionary';

// ============================================================================
// cHams V5.5: THE QUANTUM LEXER (STATE MACHINE)
// ============================================================================

export enum TokenType {
    KEYWORD,
    IDENTIFIER,
    NUMBER,
    STRING,
    OPERATOR,
    PUNCTUATION,
    EOF
}

export interface Token {
    type: TokenType;
    value: string | number | Opcode;
    line: number;
    column: number;
    quoteType?: string;
}

/**
 * The Quantum Lexer
 * A pure State Machine implementation. O(n) complexity. Zero Regex.
 * Extremely fast and immune to ReDoS attacks.
 */
export class Lexer {
    private input: string;
    private position: number = 0;
    private line: number = 1;
    private column: number = 1;
    private language: 'EN' | 'ID' | 'JP';
    private static readonly MAX_INPUT_SIZE = 1024 * 512; // 512KB limit
    private static readonly MAX_TOKENS = 50000;

    constructor(input: string, language: 'EN' | 'ID' | 'JP' = 'EN') {
        if (input.length > Lexer.MAX_INPUT_SIZE) {
            throw new Error(`[Lexer Error] Input size exceeds limit of ${Lexer.MAX_INPUT_SIZE} bytes.`);
        }
        this.input = input;
        this.language = language;
    }

    private peek(offset: number = 0): string {
        if (this.position + offset >= this.input.length) return '\0';
        return this.input[this.position + offset];
    }

    private advance(): string {
        const char = this.peek();
        this.position++;
        if (char === '\n') {
            this.line++;
            this.column = 1;
        } else {
            this.column++;
        }
        return char;
    }

    private skipWhitespace(): void {
        while (true) {
            const char = this.peek();
            if (char === ' ' || char === '\t' || char === '\r' || char === '\n') {
                this.advance();
            } else if (char === '/' && this.peek(1) === '/') {
                // Skip single-line comments
                while (this.peek() !== '\n' && this.peek() !== '\0') {
                    this.advance();
                }
            } else if (char === '/' && this.peek(1) === '*') {
                // Skip multi-line comments
                this.advance(); // skip '/'
                this.advance(); // skip '*'
                while (this.peek() !== '\0') {
                    if (this.peek() === '*' && this.peek(1) === '/') {
                        this.advance(); // skip '*'
                        this.advance(); // skip '/'
                        break;
                    }
                    this.advance();
                }
            } else {
                break;
            }
        }
    }

    private isAlpha(char: string): boolean {
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_';
    }

    private isDigit(char: string): boolean {
        return char >= '0' && char <= '9';
    }

    private isAlphaNumeric(char: string): boolean {
        return this.isAlpha(char) || this.isDigit(char);
    }

    private readIdentifierOrKeyword(): Token {
        const startCol = this.column;
        let value = '';
        
        while (this.isAlphaNumeric(this.peek())) {
            value += this.advance();
        }

        // Check if it's a keyword in the selected language
        const dict = LexerDictionary[this.language];
        if (dict[value] !== undefined) {
            return { type: TokenType.KEYWORD, value: dict[value], line: this.line, column: startCol };
        }

        return { type: TokenType.IDENTIFIER, value, line: this.line, column: startCol };
    }

    private readNumber(): Token {
        const startCol = this.column;
        let value = '';
        let hasDot = false;

        while (this.isDigit(this.peek()) || (this.peek() === '.' && !hasDot)) {
            if (this.peek() === '.') hasDot = true;
            value += this.advance();
        }

        return { type: TokenType.NUMBER, value: parseFloat(value), line: this.line, column: startCol };
    }

    private readString(): Token {
        const startCol = this.column;
        const quoteType = this.advance(); // Consume opening quote
        let value = '';

        while (this.peek() !== quoteType && this.peek() !== '\0') {
            if (this.peek() === '\\') {
                this.advance(); // Skip escape char
                const escaped = this.advance();
                if (escaped === 'n') value += '\n';
                else if (escaped === 't') value += '\t';
                else value += escaped;
            } else {
                value += this.advance();
            }
        }

        if (this.peek() === '\0') {
            throw new Error(`[Lexer Error] Unterminated string at line ${this.line}, col ${startCol}`);
        }

        this.advance(); // Consume closing quote
        return { type: TokenType.STRING, value, line: this.line, column: startCol, quoteType };
    }

    private readOperator(): Token {
        const startCol = this.column;
        let op = this.advance();
        
        // Check for 3-character operators (===, !==, ...)
        const next1 = this.peek(0);
        const next2 = this.peek(1);
        
        if (op === '=' && next1 === '=' && next2 === '=') {
            op += this.advance();
            op += this.advance();
        } else if (op === '!' && next1 === '=' && next2 === '=') {
            op += this.advance();
            op += this.advance();
        } else if (op === '.' && next1 === '.' && next2 === '.') {
            op += this.advance();
            op += this.advance();
        } else {
            // Check for 2-character operators
            const next = this.peek();
            if (
                (op === '=' && next === '=') ||
                (op === '!' && next === '=') ||
                (op === '>' && next === '=') ||
                (op === '<' && next === '=') ||
                (op === '&' && next === '&') ||
                (op === '|' && next === '|') ||
                (op === '-' && next === '>') ||
                (op === '+' && next === '=') ||
                (op === '-' && next === '=') ||
                (op === '*' && next === '=') ||
                (op === '/' && next === '=') ||
                (op === '%' && next === '=') ||
                (op === '+' && next === '+') ||
                (op === '-' && next === '-') ||
                (op === '*' && next === '*') ||
                (op === '?' && next === '?') ||
                (op === '<' && next === '<') ||
                (op === '>' && next === '>')
            ) {
                op += this.advance();
            }
        }

        if (OperatorDictionary[op] !== undefined) {
            return { type: TokenType.OPERATOR, value: OperatorDictionary[op], line: this.line, column: startCol };
        }

        throw new Error(`[Lexer Error] Unknown operator '${op}' at line ${this.line}, col ${startCol}`);
    }

    public getNextToken(): Token {
        this.skipWhitespace();

        if (this.peek() === '\0') {
            return { type: TokenType.EOF, value: Opcode.EOF, line: this.line, column: this.column };
        }

        const char = this.peek();

        if (this.isAlpha(char)) {
            return this.readIdentifierOrKeyword();
        }

        if (this.isDigit(char)) {
            return this.readNumber();
        }

        if (char === '"' || char === "'") {
            return this.readString();
        }

        if ("+-*/=!><&|%^?!".includes(char)) {
            return this.readOperator();
        }

        if (char === '.' && this.peek(1) === '.' && this.peek(2) === '.') {
            return this.readOperator();
        }

        if ("(){}[],;:.".includes(char)) {
            const startCol = this.column;
            const punct = this.advance();
            return { type: TokenType.PUNCTUATION, value: punct, line: this.line, column: startCol };
        }

        throw new Error(`[Lexer Error] Unexpected character '${char}' at line ${this.line}, col ${this.column}`);
    }

    public tokenizeAll(): Token[] {
        const tokens: Token[] = [];
        let token = this.getNextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            if (tokens.length > Lexer.MAX_TOKENS) {
                throw new Error(`[Lexer Error] Token limit of ${Lexer.MAX_TOKENS} exceeded.`);
            }
            token = this.getNextToken();
        }
        tokens.push(token); // Push EOF
        return tokens;
    }
}
