 
import { Opcode, HamASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserDeclarations } from './parser_declarations';

export abstract class ParserExpressionsPrimary extends ParserDeclarations {
    protected abstract expression(): HamASTNode;
    protected abstract call(): HamASTNode;
    protected abstract parseExpressionFromString(str: string): HamASTNode;

    protected primary(): HamASTNode {
        if (this.match(TokenType.NUMBER)) return this.previous().value as number;
        
        if (this.match(TokenType.STRING)) {
            const token = this.previous();
            if (token.quoteType === '`') {
                return this.parseTemplateLiteral(token.value as string);
            }
            return `"${token.value}"`;
        }
        
        let isAsync = false;
        if (this.match(TokenType.KEYWORD, Opcode.ASYNC)) {
            if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
                return (this as any).funcDeclaration(false, true, true);
            }
            isAsync = true;
        }

        if (this.match(TokenType.IDENTIFIER)) {
            const val = this.previous().value as string;
            
            if (this.match(TokenType.OPERATOR, Opcode.ARROW)) {
                const body = this.match(TokenType.PUNCTUATION, '{') ? (this as any).block() : [[Opcode.RETURN, this.expression()]];
                return [Opcode.FUNC, "", [{name: val, type: null}], body, null, true, isAsync];
            }
            
            if (isAsync) {
                this.current -= 2;
                this.advance();
            }
            
            return val;
        }

        if (this.match(TokenType.KEYWORD, Opcode.TRUE)) return true;
        if (this.match(TokenType.KEYWORD, Opcode.FALSE)) return false;
        if (this.match(TokenType.KEYWORD, Opcode.NULL)) return null;

        if (this.match(TokenType.KEYWORD, Opcode.THIS)) return this.node(Opcode.THIS);
        if (this.match(TokenType.KEYWORD, Opcode.SUPER)) return this.node(Opcode.SUPER);
        if (this.match(TokenType.KEYWORD, Opcode.NEW)) {
            const startToken = this.previous();
            const expr = this.call();
            return this.node(Opcode.NEW, [expr], startToken);
        }

        if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
            return (this as any).funcDeclaration(false, true, isAsync);
        }

        if (this.match(TokenType.KEYWORD, Opcode.IMPORT)) {
            const startToken = this.previous();
            const path = this.expression();
            return this.node(Opcode.IMPORT, [path], startToken);
        }

        if (this.match(TokenType.PUNCTUATION, '(')) {
            const startToken = this.previous();
            const startPos = this.current;
            let isArrow = false;
            let params = [];
            if (!this.check(TokenType.PUNCTUATION, ')')) {
                do {
                    if (this.check(TokenType.IDENTIFIER)) {
                        params.push(this.peek().value);
                        this.advance();
                    } else {
                        break;
                    }
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            if (this.match(TokenType.PUNCTUATION, ')') && this.match(TokenType.OPERATOR, Opcode.ARROW)) {
                isArrow = true;
            }
            
            if (isArrow) {
                const body = this.match(TokenType.PUNCTUATION, '{') ? (this as any).block() : [[Opcode.RETURN, this.expression()]];
                return this.node(Opcode.FUNC, ["", params.map(p => ({name: p as string, type: null})), body, null, true, isAsync], startToken);
            } else {
                this.current = startPos;
                const expr = this.expression();
                this.consume(TokenType.PUNCTUATION, "Expect ')' after expression", ')');
                if (isAsync) {
                    throw new Error(`[Parser Error] Line ${this.peek().line}: Invalid async expression.`);
                }
                return expr;
            }
        }

        if (isAsync) {
            throw new Error(`[Parser Error] Line ${this.peek().line}: Invalid async expression.`);
        }

        if (this.match(TokenType.PUNCTUATION, '[')) {
            const startToken = this.previous();
            const elements: HamASTNode[] = [];
            if (!this.check(TokenType.PUNCTUATION, ']')) {
                do {
                    elements.push(this.expression());
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, "Expect ']' after array elements", ']');
            return this.node(Opcode.ARRAY, elements, startToken);
        }

        if (this.match(TokenType.PUNCTUATION, '{')) {
            const startToken = this.previous();
            const properties: HamASTNode[] = [];
            if (!this.check(TokenType.PUNCTUATION, '}')) {
                do {
                    if (this.match(TokenType.OPERATOR, Opcode.SPREAD)) {
                        const spreadToken = this.previous();
                        const expr = this.expression();
                        properties.push(this.node(Opcode.SPREAD, [expr], spreadToken), null as any);
                    } else {
                        let key: string;
                        if (this.match(TokenType.IDENTIFIER) || this.match(TokenType.STRING)) {
                            key = this.previous().value as string;
                        } else {
                            throw new Error(`[Parser Error] Line ${this.peek().line}: Expect property name`);
                        }
                        
                        let value: HamASTNode;
                        if (this.match(TokenType.PUNCTUATION, ':')) {
                            value = this.expression();
                        } else {
                            if (this.previous().type === TokenType.STRING) {
                                throw new Error(`[Parser Error] Line ${this.peek().line}: String literal cannot be used as shorthand property`);
                            }
                            value = key;
                        }
                        properties.push(key, value);
                    }
                } while (this.match(TokenType.PUNCTUATION, ','));
            }
            this.consume(TokenType.PUNCTUATION, "Expect '}' after object properties", '}');
            return this.node(Opcode.OBJECT, properties, startToken);
        }

        throw new Error(`[Parser Error] Line ${this.peek().line}: Expect expression. Found '${this.peek().value}'`);
    }

    private parseTemplateLiteral(str: string): HamASTNode {
        const parts = [];
        let current = '';
        let i = 0;
        while (i < str.length) {
            if (str[i] === '$' && str[i+1] === '{') {
                if (current) parts.push(`"${current}"`);
                current = '';
                i += 2;
                
                let exprStr = '';
                let openBraces = 1;
                let inString = false;
                let stringQuote = '';
                
                while (i < str.length && openBraces > 0) {
                    const char = str[i];
                    
                    if (!inString) {
                        if (char === '{') openBraces++;
                        else if (char === '}') openBraces--;
                        else if (char === '"' || char === "'" || char === '`') {
                            inString = true;
                            stringQuote = char;
                        }
                    } else {
                        if (char === stringQuote && str[i-1] !== '\\') {
                            inString = false;
                        }
                    }
                    
                    if (openBraces > 0) exprStr += char;
                    i++;
                }
                
                if (openBraces > 0) {
                    throw new Error("[Parser Error] Unterminated template literal expression");
                }
                
                parts.push(this.parseExpressionFromString(exprStr));
            } else {
                current += str[i];
                i++;
            }
        }
        if (current) parts.push(`"${current}"`);
        
        if (parts.length === 0) return '""';
        let expr = parts[0];
        for (let j = 1; j < parts.length; j++) {
            expr = this.node(Opcode.ADD, [expr, parts[j]]);
        }
        return expr;
    }
}
