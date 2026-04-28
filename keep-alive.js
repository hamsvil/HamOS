// ==============================================================================
// THE OUROBOROS PROTOCOL: EXTERNAL DEFIBRILLATOR (NODE.JS VERSION)
// ==============================================================================
// Run this script on any computer with Node.js installed: `node keep-alive.js`
// It will ping your AI Studio server every 4 minutes to keep SAERE alive 24/7.

const TARGET_URL = "https://ais-dev-5xogkxtdovdaqskfdjmhqf-41062462252.asia-east1.run.app/api/system/heartbeat";
const INTERVAL_MS = 4 * 60 * 1000; // 4 minutes

console.log("[Ouroboros] Starting External Defibrillator (Node.js)...");
console.log(`[Ouroboros] Target: ${TARGET_URL}`);
console.log("[Ouroboros] Interval: Every 4 minutes");
console.log("--------------------------------------------------");

async function pingServer() {
    const timestamp = new Date().toISOString();
    try {
        const response = await fetch(TARGET_URL);
        if (response.ok) {
            console.log(`[${timestamp}] SUCCESS: SAERE is Alive and Thinking. (Status: ${response.status})`);
        } else {
            console.log(`[${timestamp}] WARNING: Server returned status ${response.status}. SAERE might be sleeping.`);
        }
    } catch (error) {
        console.error(`[${timestamp}] ERROR: Failed to reach server. ${error.message}`);
    }
}

// Initial ping
pingServer();

// Schedule recurring pings
setInterval(pingServer, INTERVAL_MS);
