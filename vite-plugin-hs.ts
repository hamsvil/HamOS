import { Plugin } from 'vite';
import { Lexer } from './src/hs-lang/compiler/lexer';
import { Parser } from './src/hs-lang/compiler/parser';
import { Transpiler } from './src/hs-lang/compiler/transpiler';

export default function hsPlugin(): Plugin {
    return {
        name: 'vite-plugin-hs',
        enforce: 'pre',
        transform(code: string, id: string) {
            if (id.endsWith('.hs') || id.endsWith('.hsx')) {
                try {
                    const lexer = new Lexer(code);
                    const tokens = lexer.tokenizeAll();
                    const parser = new Parser(tokens);
                    const ast = parser.parse();
                    const transpiler = new Transpiler(ast, true); // Transpile to TS
                    const transpiledCode = transpiler.transpile();
                    
                    return {
                        code: transpiledCode,
                        map: null // We can add source maps later
                    };
                } catch (e: unknown) {
                    this.error(`Ham Engine Compilation Error in ${id}: ${e.message}`);
                }
            }
        }
    };
}
