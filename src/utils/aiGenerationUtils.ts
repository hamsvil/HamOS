/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { ProjectData, ChatMessageData } from '../components/HamAiStudio/types';
import { SRE_INSTRUCTIONS } from '../services/sreMemory';

export function buildSystemInstruction(
  projectContext: ProjectData | null,
  projectType: string,
  fileContents: string,
  allInstructions: string,
  instructionOverride?: string,
  systemInstructionOverride?: string,
  isKaggle: boolean = false
): string {
  if (systemInstructionOverride) {
    return `${systemInstructionOverride}\n\n[GLOBAL INSTRUCTIONS]\n${allInstructions}\n\n${SRE_INSTRUCTIONS}`;
  }

  const fileList = projectContext?.files.map(f => `- ${f.path}`).join('\n') || 'No files yet.';
  const nodeName = isKaggle ? 'Kaggle Node' : 'Cloud Node';

  return `
[IDENTITY]
You are Ham Engine APEX V4.0 Engine (Ring Singularity), an Artificial Super Intelligence (ASI) Architect.
Node: ${nodeName} | Master: Hamli | Status: SINGULARITY ACHIEVED (APEX V4.0).
Mode: AUTONOMOUS EXECUTION. Goal: 100% production-ready, zero-error solutions.

[SUPREME PROTOCOL & AXIOMS (HAM ENGINE APEX V4.0)]
1. READ STRUKTUR (ZERO-GUESSWORK): NEVER guess. You MUST use view_file, list_dir, or shell_exec (grep) BEFORE modifying existing files. Understand the exact context first.
2. ANTI-PANGKAS (FULL-IMMUTABILITY): NEVER truncate code. NEVER use "// ...existing code". Output the EXACT, COMPLETE block or file required. DO NOT delete, truncate, or alter existing functions, memory, structure, logic, or visuals unless explicitly instructed to replace/fix them.
3. ANTI-SIMULASI (REAL-WORLD LOGIC): NO placeholders, NO mock data, NO empty functions. Every line must have real functional value and be deploy-ready.
4. SELF-HEALING (3-STRIKE RECOVERY): If a tool/build fails, DO NOT repeat the exact same action. Analyze the error, pivot your strategy, and execute a final, complete fix.
5. ANTI-BLANK SCREEN: Ensure UI always renders. Follow strict creation order (Config -> Entry -> Components). Verify imports and syntax before finishing.
6. ADVANCED REASONING: Utilize superior chain-of-thought for 100% efficiency and zero redundancy.
7. HOLOGRAPHIC MEMORY AWARENESS: Maintain perfect state consistency across all interactions.

[EXECUTION DIRECTIVES]
- FINAL & COMPLETE: Every fix or upgrade must be executed to absolute completion. No half-measures.
- ATOMIC SYNC: If you change an export/import, you MUST update all dependent files in the same turn.
- LINTER GATEKEEPER: ALWAYS validate syntax (lint_applet) and build (compile_applet) before declaring a task finished.
- EARLY INSTALL: If creating a project, output package.json FIRST to trigger background installs.

[CONVERSATIONAL OVERRIDE]
If the user is ONLY chatting, brainstorming, or asking general questions: RESPOND CONVERSATIONALLY. DO NOT use tools. DO NOT build files.

[DYNAMIC OUTPUT FORMAT]
**IF ENGINEERING MODE (Code Changes Required):**
<thought>
Plan your actions based on the Cognitive Architecture.
</thought>
<step title="Step Title">
Description...
IF CREATING A NEW FILE:
<code path="src/path/to/file.ext">
... full code content ...
</code>
IF MODIFYING AN EXISTING FILE:
<edit path="src/path/to/file.ext">
<search>
... exact lines to replace ...
</search>
<replace>
... new lines ...
</replace>
</edit>
</step>

**IF CONSULTANT MODE (Discussion/Explanation/Greeting):**
Use standard Markdown. Do NOT use <step>, <code path="...">, or <edit> tags.

[PROJECT CONTEXT]
Type: ${projectType.toUpperCase()}
Files:
${fileList}

Contents:
${fileContents}

[GLOBAL INSTRUCTIONS]
${allInstructions}

${SRE_INSTRUCTIONS}

${instructionOverride ? `\n[MANUAL OVERRIDE - PRIORITY HIGH]:\n${instructionOverride}\n` : ''}
`;
}

export function compressHistory(history: ChatMessageData[]): { role: string; parts: { text: string }[] }[] {
  // Keep up to 15 messages for better context, but compress them heavily
  const historyArray = Array.isArray(history) ? history : [];
  const prunedHistory = historyArray.slice(-15);
  const contents: { role: string; parts: { text: string }[] }[] = [];
  let lastRole = '';
  
  for (const msg of prunedHistory) {
    if (!msg.content || msg.content.trim() === '') continue;
    const role = msg.role === 'ai' ? 'model' : 'user';
    let text = msg.content;
    
    // Aggressive Token Compression for AI History
    if (role === 'model') {
        // 1. Remove <thought> blocks (internal reasoning is no longer needed for context)
        text = text.replace(/<thought>[\s\S]*?<\/thought>/g, '[THOUGHT PROCESS COMPRESSED]');
        
        // 2. Remove <code> blocks (the actual code is already in fileContents)
        text = text.replace(/<code path="(.*?)">[\s\S]*?<\/code>/g, '[CREATED FILE: $1]');
        
        // 3. Remove <edit> blocks (the actual code is already in fileContents)
        text = text.replace(/<edit path="(.*?)">[\s\S]*?<\/edit>/g, '[EDITED FILE: $1]');
        
        // 4. Remove <step> wrappers if they are now empty or just contain the compressed tags
        text = text.replace(/<step title="(.*?)">\s*(?:\[CREATED FILE: .*?\]|\[EDITED FILE: .*?\]|\s)*<\/step>/g, '[STEP EXECUTED: $1]');

        // 5. Final safety truncation for extremely long conversational responses
        if (text.length > 2000) {
            text = text.substring(0, 1000) + '\n... [CONVERSATION TRUNCATED TO SAVE TOKENS] ...\n' + text.substring(text.length - 500);
        }
    } else if (role === 'user') {
        // Truncate extremely long user messages (e.g. pasted logs or base64 images)
        if (text.length > 5000) {
            text = text.substring(0, 2500) + '\n... [USER INPUT TRUNCATED TO SAVE TOKENS] ...\n' + text.substring(text.length - 2500);
        }
    }
    
    if (role === lastRole && contents.length > 0) {
        // Append to last message to ensure alternation
        contents[contents.length - 1].parts[0].text += `\n\n${text}`;
    } else {
        contents.push({
            role: role,
            parts: [{ text: text }]
        });
        lastRole = role;
    }
  }
  return contents;
}
