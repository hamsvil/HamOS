import { AbstractPlatformAdapter } from './abstract-adapter';
import { Platform } from '../../../types/socialWorker';

export class FacebookAdapter extends AbstractPlatformAdapter {
  platform: Platform = 'facebook';

  getOAuthUrl(redirectUri: string): { url: string; state: string } | null {
    const appId = process.env.FACEBOOK_APP_ID;
    if (!appId) return null;
    const state = Math.random().toString(36).substring(7);
    const url = `https://www.facebook.com/v12.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}&scope=pages_manage_posts,pages_read_engagement`;
    return { url, state };
  }

  async handleCallback(code: string, redirectUri: string): Promise<any> {
    const appId = process.env.FACEBOOK_APP_ID;
    const appSecret = process.env.FACEBOOK_APP_SECRET;
    if (!appId || !appSecret) throw new Error('OAUTH_NOT_CONFIGURED');

    const response = await fetch(`https://graph.facebook.com/v12.0/oauth/access_token?client_id=${appId}&redirect_uri=${encodeURIComponent(redirectUri)}&client_secret=${appSecret}&code=${code}`);
    if (!response.ok) throw new Error('OAUTH_EXCHANGE_FAILED');
    return await response.json();
  }
}
