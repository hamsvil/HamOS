import { HamNode, HamType } from '../core/types';

export class Environment {
  private values: Map<string, any> = new Map();
  private types: Map<string, HamType> = new Map();
  public parent: Environment | null;

  constructor(parent: Environment | null = null) {
    this.parent = parent;
  }

  define(name: string, value: any, type: HamType) {
    this.values.set(name, value);
    this.types.set(name, type);
  }

  assign(name: string, value: any) {
    if (this.values.has(name)) {
      this.values.set(name, value);
      return;
    }
    if (this.parent) {
      this.parent.assign(name, value);
      return;
    }
    throw new Error(`Undefined variable '${name}'`);
  }

  get(name: string): any {
    if (this.values.has(name)) {
      return this.values.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    throw new Error(`Undefined variable '${name}'`);
  }

  getType(name: string): HamType {
    if (this.types.has(name)) {
      return this.types.get(name)!;
    }
    if (this.parent) {
      return this.parent.getType(name);
    }
    throw new Error(`Undefined variable '${name}'`);
  }
}

export interface EvaluatorOptions {
  onPrint?: (value: any) => void;
  onImport?: (path: string) => Promise<HamNode>;
}
