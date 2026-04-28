import { PersistenceLayer } from './PersistenceLayer';

export interface CalibrationEntry {
  id: string;
  timestamp: number;
  intentHash: string;
  tier: 'pro' | 'flash' | 'deep';
  persona?: string;
  decision: string;
  confidence: number;
  tokensUsed: number;
  latencyMs: number;
  outcome: 'success' | 'failure' | 'unknown';
  userFeedback?: 'good' | 'bad';
}

/**
 * CalibrationLedger - Append-only record of decisions and outcomes
 */
export class CalibrationLedger {
  private entries: CalibrationEntry[] = [];
  private readonly STORAGE_KEY = 'calibration_ledger';

  public async init() {
    this.entries = await PersistenceLayer.load<CalibrationEntry[]>(this.STORAGE_KEY) || [];
  }

  public async record(entry: Omit<CalibrationEntry, 'id' | 'timestamp'>) {
    const fullEntry: CalibrationEntry = {
      ...entry,
      id: Math.random().toString(36).substring(7),
      timestamp: Date.now()
    };
    this.entries.push(fullEntry);
    
    // Keep last 1000 for local calibration
    if (this.entries.length > 1000) {
      this.entries.shift();
    }

    await PersistenceLayer.save(this.STORAGE_KEY, this.entries);
  }

  public getHistory() {
    return [...this.entries];
  }
}
