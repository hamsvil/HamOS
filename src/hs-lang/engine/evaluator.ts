 
import { Opcode, HamAST, HamASTNode } from '../core/types';
import { Environment } from './memory';
import { EvaluatorExpressions } from './evaluator_expressions';
import { handleComplexOpcode } from './evaluatorOpcodes';

export { OSRegistry, ModuleCache } from './evaluator_core';

/**
 * The Aegis Evaluator
 * Executes Ham-DNA (JSON AST) asynchronously.
 * Implements Time-Slicing to guarantee zero UI freeze.
 */
export class Evaluator extends EvaluatorExpressions {
    protected async evaluateOpcode(opcode: Opcode, args: any[], env: Environment): Promise<unknown> {
        // First try to evaluate as an expression
        const exprResult = await this.evaluateExpressionOp(opcode, args, env);
        if (exprResult.handled) {
            return exprResult.value;
        }

        // Try complex opcodes (statements, declarations, etc.)
        const complexResult = await handleComplexOpcode(this, opcode, args, env);
        if (complexResult !== undefined) {
            return complexResult;
        }

        // Otherwise, evaluate as a basic statement
        switch (opcode) {
            case Opcode.TYPE_DECL:
            case Opcode.INTERFACE_DECL:
                // Types and interfaces are erased at runtime
                return null;
            case Opcode.BREAK:
                throw { isBreak: true };
            case Opcode.CONTINUE:
                throw { isContinue: true };
            
            default:
                throw new Error(`[Runtime Error] Unknown Opcode: ${opcode}`);
        }
    }
}
