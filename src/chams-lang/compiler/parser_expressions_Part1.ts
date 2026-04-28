 
import { Opcode, OmniASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserCore } from './parser_core';

export class ParserExpressions_Part1 extends ParserCore {
    protected expression(): OmniASTNode {
        return this.assignment();
    }

    protected assignment(): OmniASTNode {
        const expr = this.ternary();

        if (this.match(TokenType.OPERATOR, Opcode.ASSIGN) ||
            this.match(TokenType.OPERATOR, Opcode.ADD_ASSIGN) ||
            this.match(TokenType.OPERATOR, Opcode.SUB_ASSIGN) ||
            this.match(TokenType.OPERATOR, Opcode.MUL_ASSIGN) ||
            this.match(TokenType.OPERATOR, Opcode.DIV_ASSIGN) ||
            this.match(TokenType.OPERATOR, Opcode.MOD_ASSIGN)) {
            
            const operator = this.previous().value as Opcode;
            const equals = this.previous();
            const value = this.assignment();

            const opMap: Record<number, Opcode> = {
                [Opcode.ADD_ASSIGN]: Opcode.ADD,
                [Opcode.SUB_ASSIGN]: Opcode.SUB,
                [Opcode.MUL_ASSIGN]: Opcode.MUL,
                [Opcode.DIV_ASSIGN]: Opcode.DIV,
                [Opcode.MOD_ASSIGN]: Opcode.MOD,
            };

            if (typeof expr === 'string') {
                if (operator === Opcode.ASSIGN) {
                    return this.node(Opcode.ASSIGN, [expr, value], equals);
                } else {
                    return this.node(Opcode.ASSIGN, [expr, this.node(opMap[operator], [expr, value], equals)], equals);
                }
            } else if (typeof expr === 'object' && expr !== null && (expr as any).type === Opcode.GET) {
                const args = (expr as any).args;
                if (operator === Opcode.ASSIGN) {
                    return this.node(Opcode.SET, [args[0], args[1], value], equals);
                } else {
                    return this.node(Opcode.SET, [args[0], args[1], this.node(opMap[operator], [expr, value], equals)], equals);
                }
            }

            throw new Error(`[Parser Error] Line ${equals.line}: Invalid assignment target.`);
        }

        return expr;
    }

    protected ternary(): OmniASTNode {
        let expr = this.nullishCoalescing();
        if (this.match(TokenType.PUNCTUATION, '?')) {
            const startToken = this.previous();
            const trueExpr = this.expression();
            this.consume(TokenType.PUNCTUATION, "Expect ':' in ternary expression", ':');
            const falseExpr = this.expression();
            return this.node(Opcode.TERNARY, [expr, trueExpr, falseExpr], startToken);
        }
        return expr;
    }

    protected nullishCoalescing(): OmniASTNode {
        let expr = this.logicalOr();
        while (this.match(TokenType.OPERATOR, Opcode.NULLISH)) {
            const startToken = this.previous();
            const right = this.logicalOr();
            expr = this.node(Opcode.NULLISH, [expr, right], startToken);
        }
        return expr;
    }

    protected logicalOr(): OmniASTNode {
        let expr = this.logicalAnd();
        while (this.match(TokenType.OPERATOR, Opcode.OR)) {
            const startToken = this.previous();
            const right = this.logicalAnd();
            expr = this.node(Opcode.OR, [expr, right], startToken);
        }
        return expr;
    }

    protected logicalAnd(): OmniASTNode {
        let expr = this.bitwiseOr();
        while (this.match(TokenType.OPERATOR, Opcode.AND)) {
            const startToken = this.previous();
            const right = this.bitwiseOr();
            expr = this.node(Opcode.AND, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseOr(): OmniASTNode {
        let expr = this.bitwiseXor();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_OR)) {
            const startToken = this.previous();
            const right = this.bitwiseXor();
            expr = this.node(Opcode.BIT_OR, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseXor(): OmniASTNode {
        let expr = this.bitwiseAnd();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_XOR)) {
            const startToken = this.previous();
            const right = this.bitwiseAnd();
            expr = this.node(Opcode.BIT_XOR, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseAnd(): OmniASTNode {
        let expr = this.equality();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_AND)) {
            const startToken = this.previous();
            const right = this.equality();
            expr = this.node(Opcode.BIT_AND, [expr, right], startToken);
        }
        return expr;
    }

    protected equality(): OmniASTNode {
        let expr = this.comparison();
        while (this.match(TokenType.OPERATOR, Opcode.EQ) || this.match(TokenType.OPERATOR, Opcode.NEQ) ||
               this.match(TokenType.OPERATOR, Opcode.STRICT_EQ) || this.match(TokenType.OPERATOR, Opcode.STRICT_NEQ)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.comparison();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected comparison(): OmniASTNode {
        let expr = this.bitwiseShift();
        while (
            this.match(TokenType.OPERATOR, Opcode.GT) || 
            this.match(TokenType.OPERATOR, Opcode.GTE) || 
            this.match(TokenType.OPERATOR, Opcode.LT) || 
            this.match(TokenType.OPERATOR, Opcode.LTE)
        ) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.bitwiseShift();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseShift(): OmniASTNode {
        let expr = this.term();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_LSHIFT) || this.match(TokenType.OPERATOR, Opcode.BIT_RSHIFT)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.term();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected term(): OmniASTNode {
        let expr = this.factor();
        while (this.match(TokenType.OPERATOR, Opcode.ADD) || this.match(TokenType.OPERATOR, Opcode.SUB)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.factor();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected factor(): OmniASTNode {
        let expr = this.exponent();
        while (this.match(TokenType.OPERATOR, Opcode.MUL) || this.match(TokenType.OPERATOR, Opcode.DIV) || this.match(TokenType.OPERATOR, Opcode.MOD)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.exponent();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected exponent(): OmniASTNode {
        let expr = (this as any).unary();
        while (this.match(TokenType.OPERATOR, Opcode.EXP)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = (this as any).unary();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }
}
