
import { SwarmOrchestrator } from '../src/subAgent/SwarmOrchestrator';
import { hamliCoreMemory } from '../src/subAgent/SharedMemory';

/**
 * [SWARM DEBATE RUNNER]
 * Facilitates adversarial collaboration between agents to reach perfection.
 */
export async function conductDebate(topic: string, participantIds: string[], scribeId: string) {
    const orchestrator = new SwarmOrchestrator();
    // In actual app, we boot outside, but for script we need keys.
    // Since we are in Node, it will pull from hardcodedKeys.ts
    await (orchestrator as any).bootSwarm({}); 

    console.log(`\n[DEBATE START] Topic: ${topic}`);
    console.log(`Participants: ${participantIds.join(', ')}`);
    console.log(`Scribe: ${scribeId}`);

    let currentThesis = `Initial Draft for ${topic}`;
    const rounds = 3;

    for (let i = 1; i <= rounds; i++) {
        console.log(`\n--- Round ${i} ---`);
        for (const pId of participantIds) {
            const critiquePrompt = `
                Current State of Work: ${currentThesis}
                Analyze this work for FLAWLESS perfection. 
                Be BRUTAL. Find every missing logic, inefficiency, and visual inconsistency.
                Propose the PERFECT solution using ZERO-COST logic.
                Update the Shared Memory with your intense critique.
            `;
            const critique = await orchestrator.delegateTask(pId, critiquePrompt);
            hamliCoreMemory.save(`DEBATE_ROUND_${i}_${pId}`, critique);
            currentThesis += `\n[Critique from ${pId}]: ${critique}`;
        }
    }

    // Final Scribe Consolidation
    console.log(`\n[SCRIBE] Finalizing flawless output...`);
    const finalPrompt = `
        Summarize the intense debate recorded in Shared Memory for topic: ${topic}.
        Synthesize all critiques into one PERFECT, ZERO-FAULT blueprint and implementation plan.
        Ensure the output is 100% stable, efficient, and beyond criticism.
    `;
    const finalResult = await orchestrator.delegateTask(scribeId, finalPrompt);
    hamliCoreMemory.save(`FINAL_PERFECTED_${topic.toUpperCase().replace(/\s/g, '_')}`, finalResult);
    
    console.log(`\n[DEBATE COMPLETE] Final outcome saved to Core Memory.`);
    await hamliCoreMemory.persist();
    return finalResult;
}
