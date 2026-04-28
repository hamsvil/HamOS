export type CollaboratorRole = 'architect' | 'worker' | 'validator' | 'assembler' | 'tester';

export const OPENROUTER_ROLE_MODELS: Record<CollaboratorRole, string> = {
  architect: 'deepseek/deepseek-r1:free',
  worker: 'google/gemini-2.5-pro',
  validator: 'meta-llama/llama-3.3-70b-instruct:free',
  assembler: 'google/gemini-2.5-pro',
  tester: 'meta-llama/llama-3.3-70b-instruct:free'
};
