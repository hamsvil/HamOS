 
// [ARCHITECTURE] File is large. Consider splitting into smaller modules.
import { Opcode, HamASTNode } from '../core/types';
import { TokenType } from './lexer';
import { ParserExpressionsBinary } from './parser_expressions_binary';

// ============================================================================
// Ham Engine V5.5: THE QUANTUM PARSER EXPRESSIONS
// ============================================================================

export class ParserExpressions extends ParserExpressionsBinary {
    protected expression(): HamASTNode {
        return this.assignment();
    }

    protected assignment(): HamASTNode {
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

    protected ternary(): HamASTNode {
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

    protected nullishCoalescing(): HamASTNode {
        let expr = this.logicalOr();
        while (this.match(TokenType.OPERATOR, Opcode.NULLISH)) {
            const startToken = this.previous();
            const right = this.logicalOr();
            expr = this.node(Opcode.NULLISH, [expr, right], startToken);
        }
        return expr;
    }

    protected parseExpressionFromString(str: string): HamASTNode {
        throw new Error("Must be implemented by Parser");
    }

    protected block(): HamASTNode[] {
        // This is implemented in parser.ts, but we need it here for arrow functions.
        return (this as any).block();
    }
}
