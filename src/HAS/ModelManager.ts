 
import { CLONES } from '../constants/aiClones';
import { useAIHubStore } from '../store/aiHubStore';

export class ModelManager {
    static async installPrimary(
        setProgress?: (p: number) => void,
        setLoadingStatus?: (s: string) => void
    ) {
        if (setLoadingStatus) setLoadingStatus('Initializing all engines concurrently...');
        console.log('[ModelManager] Initializing all engines concurrently...');
        const { setEngineStatus, setActiveClone } = useAIHubStore.getState();
        
        let firstReadySet = false;
        let completedCount = 0;
        const totalClones = CLONES.length;

        const _initPromises = CLONES.map(async (clone) => {
            setEngineStatus(clone.id, 'initializing');
            
            try {
                // Simulate initialization time (random between 1s and 4s)
                const delay = Math.floor(Math.random() * 3000) + 1000;
                await new Promise(resolve => setTimeout(resolve, delay));
                
                // Randomly fail some local models for realism, but keep gemini models mostly stable
                if (clone.provider === 'local' && Math.random() > 0.8) {
                    throw new Error('Failed to load local model');
                }

                setEngineStatus(clone.id, 'ready');
                
                if (!firstReadySet) {
                    firstReadySet = true;
                    setActiveClone(clone);
                    console.log(`[ModelManager] First engine ready: ${clone.name}. Set as default.`);
                }
            } catch (e) {
                console.warn(`[ModelManager] Engine ${clone.name} failed to initialize:`, e);
                setEngineStatus(clone.id, 'error');
            } finally {
                completedCount++;
                if (setProgress) {
                    // Base progress is 20 (from App.tsx), max is 60 (before VFS).
                    // Let's just add a relative progress here, or let App.tsx handle the absolute value.
                    // Actually, App.tsx sets progress to 20 before calling this.
                    // Let's just update the status text with the count.
                    if (setLoadingStatus) {
                        setLoadingStatus(`Initializing Engines: ${completedCount}/${totalClones} (${firstReadySet ? 'Ready' : 'Waiting...'})`);
                    }
                }
            }
        });

        // Wait until at least ONE engine is ready, or all fail, with a 10s safety timeout
        await new Promise<void>((resolve) => {
            const timeout = setTimeout(() => {
                console.warn('[ModelManager] Initialization timed out. Proceeding with degraded mode.');
                resolve();
            }, 10000);

            CLONES.forEach(clone => {
                const checkStatus = setInterval(() => {
                    const status = useAIHubStore.getState().engineStatuses[clone.id];
                    if (status === 'ready' || status === 'error') {
                        if (status === 'ready' || completedCount === totalClones) {
                            clearInterval(checkStatus);
                            clearTimeout(timeout);
                            resolve();
                        }
                    }
                }, 100);
            });
        });

        if (setLoadingStatus) setLoadingStatus('At least one engine is ready. Proceeding...');
        console.log('[ModelManager] At least one engine is ready. Splash screen can proceed.');
    }

    static async installQueue() {
        console.log('[ModelManager] Installing queued models in background...');
        // Simulate background installation
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log('[ModelManager] Queued models installed.');
    }
}
