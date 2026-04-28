import { sovereign } from './src/sAgent/core/Sovereign';

async function testSovereign() {
    console.log("🏛️  [SOVEREIGN TEST] Igniting the Omni-Entity...");
    
    const prompt = "Audit the project structure and summarize the new Sovereign architecture.";
    
    try {
        const result = await sovereign.execute(prompt);
        console.log("\n--- SOVEREIGN RESPONSE ---");
        console.log(result);
        console.log("--------------------------");
    } catch (e) {
        console.error("❌ Sovereign Test Failed:", e);
    }
}

testSovereign();
