import { validateGeminiKey } from './validator';

async function checkSpecialCapabilities(apiKey: string) {
    console.log(`\n[VEO-AUDIT] Inspecting Capabilities for Key: ${apiKey.substring(0, 10)}...`);
    
    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();
        
        if (!data.models) {
            console.log("Status: Access Restricted or Invalid Key.");
            return;
        }

        const modelNames = data.models.map((m: any) => m.name);
        const hasPro = modelNames.some((n: string) => n.includes('gemini-1.5-pro'));
        const hasImagen = modelNames.some((n: string) => n.includes('imagen') || n.includes('image'));
        const hasVeo = modelNames.some((n: string) => n.includes('veo') || n.includes('video'));

        console.log(`Detected Models: ${modelNames.length}`);
        console.log(`- Gemini 1.5 Pro: ${hasPro ? "✅ YES" : "❌ NO"}`);
        console.log(`- Imagen (Image Gen): ${hasImagen ? "✅ YES" : "❌ NO"}`);
        console.log(`- Veo (Video Gen): ${hasVeo ? "✅ YES" : "❌ NO"}`);

        if (hasVeo || (hasPro && modelNames.length > 20)) {
            console.log(">>> TIER STATUS: PREMIUM/ENTERPRISE DETECTED <<<");
        } else {
            console.log(">>> TIER STATUS: STANDARD/STUDIO <<<");
        }
    } catch (e) {
        console.log(`Error auditing key: ${e instanceof Error ? e.message : String(e)}`);
    }
}

async function runAudit() {
    const keys = [
        "AIzaSyD5E98GsE4fh2-GYg7pQq1ChiIeFVj5QV0",
        "AIzaSyAaYFcjKiyHGizcximoO__UqGfz_reI0_Y",
        "AIzaSyDFuGtad9xHuXRiOhCmbkoPRVXQM30qlP0",
        "AIzaSyDW27ki-wwrNHnb37JtsPmkUZu5178LOSk"
    ];

    for (const key of keys) {
        await checkSpecialCapabilities(key);
    }
}

runAudit();
