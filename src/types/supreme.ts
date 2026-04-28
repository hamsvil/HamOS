export type SupremeToolId = 
  | 'ast-surgeon' | 'chronos' | 'shadow-engine' | 'quantum-simulator' 
  | 'chaos-engine' | 'swarm-telepathy' | 'resilience-engine'
  | 'nexus-topology' | 'resource-sentinel' | 'ghost-deduplicator'
  | 'neural-atlas' | 'synapse-vision' | 'sovereign-build';

export interface SupremeToolMetadata {
  id: SupremeToolId;
  name: string;
  pilar: number;
  description: string;
  status: 'active' | 'standby' | 'initializing' | 'error';
  lastActivity: number;
}

export interface ResourceMetrics {
  heapUsed: number;
  heapTotal: number;
  usagePercentage: number;
  cpuLoad: number;
  throttleActive: boolean;
}

export interface TopologyNode {
  id: string;
  path: string;
  imports: string[];
  dependents: string[];
  isCircular: boolean;
  cyclePath?: string[];
}

export interface AtlasKnowledge {
  id: string;
  targetId: string; // File or Function ID
  intent: string;
  consequences: string[];
  timestamp: number;
  author: 'architect' | 'user';
}

export interface BuildSimulationResult {
  success: boolean;
  duration: number;
  warnings: string[];
  errors: string[];
  artifactSize: number;
}
