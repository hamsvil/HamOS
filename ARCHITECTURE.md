# Ham AiStudio Architecture

## Engine Overview
The system consists of 23 specialized engines working in a swarm configuration.

```mermaid
graph TD
    User((User)) --> App[Ham OS Shell]
    App --> IDE[Ham AiStudio IDE]
    App --> AIHub[AI Hub]
    App --> Swarm[Swarm Orchestrator]
    
    subgraph Engines
        E1[Quantum Engine]
        E2[Neural Engine]
        E3[Cortex]
        E4[Synapse]
    end
    
    Swarm --> Engines
    IDE --> VFS[Virtual File System]
    Engines --> VFS
```

## Data Flow
State is persisted via a Centralized State Bridge with local-first sync and cloud replication.
