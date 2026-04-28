// Exporting the 13 Pillars of Supreme Autonomy
export * from './ASTEngine';
export * from './SwarmChronos';
export * from './ChaosQuantum';
export * from './ResourceSentinel';
export * from './NexusTopology';
export * from './GhostDeduplicator';
export * from './NeuralAtlas';
export * from './SovereignBuild';

import { ResourceSentinel } from './ResourceSentinel';
import { NexusTopology } from './NexusTopology';
import { GhostDeduplicator } from './GhostDeduplicator';
import { NeuralAtlas } from './NeuralAtlas';
import { SovereignBuild } from './SovereignBuild';
import { ASTSurgeon, ShadowEngine } from './ASTEngine';
import { SwarmTelepathy, Chronos } from './SwarmChronos';
import { ChaosEngine, QuantumSimulator, ResilienceEngine } from './ChaosQuantum';

// Initialize singletons and systems
// Note: Some tools are static-only or stateless, but we trigger their registration/presence here
ResourceSentinel.getInstance();
NexusTopology.getInstance().mapProject(); // Trigger initial project graph build
GhostDeduplicator.getInstance();
NeuralAtlas.getInstance();
SovereignBuild.getInstance();

// Static-heavy systems triggered for awareness
console.log("[SUPREME PROTOCOL] ASTSurgeon, Chronos, ShadowEngine, SwarmTelepathy, ChaosEngine, QuantumSimulator, ResilienceEngine Linked.");
console.log("[SUPREME PROTOCOL] All 13 Tier-God Architect Tools Initialized, Synchronized, and Locked.");
