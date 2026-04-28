import { openDB, IDBPDatabase } from 'idb';

export class Scheduler {
  private static DB_NAME = 'social_worker_scheduler';
  private static STORE_NAME = 'schedules';
  private timer: NodeJS.Timeout | null = null;

  private static async getDB(): Promise<IDBPDatabase> {
    return openDB(this.DB_NAME, 1, {
      upgrade(db) {
        db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
      },
    });
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => {
      this.checkSchedules();
    }, 60000); // Check every minute
  }

  stop() {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }
  }

  private async checkSchedules() {
    const db = await Scheduler.getDB();
    const schedules = await db.getAll(Scheduler.STORE_NAME);
    const now = new Date();

    for (const schedule of schedules) {
      if (new Date(schedule.time) <= now && schedule.status === 'pending') {
        // Execute dispatch logic (would call SocialWorkerService)
        console.log(`Executing scheduled post: ${schedule.postId}`);
        schedule.status = 'completed';
        await db.put(Scheduler.STORE_NAME, schedule);
      }
    }
  }

  static async addSchedule(entry: any) {
    const db = await this.getDB();
    await db.put(this.STORE_NAME, entry);
  }
}

export const socialScheduler = new Scheduler();
