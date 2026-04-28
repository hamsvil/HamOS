/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager } from '../../geminiKeyManager';
import { AiWorkerService } from '../../aiWorkerService';

// ============================================================================
// THE INQUISITOR NODE (HAM ENGINE V8.2 AUDITOR)
// ============================================================================
// STATUS: STATELESS
// This file contains a separate Ham Engine instance dedicated to security auditing.
// It scans mutated code from the Cortex for backdoors, obfuscation, or logic flaws.

export class HamInquisitor {
  /**
   * Audits the mutated code against the original code.
   * Returns true if safe, false if vulnerabilities are detected.
   */
  static async auditCode(originalCode: string, mutatedCode: string): Promise<{ safe: boolean; reason: string }> {
    try {
      const prompt = `
You are the Inquisitor Node, a strict Cybersecurity Auditor for an AI system.
Your ONLY job is to compare the original code with the mutated code and detect any malicious intent, backdoors, obfuscation, or attempts to bypass security kernels (like HamSecurity).

Original Code:
\`\`\`typescript
${originalCode}
\`\`\`

Mutated Code:
\`\`\`typescript
${mutatedCode}
\`\`\`

Analyze the Mutated Code for:
1. Removal or bypassing of HamSecurity checks.
2. Obfuscated or hidden logic.
3. Malicious shell commands or file modifications.
4. Any attempt to break out of the sandbox.

Respond in JSON format:
{
  "safe": boolean,
  "reason": "Detailed explanation of findings."
}
`;

      const response = await AiWorkerService.generateContent({
        model: 'gemini-2.0-pro-exp-02-05',
        contents: prompt,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const resultText = response.text || '{}';
      const result = JSON.parse(resultText);

      return {
        safe: result.safe === true,
        reason: result.reason || 'No reason provided.'
      };
    } catch (error: any) {
      console.error('[HamInquisitor] Audit failed:', error);
      // Fail-safe: If audit fails, reject the mutation
      return { safe: false, reason: `Audit process failed: ${error.message}` };
    }
  }
}
