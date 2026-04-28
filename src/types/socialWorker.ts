export type Platform = 'twitter' | 'facebook' | 'instagram' | 'linkedin' | 'tiktok' | 'youtube' | 'threads' | 'reddit' | 'pinterest' | 'mastodon';

export interface Credential {
  id: string;
  platform: Platform;
  encryptedData: string; // AES-GCM encrypted blob
  iv: string;
  lastValidated: string;
  accountName?: string;
}

export interface Post {
  id: string;
  platforms: Platform[];
  content: string;
  mediaIds: string[];
  status: 'draft' | 'queued' | 'posting' | 'posted' | 'failed';
  scheduledTime?: string;
  createdAt: string;
  error?: string;
}

export interface ScheduleEntry {
  id: string;
  postId: string;
  platform: Platform;
  time: string;
  status: 'pending' | 'executing' | 'completed' | 'failed';
}

export interface Stat {
  platform: Platform;
  engagement: number;
  reach: number;
  impressions: number;
  followers: number;
  timestamp: string;
}

export interface AdapterResult {
  success: boolean;
  message?: string;
  externalId?: string;
  error?: string;
}
