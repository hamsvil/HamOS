import { SwarmOrchestrator } from './src/subAgent/SwarmOrchestrator';

async function runTest() {
    console.log("🚀 [TEST SCRIPT] Memulai Uji Coba Respon Sub-Agent...");
    const orchestrator = new SwarmOrchestrator();
    await orchestrator.bootSwarm({}); 

    const targetAgent = "agent2"; // Menggunakan Agent 2 (The Logic Gate) untuk test
    
    const question1 = "[UJI COBA RESPONS 1] Jawab dengan ringkas: Apa nama planet ketiga dari matahari?";
    const question2 = "[UJI COBA RESPONS 2] Jawab dengan ringkas: Berapa hasil perhitungan dari 15 dikali 4?";

    let passCount = 0;

    console.log(`\n======================================`);
    console.log(`>> UJI COBA 1: Mengirim pertanyaan 1 ke ${targetAgent}...`);
    console.log(`>> Prompt: ${question1}`);
    try {
        const res1 = await orchestrator.delegateTask(targetAgent, question1);
        console.log(`[HASIL 1] SUCCESS.\nJawaban Agent: ${res1.trim()}`);
        passCount++;
    } catch (e: any) {
        console.error(`[HASIL 1] FAILED: ${e.message}`);
    }

    // Cooldown 15 detik agar tidak terkena limit rate tier-free 
    console.log(`\n>> Menunggu 15 detik sebelum pertanyaan kedua untuk keamanan Quota API...`);
    await new Promise(r => setTimeout(r, 15000));

    console.log(`\n======================================`);
    console.log(`>> UJI COBA 2: Mengirim pertanyaan 2 ke ${targetAgent}...`);
    console.log(`>> Prompt: ${question2}`);
    try {
        const res2 = await orchestrator.delegateTask(targetAgent, question2);
        console.log(`[HASIL 2] SUCCESS.\nJawaban Agent: ${res2.trim()}`);
        passCount++;
    } catch (e: any) {
        console.error(`[HASIL 2] FAILED: ${e.message}`);
    }

    console.log(`\n======================================`);
    console.log(`>> KESIMPULAN UJI COBA: ${passCount}/2 Berhasil direspons.`);
    if (passCount === 2) {
        console.log(">> STATUS: AMAN DAN LULUS UJI COBA");
    } else {
        console.log(">> STATUS: TERDAPAT KENDALA (TIDAK LULUS)");
    }
}

runTest();
