/* eslint-disable no-useless-assignment */
export class ShadowState {
  public shadowMap: Map<string, string> = new Map();
  public originalMap: Map<string, string> = new Map();
  public totalSize: number = 0;

  calculateSize(): number {
    let size = 0;
    for (const content of this.shadowMap.values()) {
      size += content.length;
    }
    for (const content of this.originalMap.values()) {
      size += content.length;
    }
    return size;
  }

  updateSize(originalIncrease: number, shadowIncrease: number) {
    this.totalSize += originalIncrease + shadowIncrease;
  }

  clear() {
    this.shadowMap.clear();
    this.originalMap.clear();
    this.totalSize = 0;
  }

  clone(): ShadowState {
    const newState = new ShadowState();
    newState.shadowMap = new Map(this.shadowMap);
    newState.originalMap = new Map(this.originalMap);
    newState.totalSize = this.totalSize;
    return newState;
  }
}
