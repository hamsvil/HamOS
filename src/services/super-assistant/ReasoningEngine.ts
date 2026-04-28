/* eslint-disable no-useless-assignment */
import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { ChatMessageData, ProjectData, GenerationStep } from '../../components/HamAiStudio/types';
import { ToolRegistry } from './ToolRegistry';
import { ContextManager } from './ContextManager';
import { geminiKeyManager } from '../geminiKeyManager';
import { contextInjector } from '../ai/contextInjector';
import { NativeStorage } from '../../plugins/NativeStorage';
import { nativeBridge } from '../../utils/nativeBridge';
import { safeStorage } from '../../utils/storage';

export interface ReasoningStep {
  thought: string;
  action?: { type: string, args: Record<string, unknown> };
  observation?: string;
  finalAnswer?: string;
}

export enum ComplexityCategory {
  SIMPLE = 'SIMPLE',
  COMPLEX = 'COMPLEX',
  CONVERSATIONAL = 'CONVERSATIONAL'
}

export class ReasoningEngine {
  private static instance: ReasoningEngine;
  private toolRegistry: ToolRegistry;
  private contextManager: ContextManager;
  private currentComplexity: ComplexityCategory = ComplexityCategory.COMPLEX;

  private constructor() {
    this.toolRegistry = ToolRegistry.getInstance();
    this.contextManager = ContextManager.getInstance();
  }

  public static getInstance(): ReasoningEngine {
    if (!ReasoningEngine.instance) {
      ReasoningEngine.instance = new ReasoningEngine();
    }
    return ReasoningEngine.instance;
  }

  private async triageComplexity(prompt: string): Promise<ComplexityCategory> {
    try {
      // Local Heuristics (Zero-Latency)
      const p = prompt.toLowerCase();
      const isConversational = /^(hi|hello|halo|hey|siapa|apa kabar|thanks|terima kasih|help|bantu|tanya|question)/.test(p) && p.length < 100;
      const isComplex = /(architecture|database|auth|security|refactor|integrasi|backend|fullstack|setup|init|create project|deploy|optimize|refactor|migration)/.test(p) || p.length > 500;

      if (isConversational) return ComplexityCategory.CONVERSATIONAL;
      if (isComplex) return ComplexityCategory.COMPLEX;
      return ComplexityCategory.SIMPLE;
    } catch (e) {
      return ComplexityCategory.COMPLEX; // Default to safe mode
    }
  }

  private async syncToNative(project: ProjectData | null, path: string, content: string) {
      if (!nativeBridge.isAvailable() || !project) return;
      try {
          const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
          const projectName = project.name || 'default';
          const projectRoot = `${dataDir}/projects/${projectName}`;
          const fullPath = `${projectRoot}/${path.startsWith('/') ? path.substring(1) : path}`;
          await NativeStorage.writeFile({ path: fullPath, data: content, encoding: 'utf8' });
      } catch (e) {
          // Sync error
      }
  }

  public async executeReActLoop(
    prompt: string, 
    history: ChatMessageData[], 
    project: ProjectData | null,
    onStep: (step: GenerationStep) => void,
    onProjectUpdate?: (project: ProjectData) => void,
    signal?: AbortSignal
  ): Promise<string> {
    
    this.currentComplexity = await this.triageComplexity(prompt);
    this.toolRegistry.setProjectContext(project as unknown as Record<string, unknown> | null);

    // Use the user-selected mode from safeStorage. If not set, fallback to deep.
    // [ARCHITECT] Forced to 'deep' mode to align with Ham Agentic Shadow as requested by user.
    const mode: 'fast' | 'thinking' | 'deep' = 'deep';

    const optimizedHistory = this.contextManager.getOptimizedContext(history);
    const chatHistory = optimizedHistory.map(m => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }]
    }));

    const enrichedPrompt = prompt;

    try {
      const projectType = project?.dependencies?.['react-native'] || project?.files?.some(f => f.path.endsWith('.java')) ? 'android' : 'web';
      
      // SQR-SVFS V5.0: Surgical Memory (Context Filter)
      const fileList = project?.files ? await contextInjector.getSurgicalContext(prompt, project.files, projectType) : 'No files yet.';

      // [ARCHITECT] Simplified path: Always use HamEngine in 'deep' mode (SAERE v7.2 standard)
      // This ensures stability and consistency with Ham Agentic Shadow.
      const { HamEngine } = await import('../hamEngine/cortex/core');
      const engine = new HamEngine(mode, chatHistory as any);
      const result = await engine.executeTask(enrichedPrompt, onStep, project?.name || 'Untitled Project', projectType, fileList, signal);
      
      if (onProjectUpdate) {
        const updatedProject = await this.toolRegistry.executeTool('get_project_snapshot', {}) as unknown as ProjectData;
        onProjectUpdate(updatedProject);
      }

      return result;
    } catch (e: any) {
      if (signal?.aborted) {
        throw new Error('cancelled', { cause: e });
      }
      
      const err = e as Error;
      const errorMessage = err.message || String(e);
      if (errorMessage.toLowerCase().includes('quota') || errorMessage.toLowerCase().includes('exceeded')) {
          throw new Error(`[QUOTA EXCEEDED]: The AI service is currently unavailable due to quota limits. Please try using your own API key in the settings, or switch to a different AI provider if available.`, { cause: e });
      }
      
      throw new Error(`HamEngine Error: ${errorMessage}`, { cause: e });
    }
  }
}

