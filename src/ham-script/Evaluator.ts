 
import { Lexer } from './Lexer';
import { Parser } from './Parser';
import { Transpiler } from './Transpiler';

export class Evaluator {
  private transpiler = new Transpiler();

  async evaluate(source: string, language: 'ID' | 'EN' = 'ID'): Promise<any> {
    try {
      const lexer = new Lexer(source, language);
      const tokens = lexer.scanTokens();
      
      const parser = new Parser(tokens);
      const statements = parser.parse();
      
      const jsCode = this.transpiler.transpile(statements);
      
      console.log('[HamScript] Transpiled JS:', jsCode);
      
      // Execute the transpiled JS safely using a Web Worker.
      // Hardened: uses AsyncFunction constructor (no lexical scope leak)
      // instead of raw eval(). Worker is isolated + 5s timeout.
      return new Promise((resolve, reject) => {
        const workerCode = `
          const AsyncFunction = Object.getPrototypeOf(async function(){}).constructor;
          self.onmessage = async function(e) {
            try {
              const fn = new AsyncFunction(e.data.code);
              const result = await fn();
              self.postMessage({ success: true, result });
            } catch (error) {
              self.postMessage({ success: false, error: error.message });
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(blob);
        const worker = new Worker(workerUrl);
        
        const timeout = setTimeout(() => {
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(new Error('HamScript execution timed out'));
        }, 5000); // 5 second timeout
        
        worker.onmessage = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        };
        
        worker.onerror = (e) => {
          clearTimeout(timeout);
          worker.terminate();
          URL.revokeObjectURL(workerUrl);
          reject(new Error(e.message));
        };
        
        worker.postMessage({ code: jsCode });
      });
    } catch (error) {
      console.error('[HamScript] Evaluation Error:', error);
      throw error;
    }
  }
}

export const hamEvaluator = new Evaluator();
