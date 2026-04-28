const BASE = "/api/autopilot";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const url = `${BASE}${path}`;
  const res = await fetch(url, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error ?? `HTTP ${res.status}`);
  }
  return res.json();
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: "pending" | "running" | "completed" | "failed" | "cancelled";
  agentId?: string;
  agentCodename?: string;
  result?: string;
  filesChanged?: string[];
  durationMs?: number;
  error?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface Log {
  id: number;
  taskId: string;
  level: string;
  message: string;
  agentCodename?: string;
  createdAt: string;
}

export interface MemoryEntry {
  key: string;
  value: string;
  category: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
}

export interface Tool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
  implementation?: string | null;
  enabled: boolean;
  isBuiltin: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

export interface SystemStatus {
  status: string;
  system: {
    workspaceRoot: string;
    model: string;
    maxTokens: number;
    maxToolIterations: number;
    runningTasks: number;
    nodeVersion: string;
    uptime: number;
  };
  tasks: { total: number; running: number; runningIds: string[] };
  memory: { active: number };
  tools: { builtin: number; dynamic: number; total: number };
}

export const api = {
  status: (): Promise<SystemStatus> => request("/status"),

  tasks: {
    list: (): Promise<Task[]> => request("/tasks"),
    get: (id: string): Promise<Task> => request(`/tasks/${id}`),
    create: (data: { title: string; description: string; autoStart?: boolean }): Promise<Task> =>
      request("/tasks", { method: "POST", body: JSON.stringify(data) }),
    start: (id: string): Promise<{ message: string }> =>
      request(`/tasks/${id}/start`, { method: "POST" }),
    cancel: (id: string): Promise<{ message: string }> =>
      request(`/tasks/${id}/cancel`, { method: "POST" }),
    delete: (id: string): Promise<{ message: string }> =>
      request(`/tasks/${id}`, { method: "DELETE" }),
  },

  logs: {
    list: (taskId: string, limit = 500): Promise<Log[]> =>
      request(`/tasks/${taskId}/logs?limit=${limit}`),
    streamUrl: (taskId: string): string =>
      `${BASE}/tasks/${taskId}/logs/stream`,
    globalStreamUrl: (): string => `${BASE}/logs/stream`,
  },

  memory: {
    list: (category?: string): Promise<MemoryEntry[]> =>
      request(`/memory${category ? `?category=${category}` : ""}`),
    get: (key: string): Promise<MemoryEntry> => request(`/memory/${key}`),
    set: (key: string, data: { value: string; category?: string; ttlHours?: number }): Promise<MemoryEntry> =>
      request(`/memory/${key}`, { method: "PUT", body: JSON.stringify(data) }),
    delete: (key: string): Promise<{ message: string }> =>
      request(`/memory/${key}`, { method: "DELETE" }),
    clear: (): Promise<{ message: string }> =>
      request("/memory", { method: "DELETE" }),
  },

  tools: {
    list: (): Promise<Tool[]> => request("/tools"),
    get: (name: string): Promise<Tool> => request(`/tools/${name}`),
    register: (data: { name: string; description: string; inputSchema: Record<string, unknown>; implementation: string }): Promise<Tool> =>
      request("/tools", { method: "POST", body: JSON.stringify(data) }),
    toggle: (name: string, enabled: boolean): Promise<Tool> =>
      request(`/tools/${name}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
    delete: (name: string): Promise<{ message: string }> =>
      request(`/tools/${name}`, { method: "DELETE" }),
  },
};
