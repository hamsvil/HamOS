/* eslint-disable no-useless-assignment */
/**
 * StagingService
 * Manages draft/staging versions of files, replacing shadowBuffers.
 */
import { vfs } from './vfsService';

export class StagingService {
  private static instance: StagingService;
  private drafts: Map<string, string> = new Map();

  private constructor() {}

  public static getInstance(): StagingService {
    if (!StagingService.instance) {
      StagingService.instance = new StagingService();
    }
    return StagingService.instance;
  }

  public setDraft(path: string, content: string | null) {
    if (content === null) {
      this.drafts.delete(path);
    } else {
      this.drafts.set(path, content);
    }
  }

  public getDraft(path: string): string | null {
    return this.drafts.get(path) || null;
  }

  public async commitDraft(path: string): Promise<void> {
    const content = this.getDraft(path);
    if (content !== null) {
      await vfs.writeFile(path, content, 'user');
      this.drafts.delete(path);
    }
  }

  public getAllDrafts(): Map<string, string> {
    return new Map(this.drafts);
  }
}

export const stagingService = StagingService.getInstance();
