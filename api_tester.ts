
import { GoogleGenAI } from "@google/genai";

const apiKeys = [
  "AIzaSyD5E98GsE4fh2-GYg7pQq1ChiIeFVj5QV0",
  "AIzaSyAaYFcjKiyHGizcximoO__UqGfz_reI0_Y",
  "AIzaSyDFuGtad9xHuXRiOhCmbkoPRVXQM30qlP0",
  "AIzaSyDW27ki-wwrNHnb37JtsPmkUZu5178LOSk"
];

const models = [
  "gemini-1.5-pro-latest",
  "gemini-3.1-pro-preview"
];

async function testApiKey(key: string, model: string) {
  const ai = new GoogleGenAI({ apiKey: key });
  try {
    const response = await ai.models.generateContent({
      model: model,
      contents: "ping",
    });
    return { success: true, text: response.text };
  } catch (error: any) {
    return { success: false, error: error.message || String(error) };
  }
}

async function runTests() {
  console.log("Starting API Key Security Audit...\n");
  const results: any[] = [];

  for (const key of apiKeys) {
    const keyAbbr = key.substring(0, 8) + "..." + key.substring(key.length - 4);
    for (const model of models) {
      console.log(`Testing Key [${keyAbbr}] on model [${model}]...`);
      const result = await testApiKey(key, model);
      results.push({
        keyAbbr,
        model,
        success: result.success,
        error: result.error
      });
    }
  }

  console.log("\n--- TEST RESULTS ---");
  results.forEach(r => {
    if (r.success) {
      console.log(`✅ [${r.keyAbbr}] + [${r.model}]: SUCCESS`);
    } else {
      console.log(`❌ [${r.keyAbbr}] + [${r.model}]: FAILED (${r.error.split('\n')[0]})`);
    }
  });
}

runTests();
