import { ShortTerm } from './ShortTerm';
import { LongTerm } from './LongTerm';
import { Blackboard } from './Blackboard';
import { CalibrationLedger } from './CalibrationLedger';

export class Memory {
  private static instance: Memory;
  
  public short = new ShortTerm();
  public long = new LongTerm();
  private blackboards: Map<string, Blackboard> = new Map();
  public calibration = new CalibrationLedger();

  private constructor() {}

  public static getInstance(): Memory {
    if (!Memory.instance) {
      Memory.instance = new Memory();
    }
    return Memory.instance;
  }

  public async init() {
    await Promise.all([
      this.long.init(),
      this.calibration.init()
    ]);
    console.log('[Memory] All layers initialized.');
  }

  public blackboard(taskId: string): Blackboard {
    if (!this.blackboards.has(taskId)) {
      this.blackboards.set(taskId, new Blackboard());
    }
    return this.blackboards.get(taskId)!;
  }

  public releaseBlackboard(taskId: string) {
    this.blackboards.delete(taskId);
  }
}

export const memory = Memory.getInstance();
