import { DeepResearchAgent } from './src/sAgent/legacy/DeepAgentic/BaseDeepResearchAgent';
import { DeepAutonomousAgent } from './src/sAgent/legacy/DeepAgentic/DeepAutonomousAgent';
import { getDynamicGeminiKeys } from './src/config/hardcodedKeys';
import { KeyRotator } from './src/sAgent/legacy/coreAgents/KeyRotator';
import * as fs from 'fs';
import * as path from 'path';

async function enhanceBlueprints() {
  console.log("🚀 DeepAgentic Initialization for Blueprint Perfection...");

  const keys = await getDynamicGeminiKeys();
  KeyRotator.getInstance().registerKeys(keys);

  const base = new DeepResearchAgent({
    id: 'agent99',
    name: 'Supreme Architect',
    role: 'Deep Blueprint Architect',
    systemInstruction: `You are the Supreme Architect, operating under the AGENTIC SUPREME PROTOCOL.
Your task is to refine, perfect, and expand technical blueprint documents.
Output MUST be in Markdown. Do not enclose the output in json blocks.
Ensure Hexagonal Architecture, Zero-Cost Pragmatism, and Agentic Supreme Protocol concepts are woven into the blueprint deeply.`,
    apiKeys: KeyRotator.getInstance().getCombinedQueue([])
  });

  const deepAgent = new DeepAutonomousAgent(base);
  const blueprintDir = path.join(process.cwd(), 'blueprint');

  try {
    const files = fs.readdirSync(blueprintDir);
    const mdFiles = files.filter(f => f.endsWith('.md'));

    for (const file of mdFiles) {
      console.log(`\n=====================================`);
      console.log(`🧠 SYNTHESIZING: ${file}`);
      console.log(`=====================================`);

      const filePath = path.join(blueprintDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');

      const goal = `Analisis, sempurnakan, dan kembangkan blueprint berikut menjadi master plan arsitektur teknis yang sangat mendalam dan mematuhi AGENTIC SUPREME PROTOCOL. File: ${file}.
Konten saat ini: \n${content}\n
Outputkan KESELURUHAN file markdown yang baru, siap di-overwrite, tanpa block markdown atau json berlebih.`;

      const result = await deepAgent.autoExecute(goal);

      console.log(`✅ [${file}] PERFECTION COMPLETE (${result.totalDurationMs}ms)`);
      
      // Clean up json artifacts if any
      let finalContent = result.final;
      if (finalContent.startsWith('\`\`\`markdown')) {
          finalContent = finalContent.replace(/^\`\`\`markdown\n?/, '').replace(/\n?\`\`\`$/, '');
      }

      fs.writeFileSync(filePath, finalContent, 'utf-8');
      console.log(`💾 Saved updated ${file}`);
    }

    console.log("\n✅ ALL BLUEPRINTS PERFECTED & OVERWRITTEN.");
  } catch (error) {
    console.error("❌ DeepAgentic Runner Failed:", error);
  }
}

enhanceBlueprints();
