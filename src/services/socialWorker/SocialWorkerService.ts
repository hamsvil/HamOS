import { TwitterAdapter } from './adapters/twitter';
import { FacebookAdapter } from './adapters/facebook';
import { InstagramAdapter } from './adapters/instagram';
import { LinkedinAdapter } from './adapters/linkedin';
import { TiktokAdapter } from './adapters/tiktok';
import { YoutubeAdapter } from './adapters/youtube';
import { ThreadsAdapter } from './adapters/threads';
import { RedditAdapter } from './adapters/reddit';
import { PinterestAdapter } from './adapters/pinterest';
import { MastodonAdapter } from './adapters/mastodon';
import { Platform, Post, AdapterResult } from '../../types/socialWorker';

export class SocialWorkerService {
  private adapters: Record<string, any> = {
    twitter: new TwitterAdapter(),
    facebook: new FacebookAdapter(),
    instagram: new InstagramAdapter(),
    linkedin: new LinkedinAdapter(),
    tiktok: new TiktokAdapter(),
    youtube: new YoutubeAdapter(),
    threads: new ThreadsAdapter(),
    reddit: new RedditAdapter(),
    pinterest: new PinterestAdapter(),
    mastodon: new MastodonAdapter(),
  };

  async dispatchPost(post: Post): Promise<Record<Platform, AdapterResult>> {
    const results: any = {};
    for (const platform of post.platforms) {
      const adapter = this.adapters[platform];
      if (adapter) {
        try {
          results[platform] = await adapter.post(post.content);
        } catch (error: any) {
          results[platform] = { success: false, error: error.message };
        }
      }
    }
    return results;
  }

  async schedulePost(post: Post, time: string): Promise<Record<Platform, AdapterResult>> {
    const results: any = {};
    for (const platform of post.platforms) {
      const adapter = this.adapters[platform];
      if (adapter) {
        try {
          results[platform] = await adapter.schedule(post.content, time);
        } catch (error: any) {
          results[platform] = { success: false, error: error.message };
        }
      }
    }
    return results;
  }
}

export const socialWorkerService = new SocialWorkerService();
