import { GeminiGeneratorAgent } from "./agent";

/**
 * [SINGULARITY ENTRY POINT]
 * Bootstrapping the Gemini KeyGen Agent.
 */
const agent = new GeminiGeneratorAgent();

// Auto-start for 24/7 simulation if imported
export const startGenerator = () => agent.start24hProcess();
export const stopGenerator = () => agent.stop();

export default agent;
