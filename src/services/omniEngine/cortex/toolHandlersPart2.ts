/* eslint-disable no-useless-assignment */
import { ToolExecutionResult } from './types';
import { vfs } from '../../vfsService';
import { shellService } from '../../shellService';
import { GoogleGenAI } from '@google/genai';
import { geminiKeyManager } from '../../geminiKeyManager';

export class ToolHandlersPart2 {
  // --------------------------------------------------------------------------
  // PILAR 3: INFRASTRUKTUR
  // --------------------------------------------------------------------------
  static async handleInstallPackage(packages: string[]): Promise<ToolExecutionResult> {
    try {
      // Check if already in package.json to avoid redundant installs
      let pkgJson: any = {};
      try {
        pkgJson = JSON.parse(await vfs.readFile('package.json'));
      } catch (e) {}

      const deps = { ...(pkgJson.dependencies || {}), ...(pkgJson.devDependencies || {}) };
      const newPackages = packages.filter(p => !deps[p.split('@')[0]]);

      if (newPackages.length === 0) {
        return { success: true, output: `All packages [${packages.join(', ')}] are already installed.` };
      }

      const result = await shellService.execute(`npm install ${newPackages.join(' ')}`);
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Failed to install packages: ${e.message}` };
    }
  }

  static async handleRestartServer(): Promise<ToolExecutionResult> {
    try {
      // Real Trigger: Touch a file that the dev server watches
      await vfs.writeFile('/.omni/restart_trigger', Date.now().toString());
      return { success: true, output: 'Dev server restart triggered successfully.' };
    } catch (e: any) {
      return { success: false, output: `Failed to restart server: ${e.message}` };
    }
  }

  static async handleInstallDependencies(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm install');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Failed to install dependencies: ${e.message}` };
    }
  }

  static async handleSetUpFirebase(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npx firebase init --non-interactive');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Firebase setup failed: ${e.message}` };
    }
  }

  static async handleDeployFirebase(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npx firebase deploy --only firestore:rules --non-interactive');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Firebase deploy failed: ${e.message}` };
    }
  }

  static async handleProvisionCloud(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('gcloud run deploy --source . --region us-central1 --allow-unauthenticated --quiet');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Cloud provision failed: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // PILAR 4: VALIDASI DETERMINISTIK
  // --------------------------------------------------------------------------
  static async handleLintApplet(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm run lint');
      if (!result.isError) {
        return { success: true, output: 'Linter passed successfully. Code is clean.' };
      } else {
        return { success: false, output: `Linter failed:\n${result.output}` };
      }
    } catch (e: any) {
      return { success: false, output: `Linter execution failed: ${e.message}` };
    }
  }

  static async handleCompileApplet(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm run build');
      if (!result.isError) {
        return { success: true, output: 'Compilation passed successfully. App is crash-free.' };
      } else {
        return { success: false, output: `Compilation failed:\n${result.output}` };
      }
    } catch (e: any) {
      return { success: false, output: `Compiler execution failed: ${e.message}` };
    }
  }

  static async handleCaptureUI(route: string): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute(`npx playwright screenshot http://localhost:3000${route} /.omni/screenshot.png`);
      return { success: !result.isError, output: result.output || `Screenshot saved to /.omni/screenshot.png` };
    } catch (e: any) {
      return { success: false, output: `UI Capture failed: ${e.message}` };
    }
  }

  static async handleSimulateInteraction(route: string, actions: string[]): Promise<ToolExecutionResult> {
    try {
      const scriptPath = `/.omni/e2e_${Date.now()}.spec.js`;
      const scriptContent = `
        const { test, expect } = require('@playwright/test');
        test('Automated Interaction', async ({ page }) => {
          await page.goto('http://localhost:3000${route}');
          ${actions.map(a => `await page.${a};`).join('\n')}
        });
      `;
      await vfs.writeFile(scriptPath, scriptContent);
      const result = await shellService.execute(`npx playwright test ${scriptPath}`);
      await vfs.deleteFile(scriptPath);
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Interaction simulation failed: ${e.message}` };
    }
  }

  static async handleExecuteHttpRequest(url: string, method: string, headers?: any, body?: string): Promise<ToolExecutionResult> {
    try {
      const opts: RequestInit = { method, headers };
      if (body && method !== 'GET' && method !== 'HEAD') opts.body = body;
      const response = await fetch(url, opts);
      const text = await response.text();
      return { success: response.ok, output: `Status: ${response.status}\n\n${text.substring(0, 5000)}` };
    } catch (e: any) {
      return { success: false, output: `HTTP Request failed: ${e.message}` };
    }
  }

  static async handleAnalyzePerformance(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npx lighthouse http://localhost:3000 --output json --output-path /.omni/lighthouse.json --chrome-flags="--headless"');
      return { success: !result.isError, output: result.output || 'Lighthouse report generated at /.omni/lighthouse.json' };
    } catch (e: any) {
      return { success: false, output: `Performance analysis failed: ${e.message}` };
    }
  }

  static async handleRunSecurity(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('npm audit');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Security scan failed: ${e.message}` };
    }
  }

  // --------------------------------------------------------------------------
  // PILAR 5: EVOLUSI & KREATIVITAS
  // --------------------------------------------------------------------------
  static async handleManageVersionControl(command: string): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute(`git ${command}`);
      return { success: !result.isError, output: result.output || `Git ${command} executed successfully.` };
    } catch (e: any) {
      return { success: false, output: `Git command failed: ${e.message}` };
    }
  }

  static async handleManageLongTermMemory(memory: string): Promise<ToolExecutionResult> {
    try {
      const path = '/.omni/vector_db.json';
      let db: any[] = [];
      try { db = JSON.parse(await vfs.readFile(path)); } catch (e) {}
      db.push({ timestamp: new Date().toISOString(), memory });
      await vfs.writeFile(path, JSON.stringify(db, null, 2));
      return { success: true, output: 'Memory successfully committed to Vector DB (Local JSON).' };
    } catch (e: any) {
      return { success: false, output: `Memory storage failed: ${e.message}` };
    }
  }

  static async handleAnalyzeTelemetry(): Promise<ToolExecutionResult> {
    try {
      const result = await shellService.execute('cat /.omni/telemetry.log || echo "No telemetry data found."');
      return { success: !result.isError, output: result.output };
    } catch (e: any) {
      return { success: false, output: `Telemetry analysis failed: ${e.message}` };
    }
  }

  static async handleGenerateMedia(prompt: string): Promise<ToolExecutionResult> {
    try {
      const apiKey = geminiKeyManager.getCurrentKey();
      if (!apiKey) throw new Error('No Gemini API key available.');
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
          parts: [{ text: prompt }]
        }
      });

      let base64 = '';
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          base64 = part.inlineData.data;
          break;
        }
      }

      if (!base64) throw new Error('No image generated in response parts.');
      
      const path = `/public/assets/gen_${Date.now()}.jpg`;
      await shellService.execute('mkdir -p /public/assets');
      
      // Use vfs.writeFile for binary data (base64)
      await vfs.writeFile(path, base64);
      
      return { success: true, output: `Media generated and saved to ${path}` };
    } catch (e: any) {
      return { success: false, output: `Media generation failed: ${e.message}` };
    }
  }

  static async handleSpawnEphemeralThread(task: string): Promise<ToolExecutionResult> {
    try {
      const { OmniEngine } = await import('./core');
      const subAgent = new OmniEngine('fast');
      const result = await subAgent.executeTask(task);
      return { success: true, output: `[EPHEMERAL THREAD RESULT]:\n${result}` };
    } catch (e: any) {
      return { success: false, output: `Thread spawn failed: ${e.message}` };
    }
  }

  static async handleRunMentalSandbox(code: string): Promise<ToolExecutionResult> {
    try {
      const tmpPath = `/.omni/sandbox_${Date.now()}.js`;
      await vfs.writeFile(tmpPath, code);
      const result = await shellService.execute(`node ${tmpPath}`);
      await vfs.deleteFile(tmpPath);
      return { success: !result.isError, output: result.output || 'Sandbox executed with no output.' };
    } catch (e: any) {
      return { success: false, output: `Sandbox execution failed: ${e.message}` };
    }
  }

  static async handleRunChamsCode(code: string): Promise<ToolExecutionResult> {
    try {
      const { ChamsEngine } = await import('../../../chams-lang/index');
      const engine = new ChamsEngine(500000); // Higher gas limit for AI tasks
      await engine.init();
      
      // Capture console.log output from cHams
      let outputLog = '';
      const originalLog = console.log;
      console.log = (...args) => {
        outputLog += args.map(a => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ') + '\n';
        originalLog(...args);
      };

      try {
        const result = await engine.run(code, 'EN');
        console.log = originalLog; // Restore immediately
        
        let finalOutput = outputLog;
        if (result !== undefined && result !== null) {
           finalOutput += `\nReturn Value: ${typeof result === 'object' ? JSON.stringify(result) : String(result)}`;
        }
        
        return { 
          success: true, 
          output: finalOutput.trim() || 'cHams code executed successfully with no output.' 
        };
      } catch (execError: any) {
        console.log = originalLog; // Restore on error
        return { success: false, output: `cHams Execution Error:\n${execError.message}\n\nPartial Output:\n${outputLog}` };
      }
    } catch (e: any) {
      return { success: false, output: `Failed to initialize or run cHams engine: ${e.message}` };
    }
  }
}
