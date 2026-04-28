/* eslint-disable no-useless-assignment */
import { structuredDb } from '../../db/structuredDb';
import { safeStorage } from '../../utils/storage';

/**
 * AUTO-RESUME MANAGER
 * Part of the Ham Engine Singularity Architecture
 * 
 * Ensures that if the browser tab is closed, reloaded, or crashes,
 * the AI Engine automatically resumes its tasks exactly where it left off
 * the moment the application is reopened.
 */
export class AutoResumeManager {
    static async initialize() {
        // console.log('[AutoResume] Scanning for interrupted tasks...');
        try {
            const projects = await structuredDb.projects.toArray();
            let resumedCount = 0;
            
            for (const proj of projects) {
                // Supreme Protocol: Check safeStorage for engine state
                // This is more reliable than checking the project record manifest
                const engineStateStr = safeStorage.getItem(`ham_op_engine_state_${proj.id}`);
                if (engineStateStr) {
                    try {
                        const engineState = JSON.parse(engineStateStr);
                        if (engineState.status === 'running' || engineState.status === 'thinking') {
                            // console.log(`[AutoResume] Found interrupted project: ${proj.id}. Queueing for resume.`);
                            
                            window.dispatchEvent(new CustomEvent('ham-auto-resume', {
                                detail: { projectId: proj.id, projectData: proj.data, engineState }
                            }));
                            resumedCount++;
                        }
                    } catch (e) {
                        console.error(`[AutoResume] Failed to parse engine state for ${proj.id}`, e);
                    }
                }
            }
            
            if (resumedCount > 0) {
                // console.log(`[AutoResume] Successfully queued ${resumedCount} projects for recovery.`);
            } else {
                // console.log('[AutoResume] No interrupted tasks found.');
            }
        } catch (error) {
            console.error('[AutoResume] Recovery scan failed:', error);
        }
    }
}
