import { GoogleGenAI } from "@google/genai";

const keys = [
  "AIzaSyCB5rT0XOmM3Uya-RCvv9nH4ejzJKbO4mo",
  "AIzaSyA3oECm3LPMJiGrnOqgP4HOmVc8lIzaRmU",
  "AIzaSyALDZbARVJH6y3NdGA3qF8R79PKRumnnY4",
  "AIzaSyAc7az8XsCm8VJpLl1FJaVW4w6G0r_hkuU"
];

const premiumModels = [
  "gemini-3.1-pro-preview",
  "gemini-2.5-pro",
  "veo-3.0",
  "deep-research-max-preview-04-2026"
];

async function testPremiumModels() {
  console.log("💎 AUDIT MODEL PREMIUM START 💎\n");

  for (const key of keys) {
    console.log(`Testing Key: ${key.substring(0, 10)}...`);
    const ai = new GoogleGenAI({ apiKey: key });
    
    for (const modelName of premiumModels) {
      try {
        // Attempt a light call to verify accessibility
        await ai.models.generateContent({
          model: modelName,
          contents: [{ role: "user", parts: [{ text: "ping" }] }]
        });
        console.log(`  ✅ ${modelName}: ACCESS GRANTED`);
      } catch (e: any) {
        const msg = typeof e === 'object' && e !== null ? JSON.stringify(e) : String(e);
        if (msg.includes("403") || msg.includes("Permission denied")) {
            console.log(`  ❌ ${modelName}: ACCESS DENIED`);
        } else if (msg.includes("404")) {
            console.log(`  ⚠️ ${modelName}: NOT FOUND`);
        } else if (msg.includes("400")) {
            console.log(`  ℹ️ ${modelName}: SUPPORTED (API Error: ${e.message})`);
        } else {
            console.log(`  ℹ️ ${modelName}: PROBABLY ACCESS (Error: ${e.message?.substring(0, 30)})`);
        }
      }
    }
  }
}

testPremiumModels();
