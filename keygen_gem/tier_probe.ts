
import { validateGeminiKey } from './validator';

async function probeTier(apiKey: string) {
    console.log(`\n[PROBE] Investigating Tier for Key: ${apiKey.substring(0, 10)}...`);
    
    // Phase 1: Burst Pressure (20 concurrent requests)
    // Free tier is usually ~15 RPM. If 20 succeed, it's Enterprise or higher.
    const probeCount = 20;
    const requests = Array(probeCount).fill(null).map(() => validateGeminiKey(apiKey));
    
    const results = await Promise.all(requests);
    const successCount = results.filter(r => r.isValid).length;
    const rateLimitedCount = results.filter(r => r.error && r.error.includes('429')).length;
    
    let tier = "UNKNOWN";
    if (successCount >= 18) {
        tier = "HIGH-TIER (Enterprise/Pay-as-you-go)";
    } else if (successCount <= 15 && rateLimitedCount > 0) {
        tier = "FREE-TIER (Google AI Studio)";
    } else if (successCount > 0) {
        tier = `MID-TIER (Success: ${successCount}/20)`;
    } else {
        tier = "DEAD/RESTRICTED";
    }

    console.log(`Results: Success=${successCount}, RateLimited=${rateLimitedCount}`);
    console.log(`Estimated Tier: ${tier}`);
    return { apiKey, tier, successCount };
}

async function runAudit() {
    const keys = [
        "AIzaSyD5E98GsE4fh2-GYg7pQq1ChiIeFVj5QV0",
        "AIzaSyAaYFcjKiyHGizcximoO__UqGfz_reI0_Y",
        "AIzaSyDFuGtad9xHuXRiOhCmbkoPRVXQM30qlP0",
        "AIzaSyDW27ki-wwrNHnb37JtsPmkUZu5178LOSk"
    ];

    for (const key of keys) {
        await probeTier(key);
    }
}

runAudit();
