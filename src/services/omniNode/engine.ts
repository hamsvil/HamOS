/* eslint-disable no-useless-assignment */
// [STABILITY] Promise chains verified
import { hybridVFS } from '../vfs/hybridVFS';
import { contextPruner } from '../ai/contextPruner';
import { GoogleGenAI } from '@google/genai';

/**
 * HAM ENGINE - The Singularity Core
 * Part of THE HAM ENGINE SINGULARITY Architecture
 */
export class HamNodeEngine {
  private isInitialized = false;

  async initialize() {
    if (this.isInitialized) return;

    // console.log('[Ham Engine] Initializing Singularity Core...');

    try {
      // Use Promise.race to prevent infinite hanging
      await Promise.race([
        (async () => {
          // 1. Initialize HybridVFS (Pillar 3)
          await hybridVFS.initialize();

          // 2. Initialize ContextPruner (Pillar 2)
          await contextPruner.initialize();

          // 3. Register Service Worker (Pillar 1)
          if ('serviceWorker' in navigator) {
            try {
              const swUrl = new URL('/sw.js', window.location.href).href;
              const registration = await navigator.serviceWorker.register(swUrl);
              // console.log('[Ham Engine] Service Worker registered:', registration.scope);
            } catch (e) {
              console.error('[Ham Engine] Service Worker registration failed:', e);
            }
          }
        })(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Singularity Core Initialization Timeout')), 10000))
      ]);
    } catch (e) {
      console.error('[Ham Engine] Initialization error/timeout:', e);
      // We still mark it as initialized so the app can proceed in degraded mode
    }

    this.isInitialized = true;
    // console.log('[Ham Engine] Singularity Core Ready.');

    // 4. Seed initial files if empty
    try {
      await Promise.race([
        this.seedInitialFiles(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Seeding Timeout')), 5000))
      ]);
    } catch (e) {
      console.error('[Ham Engine] Seeding failed or timed out:', e);
    }
  }

  private async seedInitialFiles() {
    const files = hybridVFS.getFiles();
    if (files.length === 0) {
      // console.log('[Ham Engine] Seeding initial files...');
      
      // Seed index.html
      await hybridVFS.writeFile('/index.html', `
<!DOCTYPE html>
<html>
<head>
  <title>Ham Engine App</title>
  <script type="module" src="/src/main.tsx"></script>
</head>
<body>
  <div id="root"></div>
</body>
</html>
      `);

      // Seed Backend Mirage Example
      await hybridVFS.writeFile('/server/api/hello.ts', `
export default async function handler(req) {
  return {
    message: "Hello from THE BACKEND MIRAGE!",
    timestamp: new Date().toISOString(),
    env: "Singularity Core V10"
  };
}
      `);

      // Seed Ham Engine Example
      await hybridVFS.writeFile('/src/Counter.hs', `
@state count = 0
@view
  <div style={{ textAlign: 'center', marginTop: '20px' }}>
    <h2>Ham Engine Reactive Component</h2>
    <p style={{ fontSize: '24px' }}>Count: {count}</p>
    <button 
      onClick={() => setCount(count + 1)}
      style={{ padding: '10px 20px', cursor: 'pointer' }}
    >
      Increment
    </button>
  </div>
      `);

      // Seed src/main.tsx
      await hybridVFS.writeFile('/src/main.tsx', `
import React from 'react';
import { createRoot } from 'react-dom/client';
import Counter from './Counter.hs';

function App() {
  const [data, setData] = React.useState(null);

  React.useEffect(() => {
    fetch('/api/hello')
      .then(res => res.json())
      .then(setData)
      .catch(console.error);
  }, []);

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Ham Engine Singularity</h1>
      <p>Status: 100% Browser-Native</p>
      <pre>{JSON.stringify(data, null, 2)}</pre>
      <hr />
      <Counter />
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
      `);
    }
  }

  /**
   * Executes a task using the Ham Engine architecture.
   * This is the "Singularity Loop" in action.
   */
  async executeTask(prompt: string) {
    // 1. Prune Context (Pillar 2)
    const files = hybridVFS.getFiles();
    let context = '';
    
    for (const file of files) {
      const content = await hybridVFS.readFile(file);
      if (content) {
        const pruned = await contextPruner.prune(content, prompt);
        context += `File: ${file}\nContent:\n${pruned}\n\n`;
      }
    }

    // 2. Call Ham Engine via Cloud Fortress (Pillar 4)
    const systemInstruction = `You are the Ham Engine Singularity AI.
You have access to the following context from the user's virtual file system:
${context}

[SYSTEM REMINDER: Terapkan protokol HAM ENGINE APEX V5.0 (READ STRUKTUR, ANTI-PANGKAS, ANTI-SIMULASI, SELF-HEALING, ANTI-BLANK SCREEN, ADVANCED REASONING, HOLOGRAPHIC MEMORY AWARENESS) secara ketat.]
- SUPREME PROTOCOL v21.0 is active: Infinite background simulation, zero-error tolerance, immediate self-correction.

Your task is to fulfill the user's request. Output your response as a JSON object with the following structure:
{
  "message": "A message to the user explaining what you did",
  "filesToUpdate": [
    { "path": "/path/to/file", "content": "new file content" }
  ]
}
Do not include markdown formatting around the JSON.`;

    // We dynamically import AiWorkerService here to avoid circular dependencies
    // if this file is imported early.
    const { AiWorkerService } = await import('../aiWorkerService');

    const response = await AiWorkerService.generateContent({
      model: 'gemini-2.5-pro',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: {
        systemInstruction,
        responseMimeType: 'application/json'
      },
      fallbackProviders: ['anthropic', 'openai']
    });

    try {
      const result = JSON.parse(response.text || '{}');
      
      // 3. Apply changes to VFS
      if (result.filesToUpdate && Array.isArray(result.filesToUpdate)) {
        for (const file of result.filesToUpdate) {
          await hybridVFS.writeFile(file.path, file.content);
        }
      }

      return result;
    } catch (e) {
      console.error('[Ham Engine] Failed to parse AI response:', e);
      throw new Error('AI returned invalid response format.', { cause: e });
    }
  }
}

export const hamNodeEngine = new HamNodeEngine();
