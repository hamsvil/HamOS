import { vfs } from '../vfsService';

export interface AeternaCommand {
  id: string;
  command: string;
  queuedAt: number;
}

export interface AeternaStatus {
  ok: boolean;
  service: string;
  queueLength: number;
  secured: boolean;
}

export class AeternaGlassService {
  private static API_BASE = '/api/aeterna';

  static async getStatus(): Promise<AeternaStatus> {
    const res = await fetch(`${this.API_BASE}/status`);
    if (!res.ok) throw new Error('Failed to fetch Aeterna status');
    return res.json();
  }

  static async sendCommand(command: string, secret: string): Promise<{ id: string }> {
    const res = await fetch(`${this.API_BASE}/command`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command, secret }),
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to send command');
    }
    return res.json();
  }

  static async logCommand(command: string) {
    const logEntry = `[${new Date().toISOString()}] CMD: ${command}\n`;
    await vfs.appendFile('/logs/aeterna_commands.log', logEntry, 'aeterna-service');
  }
}
