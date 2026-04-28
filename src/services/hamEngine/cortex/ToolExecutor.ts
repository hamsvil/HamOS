/* eslint-disable no-useless-assignment */
import { HamState, ToolResponse, HamToolName } from './types';
import { UniversalToolRunner } from '../../../tools/core/UniversalToolRunner';

export class ToolExecutor {
  constructor(private state: HamState) {}

  public async execute(name: string, args: Record<string, any>, onStep?: (step: any) => void): Promise<ToolResponse> {
    const result = await UniversalToolRunner.run(name, args);
    return {
      name,
      response: result
    };
  }
}
