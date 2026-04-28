import { Platform, AdapterResult } from '../../../types/socialWorker';
import { PlatformAdapter } from '../PlatformAdapter';

export abstract class AbstractPlatformAdapter implements PlatformAdapter {
  abstract platform: Platform;

  async authenticate(creds: any): Promise<AdapterResult> {
    if (!creds) throw new Error('CREDENTIALS_MISSING');
    // Default implementation as stub, real ones override if possible
    return { success: true };
  }

  async post(content: string, mediaUrls?: string[]): Promise<AdapterResult> {
    return { success: false, error: 'NOT_IMPLEMENTED' };
  }

  async schedule(content: string, time: string, mediaUrls?: string[]): Promise<AdapterResult> {
    return { success: false, error: 'NOT_IMPLEMENTED' };
  }

  async getStats(): Promise<any> {
    return { error: 'NOT_IMPLEMENTED' };
  }

  async validateCreds(creds: any): Promise<boolean> {
    const res = await this.authenticate(creds);
    return res.success;
  }

  getOAuthUrl(redirectUri: string): { url: string; state: string } | null {
    return null;
  }

  async handleCallback(code: string, redirectUri: string): Promise<any> {
    throw new Error('OAUTH_NOT_SUPPORTED');
  }
}
