import { Platform, Credential, AdapterResult } from '../../types/socialWorker';

export interface PlatformAdapter {
  platform: Platform;
  authenticate(creds: any): Promise<AdapterResult>;
  post(content: string, mediaUrls?: string[]): Promise<AdapterResult>;
  schedule(content: string, time: string, mediaUrls?: string[]): Promise<AdapterResult>;
  getStats(): Promise<any>;
  validateCreds(creds: any): Promise<boolean>;
  getOAuthUrl(redirectUri: string): { url: string; state: string } | null;
  handleCallback(code: string, redirectUri: string): Promise<any>;
}
