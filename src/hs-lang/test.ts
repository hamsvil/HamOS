 
import { HamEngineEngine } from './index';

async function runTests() {
    const engine = new HamEngineEngine();
    await engine.init();

    const code = `
        let x = 10;
        let y = 20;
        let z = x + y * 2;
        print(z);
        
        func add(a, b) {
            return a + b;
        }
        
        print(add(5, 5));
        
        class Person {
            func constructor(name) {
                this.name = name;
            }
            
            func sayHello() {
                print("Hello, " + this.name);
            }
        }
        
        let p = new Person("Alice");
        p.sayHello();

        let i = 0;
        while (i < 3) {
            print(i);
            i = i + 1;
        }

        try {
            print("Trying...");
        } catch (e) {
            print(e);
        } finally {
            print("Done.");
        }
    `;

    // console.log("Compiling...");
    const ast = engine.compile(code);
    // console.log("AST:", JSON.stringify(ast, null, 2));
    
    // console.log("\nDeparsing...");
    const deparsed = engine.decompile(ast.ast);
    // console.log(deparsed);

    // console.log("\nExecuting...");
    await engine.execute(ast);
}

runTests().catch(console.error);
