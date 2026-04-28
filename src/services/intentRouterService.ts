/* eslint-disable no-useless-assignment */
import { ProjectData } from '../components/HamAiStudio/types';
import { geminiKeyManager } from './geminiKeyManager';

export interface IntentClassification {
  type: 'SIMPLE' | 'COMPLEX';
  relevantFiles: string[];
}

export const intentRouterService = {
  async classifyIntent(userMsg: string, projectContext: ProjectData | null): Promise<IntentClassification> {
    if (!projectContext || projectContext.files.length === 0) {
      return { type: 'COMPLEX', relevantFiles: [] };
    }

    const fileTree = projectContext.files.map(f => f.path).join('\n');
    const prompt = `
You are an Intent Router for an AI coding assistant.
Your job is to classify the user's request into either 'SIMPLE' or 'COMPLEX'.
- SIMPLE: The request only requires modifying 1-3 specific files.
- COMPLEX: The request requires understanding the whole project architecture, creating many files, or doing a major refactor.

If SIMPLE, you must also list the exact file paths that are relevant to the request.

User Request: "${userMsg}"

Project File Tree:
${fileTree}
`;

    try {
      const client = geminiKeyManager.getClient();
      const result = await client.models.generateContent({
        model: 'gemini-2.5-flash',
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: 'OBJECT',
            properties: {
              type: {
                type: 'STRING',
                enum: ['SIMPLE', 'COMPLEX'],
                description: "The classification of the user's request."
              },
              relevantFiles: {
                type: 'ARRAY',
                items: {
                  type: 'STRING'
                },
                description: "The exact file paths relevant to the request if SIMPLE."
              }
            },
            required: ['type', 'relevantFiles']
          }
        },
        contents: [{ role: 'user', parts: [{ text: prompt }] }]
      });
      const text = result.text;
      if (text) {
        const parsed = JSON.parse(text);
        if (parsed.type === 'SIMPLE' || parsed.type === 'COMPLEX') {
          return {
            type: parsed.type,
            relevantFiles: Array.isArray(parsed.relevantFiles) ? parsed.relevantFiles : []
          };
        }
      }
    } catch (e) {
      console.warn("Intent routing failed, falling back to COMPLEX", e);
    }

    return { type: 'COMPLEX', relevantFiles: [] };
  }
};
