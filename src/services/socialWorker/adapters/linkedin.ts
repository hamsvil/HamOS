import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class LinkedinAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'linkedin';

  getOAuthUrl(redirectUri: string): { url: string; state: string } | null {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    if (!clientId) return null;
    const state = Math.random().toString(36).substring(7);
    const url = `https://www.linkedin.com/oauth/v2/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=w_member_social`;
    return { url, state };
  }

  async handleCallback(code: string, redirectUri: string): Promise<any> {
    const clientId = process.env.LINKEDIN_CLIENT_ID;
    const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
    if (!clientId || !clientSecret) throw new Error('OAUTH_NOT_CONFIGURED');

    const response = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: redirectUri,
        client_id: clientId,
        client_secret: clientSecret
      })
    });
    if (!response.ok) throw new Error('OAUTH_EXCHANGE_FAILED');
    return await response.json();
  }
}
