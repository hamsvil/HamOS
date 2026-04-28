import { SovereignMind } from './Mind';
import { SovereignKernel } from './Kernel';
import { SovereignDeep } from './Deep';
import { IntentClassifier } from './IntentClassifier';
import { ContextWeaver } from './ContextWeaver';
import { eventBus } from '../nervous/EventBus';
import { memory } from '../memory/Memory';
import { telemetry } from './Telemetry';
import { SovereignResponse, SovereignPlan } from './types';

export class Sovereign {
  private static instance: Sovereign;
  
  private mind = new SovereignMind();
  private kernel = new SovereignKernel();
  private deep = new SovereignDeep();
  private classifier = new IntentClassifier();
  private weaver = new ContextWeaver();

  private constructor() {
    this.init();
  }

  private async init() {
    await memory.init();
    telemetry.getRecentLogs(1); // Ensure telemetry instance exists
    console.log('🏛️  [SOVEREIGN] Omni-Entity is fully synchronized.');
  }

  public static getInstance(): Sovereign {
    if (!Sovereign.instance) {
      Sovereign.instance = new Sovereign();
    }
    return Sovereign.instance;
  }

  public async execute(prompt: string): Promise<string> {
    const startTime = Date.now();
    console.log(`\n🌊 [SOVEREIGN] Receiving Intent: "${prompt.slice(0, 50)}..."`);
    
    await eventBus.emit('intent.received', { prompt, timestamp: startTime });

    // 1. Classify & Route
    const { intent, route } = await this.classifier.classify(prompt);
    await eventBus.emit('route.decided', { intent, route });

    // 2. Weave Context
    const enrichedPrompt = await this.weaver.weave(prompt);

    // 3. Brain Selection & Execution
    let result = '';
    const plan: SovereignPlan = {
      originalPrompt: prompt,
      intent,
      route,
      requiresDeepResearch: route.tier === 'deep',
      tasks: [], // To be populated by Mind if complex
      context: {}
    };

    if (route.tier === 'deep') {
      result = await this.deep.research(plan);
    } else if (route.tier === 'pro') {
      // Pro usually creates a plan then runs it
      const fullPlan = await this.mind.think(enrichedPrompt);
      result = await this.kernel.run(fullPlan);
    } else {
      // Flash directly executes
      result = await this.kernel.callAI(enrichedPrompt);
    }

    const duration = Date.now() - startTime;
    
    // Record to Calibration Ledger
    await memory.calibration.record({
      intentHash: intent.id,
      tier: route.tier,
      persona: route.persona,
      decision: route.reasoning,
      confidence: 1.0,
      tokensUsed: enrichedPrompt.length / 4, // Rough estimate
      latencyMs: duration,
      outcome: 'success'
    });

    return result;
  }
}

export const sovereign = Sovereign.getInstance();
