
import { validateGeminiKey } from './keygen_gem/validator';
import fs from 'node:fs';
import path from 'node:path';

async function verify() {
    const filePath = path.resolve(process.cwd(), '.listkey.example');
    if (!fs.existsSync(filePath)) {
        console.error("File .listkey.example not found.");
        return;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    const keys = content
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#') && line.length > 20);

    console.log(`🔍 Checking ${keys.length} keys...`);

    const results = [];
    for (const key of keys) {
        process.stdout.write(`Testing: ${key.slice(0, 10)}... `);
        const result = await validateGeminiKey(key);
        if (result.isValid) {
            console.log("✅ VALID");
            results.push(key);
        } else {
            console.log(`❌ INVALID (${result.error})`);
        }
    }

    console.log(`\n✨ Found ${results.length} valid keys out of ${keys.length}.`);
    
    if (results.length > 0) {
        const report = results.join('\n');
        fs.writeFileSync('./logs/final_verified_keys.log', report);
        console.log("Report saved to /logs/final_verified_keys.log");
    }
}

verify();
