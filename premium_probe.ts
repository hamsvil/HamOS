
import { fetch } from "undici"; // Node.js fetch polyfill if needed, but modern Node has it

const apiKeys = [
  "AIzaSyCc1JzfMMbaLaW6iofoRAjOCs-TOr722Xk",
  "AIzaSyC_GtMRdx-SNeljqjHvLSDmwAe3Cnde944",
  "AIzaSyATEOpDthvIVTe9Qmibj-SUaldX4bAR_fg"
];

async function listAllModels(key: string) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
  try {
    const response = await (global as any).fetch(url);
    const data = await response.json();
    if (data.error) throw new Error(data.error.message);
    const modelNames = data.models?.map((m: any) => m.name.replace("models/", "")) || [];
    return { success: true, models: modelNames };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function runAudit() {
  console.log("🕵️ Premium Tier Access Probe (REST Mode)...\n");
  
  for (const key of apiKeys) {
    const keyAbbr = key.substring(0, 10) + "...";
    console.log(`Checking Inventory for key: ${keyAbbr}`);
    const result = await listAllModels(key);
    
    if (result.success) {
      console.log(`✅ Access Granted. Found ${result.models?.length} models.`);
      const premiumModels = result.models?.filter((m: string) => 
        m.includes("pro") || m.includes("veo") || m.includes("research") || m.includes("agentic") || m.includes("deep")
      );
      if (premiumModels && premiumModels.length > 0) {
        console.log("💎 Premium Models Available:");
        premiumModels.forEach((m: string) => console.log(`   - ${m}`));
      } else {
        console.log("⚠️ No Premium-specific models found in listing.");
      }
    } else {
      console.log(`❌ Failed: ${result.error?.split('\n')[0]}`);
    }
    console.log("-----------------------------------\n");
  }
}

runAudit();
