 
/**
 * HAM ENGINE APEX V4.0
 * The Bug-Free Singularity Engine
 * 
 * This module exports the core components of the Ham Engine architecture.
 */

export * from './core/types';
export * from './core/event_bus';
export * from './security/sanitizer';
export * from './memory/graph_rag';
export * from './memory/state_manager';
export * from './engine/ai_worker';
export * from './engine/memory_worker';
export * from './ui/OmniChat';

// Initialize the engine
import { omniEventBus } from './core/event_bus';
import { OmniEventType } from './core/types';

export const initOmniSynapse = async () => {
    // console.log('[Ham Engine] Initializing APEX V4.0 Engine...');
    
    // Dispatch System Ready Event
    await omniEventBus.dispatch({
        id: `sys_ready_${Date.now()}`,
        type: OmniEventType.SYSTEM_READY,
        timestamp: Date.now(),
        payload: { version: '4.0.0' },
        source: 'SYSTEM'
    });
    
    // console.log('[Ham Engine] Engine Ready.');
};
