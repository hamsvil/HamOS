
// [SUPREME DIAGNOSTIC] Ultra-Clean Agent Tester
// Bypassing browser dependencies to focus on AI Response & Rolling Keys.

async function runUltraCleanTest() {
    console.log('Starting Supreme Diagnostic (Zero-Dependency Mode)...');

    // Mocking browser globals
    if (typeof window === 'undefined') {
        (global as any).window = {};
        (global as any).indexedDB = {};
    }

    try {
        const { AGENT_ROLES } = await import('../sAgent/coreAgents/AgentRoles');
        const { BaseAgent } = await import('../sAgent/coreAgents/BaseAgent');
        const { getValidGeminiKeys } = await import('../config/hardcodedKeys');

        const keys = getValidGeminiKeys();
        console.log(`Detected Energy Sources: ${keys.length} API Keys Validated.`);

        const results: any[] = [];

        for (const role of AGENT_ROLES) {
            console.log(`\n[Testing Agent: ${role.id} - ${role.name}]...`);
            try {
                const agent = new BaseAgent({
                    id: role.id,
                    name: role.name,
                    role: role.role,
                    systemInstruction: role.systemInstruction,
                    apiKeys: keys
                });

                const start = Date.now();
                const response = await agent.executeTask('Identify yourself and state your primary mission in 1 sentence.');
                const duration = ((Date.now() - start) / 1000).toFixed(2);

                console.log(`SUCCESS: Received response in ${duration}s.`);
                results.push({ id: role.id, name: role.name, status: 'ONLINE', latency: `${duration}s`, response });
            } catch (e: any) {
                console.error(`FAILED: ${role.id} - ${e.message}`);
                results.push({ id: role.id, name: role.name, status: 'OFFLINE', error: e.message });
            }
        }

        console.log('\n' + '═'.repeat(60));
        console.log('   FINAL AGENT RESPONSE REPORT');
        console.log('═'.repeat(60));
        console.table(results.map(r => ({
            Agent: r.name,
            Status: r.status,
            Latency: r.latency || 'N/A',
            Response: r.response ? (r.response.substring(0, 50) + '...') : r.error
        })));

    } catch (fatal: any) {
        console.error('FATAL SYSTEM ERROR:', fatal.message);
    }
}

runUltraCleanTest();
