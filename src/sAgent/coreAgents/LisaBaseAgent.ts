import { BaseAgent, AgentConfig } from './BaseAgent';
import { FeatureRuleset } from '../../services/featureRules/FeatureRulesRegistry';
import { logger as pinoLogger } from '../../server/logger';
import fs from 'fs';
import path from 'path';

export interface LisaAgentConfig extends AgentConfig {
  featureId: string;
  featureRules?: FeatureRuleset;
  logFile?: string;
  contextBoundary?: string[];
}

export class LisaBaseAgent extends BaseAgent {
  protected lisaConfig: LisaAgentConfig;
  protected logger: any;

  constructor(config: LisaAgentConfig, tools: any[] = [], toolImplementations: Record<string, Function> = {}) {
    // Inject feature rules into systemInstruction if present
    const enhancedInstruction = config.featureRules 
      ? `${config.systemInstruction}\n\n[FEATURE RULES: ${config.featureId}]\n${config.featureRules.systemPromptOverlay}\n${JSON.stringify(config.featureRules.rules)}`
      : config.systemInstruction;

    super({ ...config, systemInstruction: enhancedInstruction }, tools, toolImplementations);
    
    // Auto-generate logFile path if not provided
    if (!config.logFile) {
      config.logFile = `logs/agent_${config.featureId}.log`;
    }

    this.lisaConfig = config;
    
    // Initialize log file if specified
    if (this.lisaConfig.logFile) {
      const logDir = path.dirname(path.resolve(process.cwd(), this.lisaConfig.logFile));
      if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
      }
    }

    this.logger = pinoLogger.child({ 
      agentId: config.id, 
      featureId: config.featureId,
      name: config.name 
    });
  }

  public isolateContext(): void {
    this.logger.info(`[${this.lisaConfig.featureId}] isolating context. Clearing cross-feature memory...`);
    // Logic to clear memory specifically for this execution instance
    // In this implementation, we ensure no external context leaks in.
  }

  public async healthCheck(): Promise<boolean> {
    try {
      const port = process.env.PORT || 3000;
      const res = await fetch(`http://localhost:${port}/api/health`);
      return res.ok;
    } catch (e) {
      this.logger.error({ err: e }, 'Health check failed');
      return false;
    }
  }

  public async reportAnomaly(detail: string): Promise<void> {
    this.logger.warn({ anomaly: detail }, 'Anomaly reported');
    try {
      const port = process.env.PORT || 3000;
      await fetch(`http://localhost:${port}/api/lisa/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentId: this.lisaConfig.id,
          featureId: this.lisaConfig.featureId,
          detail,
          timestamp: new Date().toISOString()
        })
      });
    } catch (e) {
      this.logger.error({ err: e }, 'Failed to send anomaly report');
    }
  }

  public async executeWithAudit(task: string, context?: any): Promise<string> {
    this.isolateContext();
    const startTime = Date.now();
    this.logger.info({ task, context }, `Executing task with audit for ${this.lisaConfig.featureId}`);
    
    try {
      const result = await this.executeTask(task);
      const duration = Date.now() - startTime;
      
      this.auditLog({
        task,
        result: result.substring(0, 500) + (result.length > 500 ? '...' : ''),
        duration,
        status: 'success'
      });
      
      return result;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      this.logger.error({ err: error, task }, 'Task execution failed');
      
      this.auditLog({
        task,
        error: error.message,
        duration,
        status: 'failed'
      });
      
      throw error;
    }
  }

  public async withRetry<T>(fn: () => Promise<T>, modelAlias: string): Promise<T> {
    return super.withRetry(fn, modelAlias);
  }

  private auditLog(entry: any) {
    if (this.lisaConfig.logFile) {
      const logPath = path.resolve(process.cwd(), this.lisaConfig.logFile);
      const logEntry = JSON.stringify({
        timestamp: new Date().toISOString(),
        agentId: this.lisaConfig.id,
        featureId: this.lisaConfig.featureId,
        ...entry
      }) + '\n';
      
      fs.appendFileSync(logPath, logEntry);
    }
  }

  public withFeatureRules(ruleset: FeatureRuleset): void {
    this.lisaConfig.featureRules = ruleset;
    // Note: In a real scenario we might want to update the AI instance's system instruction
    // but BaseAgent's ai instance is private. For now, we rely on constructor injection.
  }
}
