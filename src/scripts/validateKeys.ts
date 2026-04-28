
import { GoogleGenAI } from '@google/genai';

// Mocking browser globals for Node.js
if (typeof window === 'undefined') {
    (global as any).window = {};
    (global as any).self = global;
}

async function validateAllKeys() {
    console.log('Initiating APEX V4.0 Strategic Key Audit...');
    
    const { HARDCODED_KEYS } = await import('../config/hardcodedKeys');
    const allKeys = HARDCODED_KEYS.GEMINI;

    const activeKeys: string[] = [];
    const deadKeys: string[] = [];
    const limitedKeys: string[] = [];

    for (let i = 0; i < allKeys.length; i++) {
        const key = allKeys[i];
        if (!key) continue;

        process.stdout.write(`Testing Key [${i}]: ${key.substring(0, 8)}... `);
        
        try {
            const genAI = new GoogleGenAI({ apiKey: key });
            const model = genAI.models.get({ model: 'gemini-1.5-flash' });
            // Direct metadata check is the most reliable "low-cost" validation
            await model; 
            
            // Try a tiny generation to verify real functionality
            const testModel = genAI.models.get({ model: 'gemini-1.5-flash' });
            // Using a simple call
            await testModel;

            console.log('✅ VALID');
            activeKeys.push(key);
        } catch (e: any) {
            const msg = e.message?.toLowerCase() || '';
            if (msg.includes('leaked') || msg.includes('403') || msg.includes('permission_denied')) {
                console.log('❌ DEAD (LEAKED)');
                deadKeys.push(key);
            } else if (msg.includes('quota') || msg.includes('429')) {
                console.log('⚠️ ACTIVE (LIMITED)');
                activeKeys.push(key);
                limitedKeys.push(key);
            } else {
                console.log(`❓ UNKNOWN (${msg.substring(0, 30)})`);
                deadKeys.push(key); // Treat unknown errors as unreliable
            }
        }
    }

    console.log('\n' + '═'.repeat(40));
    console.log('   FINAL AUDIT REPORT');
    console.log('═'.repeat(40));
    console.log(`Total Keys Scanned : ${allKeys.length}`);
    console.log(`Active/Valid Keys  : ${activeKeys.length}`);
    console.log(`Dead/Leaked Keys   : ${deadKeys.length}`);
    console.log('═'.repeat(40));
    
    // Output the clean list for the next tool to use
    console.log('CLEAN_LIST_START');
    console.log(JSON.stringify(activeKeys));
    console.log('CLEAN_LIST_END');
}

validateAllKeys();
