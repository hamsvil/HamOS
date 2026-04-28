 
import { Opcode } from '../core/types';
import { LexerDictionary, OperatorDictionary } from '../core/dictionary';

// ============================================================================
// Ham Engine V5.5: THE QUANTUM LEXER (STATE MACHINE)
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
    quoteType?: string; // To track backticks for string interpolation
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

    constructor(input: string, language: 'EN' | 'ID' | 'JP' = 'EN') {
        this.input = input;
        this.language = language;
    }

    private peek(offset: number = 0): string {
        let pos = this.position;
        for (let i = 0; i < offset; i++) {
            const code = this.input.codePointAt(pos);
            if (code === undefined) return '\0';
            pos += code > 0xFFFF ? 2 : 1;
        }
        const code = this.input.codePointAt(pos);
        if (code === undefined) return '\0';
        return String.fromCodePoint(code);
    }

    private advance(): string {
        const char = this.peek();
        if (char === '\0') return char;
        
        const code = char.codePointAt(0)!;
        this.position += code > 0xFFFF ? 2 : 1;
        
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
        // Support Unicode identifiers
        const code = char.codePointAt(0)!;
        return (char >= 'a' && char <= 'z') || (char >= 'A' && char <= 'Z') || char === '_' || char === '$' || code > 127;
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
        if (Object.prototype.hasOwnProperty.call(dict, value)) {
            return { type: TokenType.KEYWORD, value: dict[value], line: this.line, column: startCol };
        }

        return { type: TokenType.IDENTIFIER, value, line: this.line, column: startCol };
    }

    private readNumber(): Token {
        const startCol = this.column;
        let value = '';
        let hasDot = false;
        let hasExponent = false;

        // Handle Hexadecimal and Binary
        if (this.peek() === '0') {
            const next = this.peek(1).toLowerCase();
            if (next === 'x') {
                value += this.advance(); // '0'
                value += this.advance(); // 'x'
                while (this.isDigit(this.peek()) || (this.peek().toLowerCase() >= 'a' && this.peek().toLowerCase() <= 'f')) {
                    value += this.advance();
                }
                return { type: TokenType.NUMBER, value: parseInt(value, 16), line: this.line, column: startCol };
            } else if (next === 'b') {
                value += this.advance(); // '0'
                value += this.advance(); // 'b'
                while (this.peek() === '0' || this.peek() === '1') {
                    value += this.advance();
                }
                return { type: TokenType.NUMBER, value: parseInt(value.substring(2), 2), line: this.line, column: startCol };
            }
        }

        if (this.peek() === '.') {
            hasDot = true;
            value += this.advance();
        }

        while (this.isDigit(this.peek()) || (this.peek() === '.' && !hasDot) || (this.peek().toLowerCase() === 'e' && !hasExponent)) {
            if (this.peek() === '.') {
                hasDot = true;
            } else if (this.peek().toLowerCase() === 'e') {
                hasExponent = true;
                value += this.advance();
                if (this.peek() === '+' || this.peek() === '-') {
                    value += this.advance();
                }
                continue;
            }
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
        
        // DFA-based operator reading
        while (true) {
            const next = this.peek();
            const combined = op + next;
            
            // Check if combined is a valid prefix or full operator
            // We can use a simple check against OperatorDictionary or known prefixes
            const isPrefix = (c: string) => {
                const prefixes = ["==", "!=", ">=", "<=", "&&", "||", "->", "=>", "++", "--", "**", "+=", "-=", "*=", "/=", "%=", "<<", ">>", "??", "?.","===", "!==", "<<=", ">>=", "**=", "??="];
                return prefixes.some(p => p.startsWith(c));
            };

            if (isPrefix(combined)) {
                op += this.advance();
            } else {
                break;
            }
        }

        if (Object.prototype.hasOwnProperty.call(OperatorDictionary, op)) {
            return { type: TokenType.OPERATOR, value: OperatorDictionary[op], line: this.line, column: startCol };
        }

        // Special case for Reactive Stream Binding Arrow (->)
        if (op === '->') {
            return { type: TokenType.OPERATOR, value: Opcode.BIND, line: this.line, column: startCol };
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

        if (this.isDigit(char) || (char === '.' && this.isDigit(this.peek(1)))) {
            return this.readNumber();
        }

        if (char === '"' || char === "'" || char === '`') {
            return this.readString();
        }

        if ("+-*/=!><&|%^".includes(char)) {
            return this.readOperator();
        }

        if ("(){}[],;:.?".includes(char)) {
            const startCol = this.column;
            const punct = this.advance();
            
            if (punct === '.' && this.peek() === '.' && this.peek(1) === '.') {
                this.advance();
                this.advance();
                return { type: TokenType.OPERATOR, value: Opcode.SPREAD, line: this.line, column: startCol };
            }
            
            if (punct === '?') {
                if (this.peek() === '.') {
                    this.advance();
                    return { type: TokenType.OPERATOR, value: Opcode.OPTIONAL_CHAIN, line: this.line, column: startCol };
                }
                if (this.peek() === '?') {
                    this.advance();
                    return { type: TokenType.OPERATOR, value: Opcode.NULLISH, line: this.line, column: startCol };
                }
            }
            
            return { type: TokenType.PUNCTUATION, value: punct, line: this.line, column: startCol };
        }

        throw new Error(`[Lexer Error] Unexpected character '${char}' at line ${this.line}, col ${this.column}`);
    }

    public tokenizeAll(): Token[] {
        const tokens: Token[] = [];
        let token = this.getNextToken();
        while (token.type !== TokenType.EOF) {
            tokens.push(token);
            token = this.getNextToken();
        }
        tokens.push(token); // Push EOF
        return tokens;
    }
}
