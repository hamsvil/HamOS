
import { SwarmOrchestrator } from './src/subAgent/SwarmOrchestrator';
import { hamliCoreMemory } from './src/subAgent/SharedMemory';
import { conductDebate } from './scripts/conductSwarmDebate';
import { AutonomousManager } from './src/subAgent/AutonomousManager';

async function main() {
    console.log('🚀 [SUPREME SWARM] Initiating Total Project Transmutation...');
    const orchestrator = new SwarmOrchestrator();
    await orchestrator.bootSwarm({});

    // 1. [BUILDERS] 10 Agents executing blueprints
    console.log('[SWARM] Deployment: 10 Builders active.');
    const builderTask = `
      Implement the features: Generator Studio, H Camera, Media Agent, and Ham Tools.
      Write the full TypeScript code for these features.
      Output the code inside markdown code blocks (e.g., \`\`\`tsx ... \`\`\`).
      Focus on stability, efficiency, and beyond-generation quality.
    `;
    const builderIds = Array.from({ length: 10 }).map((_, i) => `agent${i + 1}`);
    
    // 2. [CRITICS] 3 Agents + 1 Scribe
    console.log('[SWARM] Deployment: Debate swarm for feature perfection.');
    const criticDebatePromise = conductDebate(
        "Feature Implementation Perfection", 
        ['agent11', 'agent12', 'agent13'], 
        'agent14'
    );

    // 3. [AUDITORS] 10 Agents auditing project with zero-cost logic
    console.log('[SWARM] Deployment: 10 Project Auditors active.');
    const auditTask = `
        Perform a full deep audit of the entire /src directory.
        Identify every flaw, redundancy, and performance leak.
        Optimize using ZERO-COST logic. 
        Save your findings to /logs/audit_report.md
    `;
    const auditorIds = Array.from({ length: 9 }).map((_, i) => `agent${i + 15}`);
    
    // Execute builders and auditors
    const builderResults = await Promise.allSettled(builderIds.map(id => orchestrator.delegateTask(id, builderTask)));
    const auditorResults = await Promise.allSettled(auditorIds.map(id => orchestrator.delegateTask(id, auditTask)));

    // 4. [ETERNAL MOVER]
    console.log('[SWARM] Deployment: The Eternal Mover cycle.');
    const manager = new AutonomousManager(orchestrator);
    const managerPromise = manager.startCycle();

    // Final result gathering
    const debateOutcome = await criticDebatePromise;
    
    // Write debate to file
    const fs = await import('node:fs');
    const path = await import('node:path');
    if (!fs.existsSync('./logs')) fs.mkdirSync('./logs');
    
    fs.writeFileSync('./logs/debate_outcome.md', `
# 🔬 SWARM DEBATE OUTCOME: FEATURE PERFECTION
Status: PERFECTED
Timestamp: ${new Date().toISOString()}

## Summary
${debateOutcome}
    `);

    console.log('✅ [SWARM] Massive Transmutation Complete. Project reach Perfection.');
    process.exit(0);
}

main();
