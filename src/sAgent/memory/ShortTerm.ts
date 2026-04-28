/**
 * ShortTerm Memory - Ring buffer for conversation context
 */
export class ShortTerm {
  private buffer: any[] = [];
  private readonly MAX_SIZE = 50;

  public add(entry: any) {
    this.buffer.push({ ...entry, timestamp: Date.now() });
    if (this.buffer.length > this.MAX_SIZE) {
      this.buffer.shift();
    }
  }

  public getContext() {
    return [...this.buffer];
  }

  public clear() {
    this.buffer = [];
  }
}
