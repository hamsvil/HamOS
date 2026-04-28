import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class MastodonAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'mastodon';

  // Mastodon usually requires per-instance registration, but we'll use a generic approach if configured
  getOAuthUrl(redirectUri: string): { url: string; state: string } | null {
    const clientId = process.env.MASTODON_CLIENT_ID;
    const instanceUrl = process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social';
    if (!clientId) return null;
    const state = Math.random().toString(36).substring(7);
    const url = `${instanceUrl}/oauth/authorize?client_id=${clientId}&scope=write:statuses&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&state=${state}`;
    return { url, state };
  }

  async handleCallback(code: string, redirectUri: string): Promise<any> {
    const clientId = process.env.MASTODON_CLIENT_ID;
    const clientSecret = process.env.MASTODON_CLIENT_SECRET;
    const instanceUrl = process.env.MASTODON_INSTANCE_URL || 'https://mastodon.social';
    if (!clientId || !clientSecret) throw new Error('OAUTH_NOT_CONFIGURED');

    const response = await fetch(`${instanceUrl}/oauth/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
        code
      })
    });
    if (!response.ok) throw new Error('OAUTH_EXCHANGE_FAILED');
    return await response.json();
  }
}
