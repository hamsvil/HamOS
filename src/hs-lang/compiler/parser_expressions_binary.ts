 
import { Opcode, HamASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserExpressionsUnary } from './parser_expressions_unary';

export abstract class ParserExpressionsBinary extends ParserExpressionsUnary {
    protected logicalOr(): HamASTNode {
        let expr = this.logicalAnd();
        while (this.match(TokenType.OPERATOR, Opcode.OR)) {
            const startToken = this.previous();
            const right = this.logicalAnd();
            expr = this.node(Opcode.OR, [expr, right], startToken);
        }
        return expr;
    }

    protected logicalAnd(): HamASTNode {
        let expr = this.bitwiseOr();
        while (this.match(TokenType.OPERATOR, Opcode.AND)) {
            const startToken = this.previous();
            const right = this.bitwiseOr();
            expr = this.node(Opcode.AND, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseOr(): HamASTNode {
        let expr = this.bitwiseXor();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_OR)) {
            const startToken = this.previous();
            const right = this.bitwiseXor();
            expr = this.node(Opcode.BIT_OR, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseXor(): HamASTNode {
        let expr = this.bitwiseAnd();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_XOR)) {
            const startToken = this.previous();
            const right = this.bitwiseAnd();
            expr = this.node(Opcode.BIT_XOR, [expr, right], startToken);
        }
        return expr;
    }

    protected bitwiseAnd(): HamASTNode {
        let expr = this.equality();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_AND)) {
            const startToken = this.previous();
            const right = this.equality();
            expr = this.node(Opcode.BIT_AND, [expr, right], startToken);
        }
        return expr;
    }

    protected equality(): HamASTNode {
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

    protected comparison(): HamASTNode {
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

    protected bitwiseShift(): HamASTNode {
        let expr = this.term();
        while (this.match(TokenType.OPERATOR, Opcode.BIT_LSHIFT) || this.match(TokenType.OPERATOR, Opcode.BIT_RSHIFT)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.term();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected term(): HamASTNode {
        let expr = this.factor();
        while (this.match(TokenType.OPERATOR, Opcode.ADD) || this.match(TokenType.OPERATOR, Opcode.SUB)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.factor();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected factor(): HamASTNode {
        let expr = this.exponent();
        while (this.match(TokenType.OPERATOR, Opcode.MUL) || this.match(TokenType.OPERATOR, Opcode.DIV) || this.match(TokenType.OPERATOR, Opcode.MOD)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.exponent();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }

    protected exponent(): HamASTNode {
        let expr = this.unary();
        while (this.match(TokenType.OPERATOR, Opcode.EXP)) {
            const operator = this.previous().value as Opcode;
            const startToken = this.previous();
            const right = this.unary();
            expr = this.node(operator, [expr, right], startToken);
        }
        return expr;
    }
}
