import { SwarmOrchestrator } from './src/sAgent/coreAgents/SwarmOrchestrator';
import fs from 'fs';
import path from 'path';

async function deepScan() {
    console.log('--- SWARM DEEP SCAN INITIATED ---');
    const orchestrator = new SwarmOrchestrator();
    await orchestrator.bootSwarm({});

    const agents = [
        { id: 'agent1', file: 'ls_erorr1.md', task: 'Scan UI/UX, React Components, Tailwind, and Framer Motion for errors/inefficiencies.' },
        { id: 'agent2', file: 'ls_erorr2.md', task: 'Scan Core Logic, State Management (Zustand/Context), and Hooks for bugs/race conditions.' },
        { id: 'agent3', file: 'ls_erorr3.md', task: 'Scan Security, Firebase Rules, and Input Validation for vulnerabilities.' },
        { id: 'agent4', file: 'ls_erorr4.md', task: 'Scan Performance, Memory Leaks, and Rendering bottlenecks.' },
        { id: 'agent5', file: 'ls_erorr5.md', task: 'Scan Data persistence, VFS, and IndexedDB logic.' },
        { id: 'agent6', file: 'ls_erorr6.md', task: 'Scan QA, Edge Cases, and Boundary conditions in critical paths.' },
        { id: 'agent7', file: 'ls_erorr7.md', task: 'Scan DevOps, Vite config, package.json, and Build system issues.' },
        { id: 'agent8', file: 'ls_erorr8.md', task: 'Scan Documentation, Dead Code, and maintainability issues.' }
    ];

    console.log('Starting parallel delegation...');
    
    // Process in batches of 2 to avoid overwhelming the bridge/VFS
    const results: any[] = [];
    for (let i = 0; i < agents.length; i += 2) {
        const batch = agents.slice(i, i + 2);
        console.log(`Processing batch ${i/2 + 1}...`);
        
        const batchPromises = batch.map(async (a) => {
            try {
                console.log(`[${a.id}] Delegation started...`);
                const result = await orchestrator.delegateTask(a.id, 
                    `PROSES DEEP SCAN: ${a.task} \n` +
                    `INSTRUKSI: Cari error, bug, atau inefisiensi nyata di codebase. \n` +
                    `FORMAT LAPORAN: \n` +
                    `# DEEP SCAN REPORT - ${a.id} \n` +
                    `- File: [Path] \n` +
                    `- Baris: [Line Number] \n` +
                    `- Masalah: [Keterangan] \n` +
                    `- Saran: [Perbaikan] \n`
                );
                
                fs.writeFileSync(a.file, result);
                console.log(`[${a.id}] Report written to ${a.file}`);
                return { id: a.id, content: result, fileName: a.file };
            } catch (e) {
                console.error(`[${a.id}] Error: ${e.message}`);
                return { id: a.id, content: 'Error during scan: ' + e.message, fileName: a.file };
            }
        });
        
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
    }

    let summary = '# SWARM AGENT DEEP SCAN SUMMARY\n\n';
    results.forEach(res => {
        summary += `## Findings from ${res.id} (${res.fileName})\n${res.content}\n\n---\n\n`;
    });

    fs.writeFileSync('ls_erorr.md', summary);
    console.log('--- SUMMARY GENERATED: ls_erorr.md ---');
}

deepScan().catch(err => {
    console.error('Fatal Scan Error:', err);
    process.exit(1);
});
