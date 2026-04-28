import { OmniAST, OmniASTNode, Opcode } from '../core/types';
import { TranspilerPart2 } from './transpiler_part2';

/**
 * cHams V5.5: THE AEGIS TRANSPILER (AOT COMPILATION TO JS/TS)
 * 
 * This class is the final entry point for transpilation.
 * It inherits from TranspilerPart2, which inherits from TranspilerPart1.
 */
export class Transpiler extends TranspilerPart2 {
    constructor(ast: OmniAST, isTypeScript: boolean = true) {
        super(ast, isTypeScript);
    }
}
