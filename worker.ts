import { generateGeminiKey } from "./generator";
import { validateGeminiKey } from "./validator";

/**
 * [SINGULARITY WORKER]
 * Dedicated Web Worker for autonomous API Key Generation & Validation.
 * Runs in a separate thread to maximize throughput without blocking UI.
 */

self.onmessage = async (e) => {
  if (e.data.cmd === "start") {
    console.log(`[GeminiWorker] Engine ${e.data.id} Engaged.`);
    runLoop();
  }
};

async function runLoop() {
  while (true) {
    try {
      const candidateKey = generateGeminiKey("alphanumeric", 39);
      const validation = await validateGeminiKey(candidateKey);

      if (validation.isValid) {
        // Report success back to the main controller
        (self as any).postMessage({
          type: "success",
          key: candidateKey,
          modelCount: validation.modelCount
        });
      }
      
      // Minimal sleep to allow the worker thread to breathe
      await new Promise(resolve => setTimeout(resolve, 5));
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
