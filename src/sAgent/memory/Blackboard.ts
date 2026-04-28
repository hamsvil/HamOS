/**
 * Blackboard - Scratch memory for the current task execution
 */
export class Blackboard {
  private data: Map<string, any> = new Map();

  public set(key: string, value: any) {
    this.data.set(key, value);
  }

  public get(key: string) {
    return this.data.get(key);
  }

  public clear() {
    this.data.clear();
  }

  public dump() {
    return Object.fromEntries(this.data);
  }
}
