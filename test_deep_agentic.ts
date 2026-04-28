
import { DeepResearchAgent } from './src/sAgent/legacy/DeepAgentic/BaseDeepResearchAgent';
import { DeepAutonomousAgent } from './src/sAgent/legacy/DeepAgentic/DeepAutonomousAgent';
import { getDynamicGeminiKeys } from './src/config/hardcodedKeys';
import { KeyRotator } from './src/sAgent/legacy/coreAgents/KeyRotator';

async function testDeepAgentic() {
  console.log("🧪 Testing DeepAgentic (Agent 25) with Deep Research Max Engine...\n");
  
  const keys = await getDynamicGeminiKeys();
  KeyRotator.getInstance().registerKeys(keys);
  
  const base = new DeepResearchAgent({
    id: 'agent25',
    name: 'DeepAgentic',
    role: 'Deep Research Specialist',
    systemInstruction: 'You are a deep researcher.',
    apiKeys: KeyRotator.getInstance().getCombinedQueue([])
  });

  const deepAgent = new DeepAutonomousAgent(base);
  
  try {
    const goal = "Analisis potensi ekonomi dari eksplorasi asteroid di tahun 2040-2050";
    const result = await deepAgent.autoExecute(goal);
    
    console.log("\n✅ RESEARCH COMPLETED ✅");
    console.log("Goal:", result.goal);
    console.log("Duration:", result.totalDurationMs, "ms");
    console.log("\nFinal Report Snippet:\n", result.final.substring(0, 500), "...");
  } catch (error: any) {
    console.error("❌ DeepAgentic Test Failed:", error.message);
  }
}

testDeepAgentic();
