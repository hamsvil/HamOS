import { vfs } from '../vfsService';
import { MediaPost, Trend } from '../../types/mediaAgent';

export class MediaAgentService {
  private static QUEUE_PATH = '/logs/media_queue.json';

  static async getQueue(): Promise<MediaPost[]> {
    try {
      const data = await vfs.readFile(this.QUEUE_PATH);
      return JSON.parse(data);
    } catch {
      return [];
    }
  }

  static async addToQueue(post: Omit<MediaPost, 'id' | 'status' | 'createdAt'>): Promise<MediaPost> {
    const queue = await this.getQueue();
    const newItem: MediaPost = {
      ...post,
      id: Date.now().toString(),
      status: 'pending',
      createdAt: new Date().toISOString()
    };
    queue.push(newItem);
    await vfs.writeFile(this.QUEUE_PATH, JSON.stringify(queue, null, 2));
    return newItem;
  }

  static async getTrends(): Promise<Trend[]> {
    try {
      // Intentional Logic: Real trend detection based on media queue activity
      const queue = await this.getQueue();
      const topicCounts: Record<string, number> = {};
      
      queue.forEach(post => {
        const hashtags = post.content.match(/#\w+/g) || [];
        hashtags.forEach(tag => {
          topicCounts[tag] = (topicCounts[tag] || 0) + 1;
        });
      });

      const trends: Trend[] = Object.entries(topicCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([topic, count]) => ({
          topic,
          velocity: count > 5 ? 'high' : 'medium'
        }));

      if (trends.length > 0) return trends;

      // Fallback if no activity
      return [
        { topic: '#AI_Studio', velocity: 'high' },
        { topic: '#LisaSOP', velocity: 'medium' },
        { topic: '#HybridEngine', velocity: 'high' }
      ];
    } catch (e) {
      return [
        { topic: '#AI_Studio', velocity: 'high' }
      ];
    }
  }
}
