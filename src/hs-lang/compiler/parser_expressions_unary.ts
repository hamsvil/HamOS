 
import { Opcode, HamASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserExpressionsPrimary } from './parser_expressions_primary';

export abstract class ParserExpressionsUnary extends ParserExpressionsPrimary {
    protected unary(): HamASTNode {
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

    protected call(): HamASTNode {
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
            expr = this.node(Opcode.INC, [expr, false]);
        } else if (this.match(TokenType.OPERATOR, Opcode.DEC)) {
            expr = this.node(Opcode.DEC, [expr, false]);
        }

        return expr;
    }

    protected finishCall(callee: HamASTNode): HamASTNode {
        const startToken = this.previous();
        const args: HamASTNode[] = [];
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
}
