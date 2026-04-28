let cachedInstructions: string | null = null;

const fileCache: Record<string, string> = {};

export async function loadAllInstructions(phase?: string): Promise<string> {
  // DISABLED TO SAVE TOKENS: Do not load any instruction files.
  // The user explicitly requested to stop injecting instructions to the AI.
  return "";
}
