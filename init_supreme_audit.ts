
import { SwarmOrchestrator } from './src/subAgent/SwarmOrchestrator';
import { hamliCoreMemory } from './src/subAgent/SharedMemory';
import fs from 'node:fs';

async function initiateSupremeAudit() {
    console.log("🚀 [SUPREME PROTOCOL] Initiating 24-Agent Global Audit & Cleanup...");
    
    const orchestrator = new SwarmOrchestrator();
    await orchestrator.bootSwarm({}); // Boot with default keys

    const sectors = {
        "agent1": ["src/App.tsx", "src/main.tsx", "src/index.css"],
        "agent2": ["src/subAgent/BaseAgent.ts", "src/subAgent/SharedMemory.ts", "src/subAgent/FileSystemBridge.ts"],
        "agent3": ["firestore.rules", "src/server/routes/gemini.ts"],
        "agent4": ["src/subAgent/SwarmOrchestrator.ts", "src/subAgent/AutonomousManager.ts"],
        "agent5": ["keygen_gem/generator.ts", "keygen_gem/validator.ts", "keygen_gem/server_agent.ts"],
        "agent6": ["AeternaGlass/"],
        "agent7": ["server.ts", "package.json", "tsconfig.json"],
        "agent8": ["README.md", "INDEX.md", "Agenticstep.md", "metadata.json"],
        "agent9": ["src/server/routes/shell.ts", "src/server/terminalSocket.ts"],
        "agent10": ["src/server/routes/tunnel.ts", "src/server/routes/privateSource.ts"],
        "agent11": ["src/server/socket.ts", "worker.ts", "y-utils.js"],
        "agent12": ["src/server/serverProxy.ts"],
        "agent13": ["scripts/"],
        "agent14": ["blueprint/", "blueprint/SAERE_BLUEPRINT_v7_UPGRADED.md", "blueprint/autonomous_ai_blueprint.md"],
        "agent15": ["logs/", "audit_log.txt", "app_status.json"],
        "agent16": ["src/sAgent/coreAgents/AgentRoles.ts"],
        "agent17": ["deep_scan_runner.ts", "fix_all.js", "deep_scan_output.txt"],
        "agent18": ["vite.config.ts", "vite-plugin-hs.ts"],
        "agent19": ["blueprint/blueprint.md", "replit.md", "STRUCTURAL_AUDIT.md", "INDEX.md"],
        "agent20": [".env.example", ".gitignore", ".replitignore", "pnpm-lock.yaml"],
        "agent21": ["src/store/"],
        "agent22": ["src/services/"],
        "agent23": ["src/lib/", "public/"],
        "agent24": ["Global Project Orchestration & Synthesis"]
    };

    const auditInstruction = (agentId) => `
        [AGENTIC SUPREME PROTOCOL: GLOBAL AUDIT MISSION]
        Target Sector: ${JSON.stringify(sectors[agentId] || "Global Analysis")}
        
        TUGAS ANDA:
        1. PELAJARI file/direktori dalam sektor Anda dengan ketelitian mutlak.
        2. IDENTIFIKASI:
           - Syntax Error & Linter Warnings.
           - Cacat Logika (Logic Flaws) & Edge Cases yang tidak di-handle.
           - Missing Error Handling (Try/Catch/Validation).
           - Performance Bottlenecks & Memory Leaks.
           - Ketidakkonsistenan Arsitektur (Improper pattern usage).
        3. EKSEKUSI PEMBERSIHAN:
           - Jika temuan bersifat "Zero-Cost Fix" (formatting, naming, bug minor), PERBAIKI LANGSUNG tanpa ragu.
           - Jika temuan bersifat KRITIS/ARSITEKTURAL, tandai dan simpan di Shared Memory untuk saya (Agent 24).
        4. VERIFIKASI: Pastikan perubahan Anda tidak merusak build (Gunakan lint/compile jika perlu).
        
        Laporkan status akhir sektor Anda ke Shared Memory (Key: AUDIT_REPORT_${agentId}).
        Kerjakan dengan standar ENGINEER TIER-GOD. Jangan biarkan satu celahpun tersisa.
    `;

    // Execute audit for each agent (excluding 24 as 24 is the coordinator)
    const agentIds = Object.keys(sectors).filter(id => id !== "agent24");
    
    const logPath = './logs/audit_status.log';
    fs.writeFileSync(logPath, `[${new Date().toISOString()}] AUDIT_START: Launcher Engaged.\n`);

    const auditResults = hamliCoreMemory.load('AUDIT_RESULTS') || {};

    for (const agentId of agentIds) {
       // Skip if already completed in previous run
       if (auditResults[agentId]?.status === 'SUCCESS') {
           console.log(`[SupremeProtocol] Agent ${agentId} already completed. Skipping.`);
           continue;
       }

       const agentSector = sectors[agentId] || "Global Analysis";
       fs.appendFileSync(logPath, `[${new Date().toISOString()}] ATTEMPTING_${agentId}: Sector ${JSON.stringify(agentSector)}\n`);
       
       try {
           console.log(`[SupremeProtocol] Launching Agent ${agentId} into Sector ${JSON.stringify(agentSector)}...`);
           const res = await orchestrator.delegateTask(agentId, auditInstruction(agentId));
           
           auditResults[agentId] = { status: 'SUCCESS', timestamp: new Date().toISOString() };
           hamliCoreMemory.save('AUDIT_RESULTS', auditResults);
           await hamliCoreMemory.persist();
           
           fs.appendFileSync(logPath, `[${new Date().toISOString()}] COMPLETION_${agentId}: SUCCESS.\n`);
       } catch (err: any) {
           fs.appendFileSync(logPath, `[${new Date().toISOString()}] FAILURE_${agentId}: ${err.message}\n`);
           console.error(`[SupremeProtocol] Agent ${agentId} failed: ${err.message}`);
           
           // If it's a quota issue, we might want to wait longer
           if (err.message.includes('429') || err.message.includes('quota')) {
               console.log(`[SupremeProtocol] CRITICAL QUOTA REACHED. Waiting 60s before retry...`);
               await new Promise(r => setTimeout(r, 60000));
           }
       }
       
       // Standard cooldown between agent launches
       console.log(`[SupremeProtocol] Cooling down for 60s to respect API Quota...`);
       await new Promise(r => setTimeout(r, 60000)); 
    }

    console.log("⏳ [SUPREME PROTOCOL] Finalizing swarm lifecycle...");
    console.log("✅ [SUPREME PROTOCOL] Swarm mission lifecycle completed.");
    fs.appendFileSync(logPath, `[${new Date().toISOString()}] AUDIT_FINISHED: Lifecycle Completed.\n`);
}

initiateSupremeAudit();
