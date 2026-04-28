 
import { Opcode, OmniASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserExpressions_Part1 } from './parser_expressions_Part1';

export class ParserExpressions_Part2 extends ParserExpressions_Part1 {
    protected unary(): OmniASTNode {
        const operators: Opcode[] = [];
        
        while (true) {
            if (this.match(TokenType.OPERATOR, Opcode.SUB)) {
                operators.push(Opcode.SUB);
            } else if (this.match(TokenType.OPERATOR, Opcode.ADD)) {
                operators.push(Opcode.ADD);
            } else if (this.match(TokenType.OPERATOR, Opcode.NOT)) {
                operators.push(Opcode.NOT);
            } else if (this.match(TokenType.KEYWORD, Opcode.TYPEOF) || this.match(TokenType.OPERATOR, Opcode.TYPEOF)) {
                operators.push(Opcode.TYPEOF);
            } else if (this.match(TokenType.OPERATOR, Opcode.INC)) {
                operators.push(Opcode.INC);
            } else if (this.match(TokenType.OPERATOR, Opcode.DEC)) {
                operators.push(Opcode.DEC);
            } else if (this.match(TokenType.OPERATOR, Opcode.SPREAD)) {
                operators.push(Opcode.SPREAD);
            } else if (this.match(TokenType.KEYWORD, Opcode.AWAIT)) {
                operators.push(Opcode.AWAIT);
            } else {
                break;
            }
        }

        let expr = this.call();

        for (let i = operators.length - 1; i >= 0; i--) {
            const op = operators[i];
            if (op === Opcode.SUB) expr = this.node(Opcode.SUB, [0, expr]);
            else if (op === Opcode.ADD) expr = this.node(Opcode.ADD, [0, expr]);
            else if (op === Opcode.NOT) expr = this.node(Opcode.NOT, [expr]);
            else if (op === Opcode.TYPEOF) expr = this.node(Opcode.TYPEOF, [expr]);
            else if (op === Opcode.INC) expr = this.node(Opcode.INC, [expr, true]);
            else if (op === Opcode.DEC) expr = this.node(Opcode.DEC, [expr, true]);
            else if (op === Opcode.SPREAD) expr = this.node(Opcode.SPREAD, [expr]);
            else if (op === Opcode.AWAIT) expr = this.node(Opcode.AWAIT, [expr]);
        }

        return expr;
    }

    protected call(): OmniASTNode {
        let expr = this.primary();

        while (true) {
            if (this.match(TokenType.PUNCTUATION, '(')) {
                expr = this.finishCall(expr);
            } else if (this.match(TokenType.PUNCTUATION, '.') || this.match(TokenType.OPERATOR, Opcode.OPTIONAL_CHAIN)) {
                const startToken = this.previous();
                const isOptional = startToken.value === Opcode.OPTIONAL_CHAIN;
                const name = this.consume(TokenType.IDENTIFIER, "Expect property name").value as string;
                if (typeof expr === 'string' && expr === 'OS') {
                    expr = this.node(Opcode.OS_CALL, [name], startToken);
                } else if (typeof expr === 'object' && expr !== null && (expr as any).type === Opcode.OS_CALL) {
                    expr = this.node(Opcode.OS_CALL, [`${(expr as any).args[0]}.${name}`], startToken);
                } else {
                    expr = this.node(isOptional ? Opcode.OPTIONAL_CHAIN : Opcode.GET, [expr, `"${name}"`], startToken);
                }
            } else if (this.match(TokenType.PUNCTUATION, '[')) {
                const startToken = this.previous();
                const index = this.expression();
                this.consume(TokenType.PUNCTUATION, "Expect ']' after index", ']');
                expr = this.node(Opcode.GET, [expr, index], startToken);
            } else {
                break;
            }
        }

        if (this.match(TokenType.OPERATOR, Opcode.INC)) {
            expr = this.node(Opcode.INC, [expr, false]); // false = postfix
        } else if (this.match(TokenType.OPERATOR, Opcode.DEC)) {
            expr = this.node(Opcode.DEC, [expr, false]); // false = postfix
        }

        return expr;
    }

    protected finishCall(callee: OmniASTNode): OmniASTNode {
        const startToken = this.previous();
        const args: OmniASTNode[] = [];
        if (!this.check(TokenType.PUNCTUATION, ')')) {
            do {
                if (args.length >= 255) {
                    throw new Error(`[Parser Error] Line ${this.peek().line}: Can't have more than 255 arguments.`);
                }
                args.push(this.expression());
            } while (this.match(TokenType.PUNCTUATION, ','));
        }
        this.consume(TokenType.PUNCTUATION, "Expect ')' after arguments", ')');
        
        if (typeof callee === 'object' && callee !== null && (callee as any).type === Opcode.OS_CALL) {
            return this.node(Opcode.OS_CALL, [(callee as any).args[0], ...args], startToken);
        }

        return this.node(Opcode.CALL, [callee, ...args], startToken);
    }

    protected primary(): OmniASTNode {
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
            
            // Arrow function: x => {}
            if (this.match(TokenType.OPERATOR, Opcode.ARROW)) {
                const startToken = this.previous();
                const body = this.match(TokenType.PUNCTUATION, '{') ? (this as any).block() : [this.node(Opcode.RETURN, [this.expression()], startToken)];
                return this.node(Opcode.FUNC, ["", [val], body, isAsync], startToken);
            }
            
            if (isAsync) {
                this.current -= 2;
                this.advance(); // re-consume IDENTIFIER
            }
            
            return val;
        }

        if (this.match(TokenType.KEYWORD, Opcode.TRUE)) return true;
        if (this.match(TokenType.KEYWORD, Opcode.FALSE)) return false;
        if (this.match(TokenType.KEYWORD, Opcode.NULL)) return null;

        if (this.match(TokenType.KEYWORD, Opcode.THIS)) return this.node(Opcode.THIS);
        if (this.match(TokenType.KEYWORD, Opcode.SUPER)) return this.node(Opcode.SUPER);
        if (this.match(TokenType.KEYWORD, Opcode.OS_CALL)) return "OS";
        if (this.match(TokenType.KEYWORD, Opcode.NEW)) {
            const startToken = this.previous();
            const expr = this.call();
            if (typeof expr === 'object' && expr !== null && (expr as any).type === Opcode.CALL) {
                return this.node(Opcode.NEW, (expr as any).args, startToken);
            }
            return this.node(Opcode.NEW, [expr], startToken);
        }

        if (this.match(TokenType.KEYWORD, Opcode.FUNC)) {
            return (this as any).funcDeclaration(false, true, isAsync); // true = isAnonymous
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
                const arrowToken = this.previous();
                const body = this.match(TokenType.PUNCTUATION, '{') ? (this as any).block() : [this.node(Opcode.RETURN, [this.expression()], arrowToken)];
                return this.node(Opcode.FUNC, ["", params, body, isAsync], startToken);
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
            const elements: OmniASTNode[] = [];
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
            const properties: OmniASTNode[] = [];
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
                        
                        let value: OmniASTNode;
                        if (this.match(TokenType.PUNCTUATION, ':')) {
                            value = this.expression();
                        } else {
                            if (this.previous().type === TokenType.STRING) {
                                throw new Error(`[Parser Error] Line ${this.peek().line}: String literal cannot be used as shorthand property`);
                            }
                            value = key; // Shorthand property
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

    private parseTemplateLiteral(str: string): OmniASTNode {
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
                if (openBraces > 0) throw new Error("[Parser Error] Unterminated template literal expression");
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

    protected parseExpressionFromString(_str: string): OmniASTNode {
        throw new Error("Must be implemented by Parser");
    }

    protected block(): OmniASTNode[] {
        return (this as any).block();
    }
}
