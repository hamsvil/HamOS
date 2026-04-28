import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform, AdapterResult } from '../../../types/socialWorker';

export class TwitterAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'twitter';

    async authenticate(creds: any): Promise<AdapterResult> {
      if (!creds) throw new Error('credentials_missing');
      const response = await fetch('https://api.twitter.com/v1/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds)
      }).catch(() => ({ ok: false }));
      
      return { success: response.ok };
    }

    async post(content: string, mediaUrls?: string[]): Promise<AdapterResult> {
      const response = await fetch('https://api.twitter.com/v1/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, mediaUrls })
      }).catch(() => ({ ok: false }));
      
      return { success: response.ok };
    }

    async schedule(content: string, time: string, mediaUrls?: string[]): Promise<AdapterResult> {
      const response = await fetch('https://api.twitter.com/v1/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, time, mediaUrls })
      }).catch(() => ({ ok: false }));
      
      return { success: response.ok };
    }

    async getStats(): Promise<any> {
      const response = await fetch('https://api.twitter.com/v1/stats');
      return response.ok ? response.json() : { error: 'failed_to_fetch_stats' };
    }

    async validateCreds(creds: any): Promise<boolean> {
      if (!creds) return false;
      const res = await this.authenticate(creds);
      return res.success;
    }

    getOAuthUrl(redirectUri: string): { url: string; state: string } | null {
      const clientId = process.env.TWITTER_CLIENT_ID;
      if (!clientId) return null;
      const state = Math.random().toString(36).substring(7);
      const url = `https://twitter.com/i/oauth2/authorize?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=tweet.read%20tweet.write%20users.read%20offline.access&state=${state}&code_challenge=challenge&code_challenge_method=plain`;
      return { url, state };
    }

    async handleCallback(code: string, redirectUri: string): Promise<any> {
      const clientId = process.env.TWITTER_CLIENT_ID;
      const clientSecret = process.env.TWITTER_CLIENT_SECRET;
      if (!clientId || !clientSecret) throw new Error('OAUTH_NOT_CONFIGURED');
      
      const response = await fetch('https://api.twitter.com/2/oauth2/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`
        },
        body: new URLSearchParams({
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
          code_verifier: 'challenge'
        })
      });

      if (!response.ok) throw new Error('OAUTH_EXCHANGE_FAILED');
      return await response.json();
    }
  }
  