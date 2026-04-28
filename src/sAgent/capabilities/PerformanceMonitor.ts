import * as fs from 'fs';
import * as path from 'path';

export interface TaskMetric {
  taskId: string;
  startTime: number;
  endTime?: number;
  status: 'success' | 'failed' | 'partial';
  lintDeltaBefore?: number;
  lintDeltaAfter?: number;
  notes?: string;
}

export interface PerformanceSummary {
  totalTasks: number;
  successRate: number;
  averageDuration: number;
}

const METRICS_PATH = path.resolve(process.cwd(), '.lisa/METRICS.jsonl');

export class PerformanceMonitor {
  private activeTasks: Map<string, TaskMetric> = new Map();

  public startTask(id: string) {
    this.activeTasks.set(id, {
      taskId: id,
      startTime: Date.now(),
      status: 'partial'
    });
  }

  public endTask(id: string, status: 'success' | 'failed' | 'partial', meta: Partial<TaskMetric>) {
    const task = this.activeTasks.get(id);
    if (!task) return;

    const completedTask: TaskMetric = {
      ...task,
      ...meta,
      status,
      endTime: Date.now()
    };

    fs.appendFileSync(METRICS_PATH, JSON.stringify(completedTask) + '\n');
    this.activeTasks.delete(id);
  }

  public getReport(): PerformanceSummary {
    if (!fs.existsSync(METRICS_PATH)) {
      return { totalTasks: 0, successRate: 0, averageDuration: 0 };
    }

    const lines = fs.readFileSync(METRICS_PATH, 'utf8').trim().split('\n');
    const metrics: TaskMetric[] = lines.map(line => JSON.parse(line));

    const totalTasks = metrics.length;
    const successTasks = metrics.filter(m => m.status === 'success').length;
    const durations = metrics.filter(m => m.endTime).map(m => m.endTime! - m.startTime);
    
    return {
      totalTasks,
      successRate: totalTasks > 0 ? (successTasks / totalTasks) * 100 : 0,
      averageDuration: durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : 0
    };
  }
}

export const performanceMonitor = new PerformanceMonitor();
