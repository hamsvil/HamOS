# SYSTEM INDEX: DEPENDENCY MAP (Singularity Engine v7)
**Last Sync:** 2026-04-15T16:58:31.811Z

## Core Architecture (Hexagonal)
- **Primary Entry:** `/src/main.tsx` -> `/src/App.tsx`
- **Engine Core:** `/src/ham-synapse/index.ts`
- **AI Worker:** `/src/ham-synapse/engine/ai.worker.ts`
- **Quantum Service:** `/src/services/hamEngineQuantumService.ts`
- **Proxy Server:** `/server.ts` (The Quantum Proxy v7)

## Module Mapping
- **UI Components:** `/src/components/*`
- **Internal Browser:** `/src/components/InternalBrowser/index.tsx` (Singularity v7)
- **Hooks:** `/src/hooks/*`
- **Services:** `/src/services/*`

## Dependency Tree (Top-Level)
- `App.tsx`
  - `HamAiStudio/index.tsx`
    - `InternalBrowser/index.tsx` (Singularity Engine v7)
  - `TerminalTab.tsx` (Quantum Terminal v21.0)
  - `HamliMemoryTab.tsx` (Memory Core v7)
  - `AIHubTab.tsx` (AI Hub v7)
  - `PrivateSourceTab.tsx` (Private Source v7)
  - `SettingsTab.tsx` (System Settings v7)
  - `ham-synapse/index.ts`
  - `services/vfsService.ts`
  - `services/webcontainerService.ts` (Zombie-Sweeper)

## Ghost-Variable Prevention
- All variables must be declared in `INDEX.md` if they cross module boundaries.
- Current Global State: `ham_ai_mode`, `ham_last_active_project_id`.