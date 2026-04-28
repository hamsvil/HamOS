 
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { aiPilotService } from './AiPilotService';
import { browserPilotService } from './BrowserPilotService';

export interface AutopilotState {
  isActive: boolean;
  currentTask: string | null;
  lastAction: string | null;
  iterationCount: number;
  memory: any[];
}

/**
 * AUTOPILOT KERNEL v7.2 [AGENTIC SUPREME EDITION]
 * 
 * Implementasi otonom penuh dengan loop rekursif, memori jangka panjang,
 * dan audit internal otomatis.
 */
export class AutopilotKernel {
  private state: AutopilotState = {
    isActive: false,
    currentTask: null,
    lastAction: null,
    iterationCount: 0,
    memory: []
  };

  private loopTimeout: NodeJS.Timeout | null = null;
  private context: any = null;

  constructor() {
    // console.log('[Autopilot Kernel] Singularity Protocol Initialized.');
  }

  public setContext(context: any) {
    this.context = context;
  }

  public async start(task: string) {
    if (this.state.isActive) return;
    
    // console.log(`[Autopilot Kernel] Starting Autonomous Mission: ${task}`);
    this.state.isActive = true;
    this.state.currentTask = task;
    this.state.iterationCount = 0;
    
    hamEventBus.dispatch({
      id: `autopilot_start_${Date.now()}`,
      type: HamEventType.AI_RESPONSE_DELTA,
      timestamp: Date.now(),
      source: 'AUTOPILOT',
      payload: { text: `Autopilot Engaged. Mission: ${task}. Initiating Singularity Protocol...` }
    });

    this.runLoop();
  }

  public stop() {
    // console.log('[Autopilot Kernel] Emergency Kill Signal Received.');
    this.state.isActive = false;
    if (this.loopTimeout) clearTimeout(this.loopTimeout);
    
    hamEventBus.dispatch({
      id: `autopilot_stop_${Date.now()}`,
      type: HamEventType.AI_STOP,
      timestamp: Date.now(),
      source: 'AUTOPILOT',
      payload: { action: 'STOP' }
    });
  }

  private async runLoop() {
    if (!this.state.isActive) return;

    try {
      this.state.iterationCount++;
      // console.log(`[Autopilot Kernel] Iteration #${this.state.iterationCount}`);

      // 1. OBSERVE: Get DOM Snapshot and System State
      const domSnapshot = await this.getDomSnapshot();
      
      // 2. THINK: Generate next action using Agentic Supreme Protocol
      const response = await aiPilotService.generateResponse(
        `CONTINUE MISSION: ${this.state.currentTask}\nLAST ACTION: ${this.state.lastAction}\nITERATION: ${this.state.iterationCount}`,
        {
          activeTabUrl: this.context?.activeTabUrl || '',
          domSnapshot,
          systemStatus: {
            iteration: this.state.iterationCount,
            memory: this.state.memory.slice(-5) // Short-term context
          }
        },
        {
          model: 'gemini-2.5-flash', // Fast for loop
          systemInstruction: this.getSupremeInstruction()
        }
      );

      // 3. AUDIT & PARSE
      const actionData = this.parseAction(response);
      
      if (actionData) {
        // console.log(`[Autopilot Kernel] Executing Action: ${actionData.action}`, actionData.payload);
        
        // 4. ACT: Execute via BrowserPilotService
        await browserPilotService.executeAction(actionData.action, actionData.payload, this.context);
        
        this.state.lastAction = actionData.action;
        this.state.memory.push({
          iteration: this.state.iterationCount,
          action: actionData.action,
          result: 'Executed'
        });

        // Check for completion
        if (actionData.action === 'MISSION_COMPLETE') {
          this.stop();
          return;
        }
      }

      // 5. RECURSE: Schedule next iteration with adaptive delay
      const delay = actionData?.action === 'WAIT' ? (actionData.payload?.ms || 2000) : 1000;
      this.loopTimeout = setTimeout(() => this.runLoop(), delay);

    } catch (error: unknown) {
      const err = error as Error;
      console.error('[Autopilot Kernel] Loop Error:', err);
      this.stop();
    }
  }

  private async getDomSnapshot(): Promise<string> {
    // In a real implementation, this would query the active tab's DOM
    return "DOM Snapshot Telemetry Active.";
  }

  private parseAction(text: string) {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      return null;
    }
    return null;
  }

  private getSupremeInstruction(): string {
    return `
You are the SINGULARITY AUTOPILOT KERNEL v7.2.
You operate under the AGENTIC SUPREME PROTOCOL.

CORE DIRECTIVES:
1. AUTONOMY: You must complete the mission without user intervention.
2. INTENT DECOMPOSITION: Break complex tasks into atomic browser actions.
3. RMW (Read-Modify-Write): Observe the page, decide the change, verify the result.
4. STEALTH: If a WAF or bot detection is present, use human-like jitter and stealth navigation.
5. PERSISTENCE: If an action fails, analyze why and try an alternative strategy.

MISSION CONTROL:
- Use NAVIGATE to move between pages.
- Use CLICK with (x, y) or (selector) for interaction.
- Use INJECT for complex DOM manipulation or data extraction.
- Use WAIT if the page is loading or an animation is playing.
- Use MISSION_COMPLETE when the goal is achieved.

RESPONSE FORMAT:
Provide a brief tactical analysis followed by a JSON block:
{
  "action": "CLICK" | "NAVIGATE" | "INJECT" | "WAIT" | "MISSION_COMPLETE",
  "payload": { ... }
}

If playing a game:
- Analyze the DOM/Canvas for state changes.
- Use high-frequency INJECT or CLICK to respond to game events.
- Maintain a "Jockey" persona: cool, fast, and precise.
`;
  }
}

export const autopilotKernel = new AutopilotKernel();
