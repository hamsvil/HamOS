 
// [UI LAYER] Direct DOM manipulation acknowledged and isolated.
import { hamEventBus } from '../../../ham-synapse/core/event_bus';
import { HamEventType } from '../../../ham-synapse/core/types';
import { nativeBridge } from '../../../utils/nativeBridge';
import { LisaBaseAgent } from '../../../sAgent/coreAgents/LisaBaseAgent';
import { neuralPilotRuleset } from '../../../services/featureRules/rules/neuralPilot';
import { agentPersonaRegistry } from '../../../sAgent/AgentPersonaRegistry';
import { logger as pinoLogger } from '../../../server/logger';

const browserLogger = pinoLogger.child({ feature: 'browser-pilot' });

export interface BrowserPilotContext {
  activeTabId: string;
  navigateTab: (id: string, url: string) => void;
  addTab: (url: string) => void;
  closeTab: (id: string) => void;
  reloadTab: (id: string) => void;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  searchUrl: string;
  getIframe: (id: string) => HTMLIFrameElement | null;
}

// Cache for dynamic imports to avoid overhead
let chamsEngineCache: any = null;
let shellServiceCache: any = null;
let deviceMonitorServiceCache: any = null;

export class BrowserPilotService {
  private agent: LisaBaseAgent | null = null;

  private async ensureAgent() {
    if (!this.agent) {
      const persona = agentPersonaRegistry.getPersona('browser-pilot');
      const keys = (window as any).GEMINI_API_KEY ? [(window as any).GEMINI_API_KEY] : [];
      
      this.agent = new LisaBaseAgent({
        id: 'browser-pilot-agent',
        featureId: 'browser-pilot',
        name: persona?.name || 'The Navigator',
        role: persona?.role || 'Web Exploration Pilot',
        systemInstruction: persona?.personality || neuralPilotRuleset.systemPromptOverlay,
        apiKeys: keys,
        featureRules: neuralPilotRuleset,
        logFile: 'logs/agent_browser.log'
      });
    }
  }

  public async screenshot(url: string): Promise<string> {
    try {
      const response = await fetch('/api/browser/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      const data = await response.json();
      return data.screenshotPath;
    } catch (error) {
      browserLogger.error({ err: error, url }, 'Screenshot failed');
      throw error;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number, errorMessage: string): Promise<T> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(errorMessage));
      }, timeoutMs);

      promise.then((value) => {
        clearTimeout(timer);
        resolve(value);
      }).catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
    });
  }

  public async extractContent(html: string): Promise<string> {
    try {
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');
      
      // Remove scripts, styles, etc.
      const scripts = doc.querySelectorAll('script, style, iframe, noscript');
      scripts.forEach(s => s.remove());
      
      // Extract main text content
      return doc.body.innerText.replace(/\s+/g, ' ').trim();
    } catch (error) {
      browserLogger.error({ err: error }, 'Content extraction failed');
      return html.substring(0, 1000); // Fallback to raw substring
    }
  }

  async executeAction(action: string, payload: any, context: BrowserPilotContext) {
    try {
      await this.ensureAgent();
      if (this.agent) {
        // Error handling with retry (backoff handled by LisaBaseAgent.withRetry)
        await this.agent.withRetry(async () => {
          return await this.agent!.executeWithAudit(`Action: ${action} | Payload: ${JSON.stringify(payload)}`, { action, payload });
        }, 'gemini-3-flash-preview');
      }
      
      // HUMAN-LIKE INTERACTION: Random Jitter & Delay
      const baseDelay = 150;
      const jitter = Math.floor(Math.random() * 300);
      await new Promise(resolve => setTimeout(resolve, baseDelay + jitter));

      switch (action) {
        case 'NAVIGATE':
          if (payload.url) {
            browserLogger.info({ url: payload.url }, 'Navigating to URL');
            context.navigateTab(context.activeTabId, payload.url);
            context.showToast(`AI Navigating to: ${payload.url}`, 'info');
            
            // Post-navigation enhancement: Capture and extract
            setTimeout(async () => {
              try {
                await this.screenshot(payload.url);
                await this.executeAction('GET_DOM_SNAPSHOT', {}, context);
              } catch (e) {
                browserLogger.warn({ err: e }, 'Post-nav capture failed');
              }
            }, 2000);
          }
          break;
        case 'NEW_TAB':
          context.addTab(payload.url || context.searchUrl);
          context.showToast('AI Opened new tab', 'info');
          break;
        case 'CLOSE_TAB':
          context.closeTab(payload.id || context.activeTabId);
          break;
        case 'RELOAD':
          context.reloadTab(payload.id || context.activeTabId);
          break;
        case 'INTERACT':
          {
            const iframe = context.getIframe(context.activeTabId);
            if (iframe && iframe.contentWindow) {
              iframe.contentWindow.postMessage({ type: 'PILOT_INTERACT', payload }, '*');
            }
            window.postMessage({ type: 'PILOT_INTERACT', payload }, '*');
          }
          break;
        case 'CAPTURE':
          if (nativeBridge.isAvailable()) {
            try {
              const base64 = await this.withTimeout(
                nativeBridge.callAsync('Android', 'captureBrowser'),
                5000,
                'Native capture timed out'
              );
              if (base64) {
                hamEventBus.dispatch({
                  id: `capture_res_${Date.now()}`,
                  type: HamEventType.BROWSER_STATE,
                  timestamp: Date.now(),
                  source: 'BROWSER',
                  payload: { action: 'CAPTURE_RESULT', base64 }
                });
              }
            } catch (err) {
              console.error('[Browser Pilot] Capture failed:', err);
              // Fallback for older native implementations that expect a global callback
              if (window.Android && window.Android.captureBrowser) {
                const callbackId = `capture_${Date.now()}`;
                const timeoutId = setTimeout(() => {
                  delete window.onBrowserCapture;
                  console.error('[Browser Pilot] Fallback capture timed out');
                }, 5000);

                window.onBrowserCapture = (id: string, base64: string) => {
                  if (id === callbackId) {
                    clearTimeout(timeoutId);
                    hamEventBus.dispatch({
                      id: `capture_res_${Date.now()}`,
                      type: HamEventType.BROWSER_STATE,
                      timestamp: Date.now(),
                      source: 'BROWSER',
                      payload: { action: 'CAPTURE_RESULT', base64 }
                    });
                    delete window.onBrowserCapture;
                  }
                };
                window.Android.captureBrowser(callbackId);
              }
            }
          }
          break;
        case 'INJECT':
          if (nativeBridge.isAvailable() && payload.script) {
            try {
              // PROTOKOL: Anti-XSS (Sandbox Injected Script)
              // Wrap script in an IIFE and hide native bridge to prevent privilege escalation
              // Bypass sandbox if Master Override is active
              const safeScript = payload.isMasterOverride ? payload.script : `
                (function() {
                  const Android = undefined;
                  const nativeBridge = undefined;
                  try {
                    ${payload.script}
                  } catch (e) {
                    return 'Error: ' + e.message;
                  }
                })();
              `;
              const result = await this.withTimeout(
                nativeBridge.callAsync('Android', 'injectBrowserScript', safeScript),
                5000,
                'Native inject timed out'
              );
              if (result) {
                hamEventBus.dispatch({
                  id: `inject_res_${Date.now()}`,
                  type: HamEventType.BROWSER_STATE,
                  timestamp: Date.now(),
                  source: 'BROWSER',
                  payload: { action: 'INJECT_RESULT', result }
                });
              }
            } catch (err) {
              console.error('[Browser Pilot] Inject failed:', err);
              // Fallback
              if (window.Android && window.Android.injectBrowserScript) {
                const callbackId = `inject_${Date.now()}`;
                const timeoutId = setTimeout(() => {
                  delete window.onBrowserScriptResult;
                  console.error('[Browser Pilot] Fallback inject timed out');
                }, 5000);

                window.onBrowserScriptResult = (id: string, result: string) => {
                  if (id === callbackId) {
                    clearTimeout(timeoutId);
                    hamEventBus.dispatch({
                      id: `inject_res_${Date.now()}`,
                      type: HamEventType.BROWSER_STATE,
                      timestamp: Date.now(),
                      source: 'BROWSER',
                      payload: { action: 'INJECT_RESULT', result }
                    });
                    delete window.onBrowserScriptResult;
                  }
                };
                
                const safeScript = payload.isMasterOverride ? payload.script : `
                  (function() {
                    const Android = undefined;
                    try { ${payload.script} } catch (e) { return 'Error: ' + e.message; }
                  })();
                `;
                window.Android.injectBrowserScript(safeScript, callbackId);
              }
            }
          } else if (payload.script) {
            // Web Fallback
            const iframe = context.getIframe(context.activeTabId);
            if (iframe && iframe.contentWindow) {
              const safeScript = payload.isMasterOverride ? payload.script : `
                (function() {
                  const Android = undefined;
                  try { ${payload.script} } catch (e) { return 'Error: ' + e.message; }
                })();
              `;
              iframe.contentWindow.postMessage({ type: 'INJECT_SCRIPT', script: safeScript }, '*');
            }
          }
          break;
        case 'CLICK':
          if (nativeBridge.isAvailable() && payload.x !== undefined && payload.y !== undefined) {
            try {
              await this.withTimeout(
                nativeBridge.callAsync('Android', 'nativeClick', payload.x, payload.y),
                2000,
                'Native click timed out'
              );
              context.showToast(`AI Clicking at: ${payload.x}, ${payload.y}`, 'info');
            } catch (err) {
              if (window.Android && window.Android.nativeClick) {
                window.Android.nativeClick(payload.x, payload.y);
                context.showToast(`AI Clicking at: ${payload.x}, ${payload.y}`, 'info');
              }
            }
          } else if (payload.x !== undefined && payload.y !== undefined) {
            // Web Fallback (Simulated Click)
            const iframe = context.getIframe(context.activeTabId);
            if (iframe && iframe.contentWindow) {
              // SMART SELECTOR: Try selector first, then point
              const script = payload.selector 
                ? `(function() {
                    const el = window['document'].querySelector('${payload.selector}') || window['document'].elementFromPoint(${payload.x}, ${payload.y});
                    if (el) {
                      el.click();
                      return true;
                    }
                    return false;
                  })()`
                : `window['document'].elementFromPoint(${payload.x}, ${payload.y})?.click()`;

              iframe.contentWindow.postMessage({ 
                type: 'INJECT_SCRIPT', 
                script
              }, '*');
            }
            context.showToast(`AI Simulated Click at: ${payload.x}, ${payload.y}`, 'info');
          }

          // ACTION VERIFICATION: Request snapshot after click to verify state change
          setTimeout(() => {
            this.executeAction('GET_DOM_SNAPSHOT', {}, context);
          }, 1000);
          break;
        case 'SHELL_EXEC':
          if (payload.command) {
            // PROTOKOL: Anti-RCE (Remote Code Execution)
            // Block dangerous shell commands from autonomous browser pilot
            // Bypass blocklist if Master Override is active
            if (!payload.isMasterOverride) {
              const dangerousCommands = ['rm', 'mkfs', 'dd', 'wget', 'curl', 'chmod', 'chown', 'nc', 'bash', 'sh', 'zsh', 'python', 'node', 'eval'];
              const cmdLower = payload.command.toLowerCase();
              
              if (dangerousCommands.some(cmd => cmdLower.includes(cmd))) {
                console.error(`[CRITICAL] Blocked dangerous shell command from AI Pilot: ${payload.command}`);
                context.showToast('Security Alert: Blocked dangerous shell command', 'error');
                
                hamEventBus.dispatch({
                  id: `shell_res_${Date.now()}`,
                  type: HamEventType.BROWSER_STATE,
                  timestamp: Date.now(),
                  source: 'BROWSER',
                  payload: { action: 'SHELL_RESULT', result: 'BLOCKED BY QUANTUM SHIELD: Command not allowed in autonomous mode.' }
                });
                break;
              }
            } else {
              console.warn(`[MASTER OVERRIDE] Executing dangerous shell command: ${payload.command}`);
              context.showToast('MASTER OVERRIDE: Executing shell command', 'warning');
            }

            const getShellService = shellServiceCache 
              ? Promise.resolve(shellServiceCache)
              : import('../../../services/shellService').then(m => {
                  shellServiceCache = m;
                  return m;
                });

            getShellService.then(({ shellService }) => {
              this.withTimeout(shellService.execute(payload.command), 10000, 'Shell execution timed out')
                .then(result => {
                  hamEventBus.dispatch({
                    id: `shell_res_${Date.now()}`,
                    type: HamEventType.BROWSER_STATE,
                    timestamp: Date.now(),
                    source: 'BROWSER',
                    payload: { action: 'SHELL_RESULT', result }
                  });
                }).catch(err => {
                  console.error('[Browser Pilot] Shell execution failed:', err);
                  context.showToast(`Shell execution failed: ${err.message}`, 'error');
                });
            }).catch(err => {
              console.error('[Browser Pilot] Shell service load failed:', err);
              context.showToast('Shell service load failed', 'error');
            });
          }
          break;
        case 'CHAMS_EXEC':
          if (payload.code) {
            const getChamsEngine = chamsEngineCache
              ? Promise.resolve(chamsEngineCache)
              : Promise.all([
                  import('../../../chams-lang/engine/evaluator'),
                  import('../../../chams-lang/compiler/parser'),
                  import('../../../chams-lang/compiler/lexer'),
                  import('../../../chams-lang/engine/memory')
                ]).then(m => {
                  chamsEngineCache = m;
                  return m;
                });

            getChamsEngine.then(([{ Evaluator }, { Parser }, { Lexer }, { MemoryManager, Environment }]) => {
              try {
                const lexer = new Lexer(payload.code);
                const tokens = lexer.tokenizeAll();
                const parser = new Parser(tokens);
                const ast = parser.parse();
                
                const memory = new MemoryManager(1000); // 1000 gas limit
                const env = new Environment();
                const evaluator = new Evaluator(memory);
                
                this.withTimeout(evaluator.evaluate(ast, env), 5000, 'cHams evaluation timed out')
                  .then(result => {
                    hamEventBus.dispatch({
                      id: `chams_res_${Date.now()}`,
                      type: HamEventType.BROWSER_STATE,
                      timestamp: Date.now(),
                      source: 'BROWSER',
                      payload: { action: 'CHAMS_RESULT', result }
                    });
                  }).catch(err => {
                    console.error('[Browser Pilot] cHams evaluation failed:', err);
                    context.showToast(`cHams evaluation failed: ${err.message}`, 'error');
                  });
              } catch (err: any) {
                console.error('[Browser Pilot] cHams compilation failed:', err);
                context.showToast(`cHams compilation failed: ${err.message}`, 'error');
              }
            }).catch(err => {
              console.error('[Browser Pilot] Failed to load cHams engine:', err);
              context.showToast('Failed to load cHams engine', 'error');
            });
          }
          break;
        case 'SYSTEM_QUERY':
          {
            const getDeviceMonitor = deviceMonitorServiceCache
              ? Promise.resolve(deviceMonitorServiceCache)
              : import('../../../services/deviceMonitorService').then(m => {
                  deviceMonitorServiceCache = m;
                  return m;
                });

            getDeviceMonitor.then(({ deviceMonitorService }) => {
              const info = deviceMonitorService.getSnapshot();
              hamEventBus.dispatch({
                id: `sys_res_${Date.now()}`,
                type: HamEventType.BROWSER_STATE,
                timestamp: Date.now(),
                source: 'BROWSER',
                payload: { action: 'SYSTEM_INFO', info }
              });
            }).catch(err => {
              console.error('[Browser Pilot] System query failed:', err);
            });
          }
          break;
        case 'STEALTH_MODE':
          if (nativeBridge.isAvailable()) {
            try {
              await this.withTimeout(
                nativeBridge.callAsync('Android', 'setStealthMode', payload.enabled || false),
                2000,
                'Native stealth mode timed out'
              );
              context.showToast(`Stealth Mode: ${payload.enabled ? 'ENABLED' : 'DISABLED'}`, payload.enabled ? 'success' : 'warning');
            } catch (err) {
              if (window.Android && window.Android.setStealthMode) {
                window.Android.setStealthMode(payload.enabled || false);
                context.showToast(`Stealth Mode: ${payload.enabled ? 'ENABLED' : 'DISABLED'}`, payload.enabled ? 'success' : 'warning');
              }
            }
          }
          break;
        case 'EMERGENCY_KILL':
          console.error('[CRITICAL] EMERGENCY KILL SIGNAL RECEIVED');
          if (nativeBridge.isAvailable()) {
            try {
              await this.withTimeout(
                nativeBridge.callAsync('Android', 'killAllProcesses'),
                2000,
                'Native kill timed out'
              );
            } catch (err) {
              if (window.Android && window.Android.killAllProcesses) {
                window.Android.killAllProcesses();
              }
            }
          }
          
          if (context.closeTab && context.activeTabId) {
            context.closeTab(context.activeTabId);
          }
          context.showToast('Emergency Kill Executed', 'error');
          
          hamEventBus.dispatch({
            id: `kill_${Date.now()}`,
            type: HamEventType.SYSTEM_ERROR,
            timestamp: Date.now(),
            source: 'BROWSER_PILOT',
            payload: { action: 'EMERGENCY_KILL' }
          });
          break;
        case 'GET_DOM_SNAPSHOT':
          {
            // Post to window so InternalBrowser/index.tsx handles it with its same-origin fallback logic
            window.postMessage({ type: 'GET_DOM_SNAPSHOT' }, '*');
          }
          break;
        default:
          console.warn(`[Browser Pilot] Unknown action: ${action}`);
      }
    } catch (error: any) {
      console.error(`[Browser Pilot] Error executing action ${action}:`, error);
      context.showToast(`AI Action Failed: ${error.message}`, 'error');
      
      // Self-healing: Melaporkan kegagalan ke bus
      hamEventBus.dispatch({
        id: `pilot_err_${Date.now()}`,
        type: HamEventType.SYSTEM_ERROR,
        timestamp: Date.now(),
        source: 'BROWSER_PILOT',
        payload: { action, error: error.message }
      });
    }
  }
}

export const browserPilotService = new BrowserPilotService();
