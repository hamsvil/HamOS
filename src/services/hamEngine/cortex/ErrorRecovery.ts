/* eslint-disable no-useless-assignment */
import { HamToolName } from './types';
import { ToolHandlers } from './toolHandlers';
import { HamSecurity } from '../kernel/hamSecurity';

export class ErrorRecovery {
  public static async handleCircuitBreaker(lastErrorCount: number, outputMsg: string): Promise<{ isFinished: boolean, finalSummary: string, newErrorCount: number, outputMsg: string }> {
    if (HamSecurity.checkCircuitBreaker(lastErrorCount)) {
      try {
        const { shadowVFS } = await import('../kernel/ShadowVFS');
        await shadowVFS.rollback();
        const msg = outputMsg + '\n[SYSTEM]: Circuit Breaker Triggered. The system has rolled back Shadow VFS to revert your broken changes. I am halting execution to prevent further damage. Please review the errors and decide how to proceed.';
        return { isFinished: true, finalSummary: msg, newErrorCount: 0, outputMsg: msg };
      } catch (e) {
        const msg = outputMsg + '\n[SYSTEM]: Circuit Breaker Triggered, but rollback failed.';
        return { isFinished: true, finalSummary: msg, newErrorCount: 0, outputMsg: msg };
      }
    }
    return { isFinished: false, finalSummary: '', newErrorCount: lastErrorCount, outputMsg };
  }
}
