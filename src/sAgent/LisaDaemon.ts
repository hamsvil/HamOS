import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import { logger } from '../server/logger';
import { selfVerifier } from './capabilities/SelfVerifier';
import { indexer } from './capabilities/Indexer';

export class LisaDaemon {
  private interval: NodeJS.Timeout | null = null;
  private syncInterval: NodeJS.Timeout | null = null;
  private status = {
    uptime: 0,
    lastCheck: '',
    health: 'unknown',
    anomalies: 0,
    lastLogs: [] as string[]
  };
  private logPath = path.resolve(process.cwd(), 'logs/lisa_daemon.log');

  constructor() {
    if (!fs.existsSync(path.dirname(this.logPath))) {
      fs.mkdirSync(path.dirname(this.logPath), { recursive: true });
    }
  }

  public start(options: { enable_zero?: boolean, intervalMs?: number } = {}) {
    logger.info('[LisaDaemon] Starting autonomous daemon...');
    this.status.lastCheck = new Date().toISOString();
    
    // Check if supreme protocol activated
    if (options.enable_zero) {
      (this.status as any).supreme = true;
    }
    
    this.runCycle();
    
    // Start the recursive cycle loop
    const cycleInterval = options.intervalMs || 60000;
    const scheduleNext = () => {
      this.interval = setTimeout(async () => {
        await this.runCycle();
        scheduleNext();
      }, cycleInterval);
    };
    scheduleNext();

    // Initial sync and then every 1 hour (3600_000 ms)
    this.syncGeminiKeys();
    const scheduleSync = () => {
      this.syncInterval = setTimeout(async () => {
        await this.syncGeminiKeys();
        scheduleSync();
      }, 3600000);
    };
    scheduleSync();
    this.watchRestartSignal();
  }

  private watchRestartSignal() {
    const signalPath = path.resolve(process.cwd(), '.lisa/RESTART_SIGNAL');
    setInterval(() => {
      if (fs.existsSync(signalPath)) {
        logger.info('[LisaDaemon] RESTART_SIGNAL detected. Cleaning up and exiting for auto-restart.');
        try {
          fs.unlinkSync(signalPath);
        } catch (e) {
          logger.error({ error: e }, '[LisaDaemon] Failed to delete RESTART_SIGNAL file');
        }
        process.exit(1);
      }
    }, 10000);
  }

  public stop() {
    if (this.interval) {
      clearTimeout(this.interval);
      this.interval = null;
    }
    if (this.syncInterval) {
      clearTimeout(this.syncInterval);
      this.syncInterval = null;
    }
    logger.info('[LisaDaemon] Stopped.');
  }

  public async syncGeminiKeys() {
    const listKeyPath = path.resolve(process.cwd(), 'listkey.example');
    const targetPath = path.resolve(process.cwd(), 'src/config/hardcodedKeys.ts');

    try {
      if (!fs.existsSync(listKeyPath)) {
        logger.debug('[LisaDaemon] listkey.example not found, skipping sync');
        return;
      }

      const listKeyContent = fs.readFileSync(listKeyPath, 'utf8');
      const geminiPattern = /AIzaSy[A-Za-z0-9_-]{20,}/g;
      const sourceKeys = Array.from(new Set(listKeyContent.match(geminiPattern) || []));

      if (sourceKeys.length === 0) {
        logger.debug('[LisaDaemon] No valid Gemini keys found in listkey.example');
        return;
      }

      const targetContent = fs.readFileSync(targetPath, 'utf8');
      
      // Extract existing keys from target to avoid duplicates
      // We look specifically within the GEMINI array block
      const geminiBlockMatch = targetContent.match(/GEMINI: \[([\s\S]*?)\]/);
      if (!geminiBlockMatch) {
        logger.error('[LisaDaemon] Could not find GEMINI array in hardcodedKeys.ts');
        return;
      }

      const existingKeys = new Set(geminiBlockMatch[1].match(geminiPattern) || []);
      const newKeys = sourceKeys.filter(key => !existingKeys.has(key));

      if (newKeys.length === 0) {
        logger.debug('[LisaDaemon] No new Gemini keys to sync');
        return;
      }

      logger.info(`[LisaDaemon] Syncing ${newKeys.length} new Gemini keys to hardcodedKeys.ts`);

      // Prepare insertion
      // Regex multiline to find the end of GEMINI array
      // Target: GEMINI: [ ... ]
      const insertion = newKeys.map(key => `    "${key}",`).join('\n') + '\n';
      
      // We insert before the closing bracket of GEMINI array. 
      // We use a regex that matches the GEMINI block and captures the content before the last bracket
      const updatedContent = targetContent.replace(/(GEMINI: \[[ \s\S]*?)(\n\s*\])/, (match, p1, p2) => {
        return p1 + (p1.endsWith('\n') ? '' : '\n') + insertion + p2;
      });

      // Atomic write
      const tmpPath = targetPath + '.tmp';
      fs.writeFileSync(tmpPath, updatedContent, 'utf8');
      fs.renameSync(tmpPath, targetPath);

      logger.info('[LisaDaemon] Gemini keys synced successfully');
    } catch (err) {
      logger.error({ err }, '[LisaDaemon] Gemini key sync error');
    }
  }

  private async runCycle() {
    this.status.uptime += 60;
    this.status.lastCheck = new Date().toISOString();

    try {
      await this.checkHealth();
      
      // Integrate Phase 1 modules
      try {
        await selfVerifier.runVerification();
      } catch (e) {
        logger.error({ error: e }, '[LisaDaemon] SelfVerifier failed during cycle');
      }

      if (this.status.uptime % 600 === 0) {
        try {
          await indexer.buildIndex();
          logger.info('[LisaDaemon] Knowledge Index updated.');
        } catch (e) {
          logger.error({ error: e }, '[LisaDaemon] Indexer failed during cycle');
        }
      }

      this.scanLogs();
      this.detectAndHealAnomalies();
      this.cleanupOldBackups();
      
      const logMsg = `[${this.status.lastCheck}] Health: ${this.status.health}, Anomalies: ${this.status.anomalies}, Uptime: ${this.status.uptime}s`;
      fs.appendFileSync(this.logPath, logMsg + '\n');
      
      if (this.status.anomalies > 0) {
        logger.warn(`[LisaDaemon] Anomalies detected: ${this.status.anomalies}`);
      }
    } catch (err) {
      logger.error({ err }, '[LisaDaemon] Cycle error');
    }
  }

  private cleanupOldBackups() {
    try {
      const backupDir = path.resolve(process.cwd(), 'file_tree');
      if (!fs.existsSync(backupDir)) return;

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.tar.gz'))
        .map(f => ({ filePath: path.join(backupDir, f), time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length > 5) {
        const toDelete = files.slice(5);
        toDelete.forEach(file => {
          fs.unlinkSync(file.filePath);
          logger.info(`[LisaDaemon] Auto-cleaned old backup: ${path.basename(file.filePath)}`);
        });
      }
    } catch (e) {
      logger.error({ error: e }, '[LisaDaemon] Failed to cleanup old backups');
    }
  }

  private consecutiveFailures = 0;

  private detectAndHealAnomalies() {
    const hasFatalNonRateLimitError = this.status.lastLogs.some(log => 
      (log.includes('ERROR') || log.includes('CRITICAL')) && 
      !log.toLowerCase().includes('429') && 
      !log.toLowerCase().includes('quota') &&
      !log.toLowerCase().includes('rate limit')
    );

    if (this.status.health !== 'ok' || hasFatalNonRateLimitError) {
      this.consecutiveFailures++;
      logger.warn(`[LisaDaemon] Critical health or fatal error detected (${this.consecutiveFailures}/3). Attempting auto-respawn logic...`);
      this.status.anomalies++;
      
      if (this.consecutiveFailures >= 3) {
        logger.fatal('[LisaDaemon] Consecutive failures triggered EMERGENCY AUTO-ROLLBACK.');
        this.triggerEmergencyRollback();
      }
    } else {
      this.consecutiveFailures = 0;
    }
  }

  private triggerEmergencyRollback() {
    try {
      const backupDir = path.resolve(process.cwd(), 'file_tree');
      if (!fs.existsSync(backupDir)) {
        logger.error('[LisaDaemon] No file_tree backup directory found. Rollback aborted.');
        return;
      }

      const files = fs.readdirSync(backupDir)
        .filter(f => f.endsWith('.tar.gz'))
        .map(f => ({ name: f, time: fs.statSync(path.join(backupDir, f)).mtime.getTime() }))
        .sort((a, b) => b.time - a.time);

      if (files.length === 0) {
        logger.error('[LisaDaemon] No .tar.gz backups found. Rollback aborted.');
        return;
      }

      const latestBackup = files[0].name;
      const backupPath = path.join(backupDir, latestBackup);
      
      logger.info(`[LisaDaemon] Executing Rollback to ${latestBackup}...`);
      
      execSync(`tar -xzf "${backupPath}" -C "${process.cwd()}"`);
      logger.info('[LisaDaemon] Rollback extracted successfully. Terminating process to restart.');
      
      fs.writeFileSync(path.resolve(process.cwd(), 'logs/RECOVERY_INFO.txt'), `Rolled back to ${latestBackup} at ${new Date().toISOString()} due to critical system failure.\n`);
      
      process.exit(1);
    } catch (error) {
      logger.error({ error }, '[LisaDaemon] Failed to execute emergency rollback');
    }
  }

  private async checkHealth() {
    const port = process.env.PORT || 3000;
    try {
      const res = await fetch(`http://localhost:${port}/api/health`);
      if (res.ok) {
        this.status.health = 'ok';
      } else {
        this.status.health = 'error';
        this.status.anomalies++;
      }
    } catch (e) {
      this.status.health = 'unreachable';
      this.status.anomalies++;
    }
  }

  private scanLogs() {
    const errorLog = path.resolve(process.cwd(), 'erorr_console.log');
    if (fs.existsSync(errorLog)) {
      const content = fs.readFileSync(errorLog, 'utf8');
      const lines = content.trim().split('\n');
      const recentErrors = lines.filter(l => l.includes('ERROR') || l.includes('CRITICAL'));
      
      // Update anomalies based on new errors compared to last check
      // Simple logic: if error count increased, that's an anomaly
      this.status.lastLogs = recentErrors.slice(-5);
    }
  }

  public getStatus() {
    return { ...this.status };
  }

  public getReport() {
    return `LISA SYSTEM REPORT
------------------
Timestamp: ${this.status.lastCheck}
Uptime: ${this.status.uptime}s
Health: ${this.status.health}
Anomalies: ${this.status.anomalies}
Recent Events: ${this.status.lastLogs.length > 0 ? this.status.lastLogs.join(' | ') : 'None'}
------------------`;
  }
}
