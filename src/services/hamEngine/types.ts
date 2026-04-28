export interface TaskModule {
  id: string;
  name: string;
  path: string;
  description: string;
  dependencies: string[];
  action?: 'create' | 'update' | 'delete' | 'create_tool';
  status: 'pending' | 'in_progress' | 'verified' | 'failed';
  attempts: number;
  lastError?: string;
}

export interface ProjectManifest {
  goal: string;
  strategy?: string;
  modules: TaskModule[];
  contextSummary: string;
  lastKnownGoodState: string | null;
}

export interface EngineState {
  manifestReady: boolean;
  manifest: ProjectManifest;
  currentTaskId: string | null;
  apiLimitRetries?: number;
}
