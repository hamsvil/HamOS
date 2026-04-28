import express from 'express';
import { z } from 'zod';
import { AIContentGenerator } from '../../services/socialWorker/AIContentGenerator';
import { TwitterAdapter } from '../../services/socialWorker/adapters/twitter';
import { FacebookAdapter } from '../../services/socialWorker/adapters/facebook';
import { LinkedinAdapter } from '../../services/socialWorker/adapters/linkedin';
import { MastodonAdapter } from '../../services/socialWorker/adapters/mastodon';
import { logger } from '../logger';
import { PlatformAdapter } from '../../services/socialWorker/PlatformAdapter';

const router = express.Router();

const adapters: Record<string, PlatformAdapter> = {
  twitter: new TwitterAdapter(),
  facebook: new FacebookAdapter(),
  linkedin: new LinkedinAdapter(),
  mastodon: new MastodonAdapter(),
};

const getRedirectUri = (platform: string, req: express.Request) => {
  const baseUrl = process.env.SOCIAL_WORKER_BASE_URL || 
                  (process.env.REPLIT_DEV_DOMAIN ? `https://${process.env.REPLIT_DEV_DOMAIN}` : null) || 
                  `http://localhost:${process.env.PORT || 5000}`;
  return `${baseUrl}/api/social-worker/auth/${platform}/callback`;
};

// ... existing queue/schedule routes ...

router.get('/auth/:platform/login', (req, res) => {
  const { platform } = req.params;
  const adapter = adapters[platform];

  if (!adapter) {
    return res.status(404).json({ error: 'Platform not supported for OAuth' });
  }

  const redirectUri = getRedirectUri(platform, req);
  const oauth = adapter.getOAuthUrl(redirectUri);

  if (!oauth) {
    const missingEnv: string[] = [];
    if (platform === 'twitter') missingEnv.push('TWITTER_CLIENT_ID');
    if (platform === 'facebook') missingEnv.push('FACEBOOK_APP_ID');
    if (platform === 'linkedin') missingEnv.push('LINKEDIN_CLIENT_ID');
    if (platform === 'mastodon') missingEnv.push('MASTODON_CLIENT_ID');

    return res.status(503).json({ 
      configured: false, 
      missingEnv,
      message: `OAuth for ${platform} is not configured. Please set the required environment variables.`
    });
  }

  res.redirect(oauth.url);
});

router.get('/auth/:platform/callback', async (req, res) => {
  const { platform } = req.params;
  const { code, error } = req.query;
  const adapter = adapters[platform];

  if (error) {
    logger.error({ platform, error }, 'OAuth callback error');
    return res.redirect(`/social-worker?error=${error}`);
  }

  if (!adapter || !code) {
    return res.status(400).json({ error: 'Invalid callback request' });
  }

  try {
    const redirectUri = getRedirectUri(platform, req);
    const tokens = await adapter.handleCallback(code as string, redirectUri);
    
    // Return to frontend with tokens in a way that can be captured
    // We'll use a postMessage approach or a temporary redirect with tokens (encrypted or hash)
    // For simplicity and safety in this environment, we'll redirect to a client-side route
    const encodedTokens = Buffer.from(JSON.stringify(tokens)).toString('base64');
    res.redirect(`/social-worker?oauth_success=true&platform=${platform}&data=${encodedTokens}`);
  } catch (err: any) {
    logger.error({ platform, err: err.message }, 'OAuth exchange failed');
    res.redirect(`/social-worker?error=exchange_failed`);
  }
});

router.get('/auth/config', (req, res) => {
  const config = {
    twitter: !!process.env.TWITTER_CLIENT_ID,
    facebook: !!process.env.FACEBOOK_APP_ID,
    linkedin: !!process.env.LINKEDIN_CLIENT_ID,
    mastodon: !!process.env.MASTODON_CLIENT_ID,
  };
  res.json(config);
});

// Mock database in-memory for the sake of the API skeleton, 
// though the services use IDB (client-side) or VFS (server-side if needed).
// [HYBRID-L2]
let queue: any[] = [];
let schedules: any[] = [];

router.post('/queue', (req, res) => {
  try {
    const post = req.body;
    post.id = Date.now().toString();
    queue.push(post);
    res.json({ success: true, post });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'QUEUE_ERROR' });
  }
});

router.get('/queue', (req, res) => {
  res.json(queue);
});

router.delete('/queue/:id', (req, res) => {
  const { id } = req.params;
  queue = queue.filter(p => p.id !== id);
  res.json({ success: true });
});

router.post('/schedule', (req, res) => {
  try {
    const schedule = req.body;
    schedule.id = Date.now().toString();
    schedules.push(schedule);
    res.json({ success: true, schedule });
  } catch (error: any) {
    res.status(500).json({ error: error.message, code: 'SCHEDULE_ERROR' });
  }
});

router.get('/schedule', (req, res) => {
  res.json(schedules);
});

router.post('/dispatch', (req, res) => {
  const { postId } = req.body;
  res.json({ success: true, message: `Post ${postId} dispatched manually.` });
});

router.get('/stats', (req, res) => {
  res.json([
    { platform: 'twitter', engagement: 120, reach: 1000, impressions: 1500, followers: 500, timestamp: new Date().toISOString() },
    { platform: 'facebook', engagement: 80, reach: 800, impressions: 1200, followers: 450, timestamp: new Date().toISOString() },
  ]);
});

router.post('/ai-generate', async (req, res) => {
  const schema = z.object({
    prompt: z.string(),
    tone: z.string().optional(),
    length: z.string().optional(),
  });

  try {
    const { prompt, tone, length } = schema.parse(req.body);
    const content = await AIContentGenerator.generate(prompt, tone, length);
    res.json({ content });
  } catch (error: any) {
    res.status(400).json({ error: error.message, code: 'AI_GEN_ERROR' });
  }
});

router.post('/feedback', (req, res) => {
  res.json({ success: true, message: 'Feedback received.' });
});

export default router;
