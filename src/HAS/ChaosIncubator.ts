 
import { SAEREWorkerProxy } from './SAEREWorkerProxy';
import { CircuitMaster } from './CircuitMaster';

export class ChaosIncubator {
    private static interval: any = null;

    static start(intensity: number = 0.1) {
        console.log(`[SAERE] Chaos Incubator started with intensity: ${intensity}`);
        this.interval = setInterval(() => {
            if (Math.random() < intensity) {
                this.injectChaos();
            }
        }, 5000);
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            console.log('[SAERE] Chaos Incubator stopped.');
        }
    }

    private static injectChaos() {
        const chaosTypes = ['NETWORK_TIMEOUT', 'MEMORY_SPIKE', 'API_RATE_LIMIT', 'HMR_LOOP_SIM'];
        const type = chaosTypes[Math.floor(Math.random() * chaosTypes.length)];
        
        console.warn(`[SAERE_CHAOS] Injecting: ${type}`);
        
        switch (type) {
            case 'NETWORK_TIMEOUT':
                SAEREWorkerProxy.sendError('Chaos: Simulated Network Timeout at /api/v1/sync');
                break;
            case 'MEMORY_SPIKE':
                SAEREWorkerProxy.sendPerformanceSample('CHAOS_SPIKE', 5000);
                break;
            case 'API_RATE_LIMIT':
                SAEREWorkerProxy.sendError('Chaos: 429 Too Many Requests from Gemini API');
                break;
            case 'HMR_LOOP_SIM':
                if (import.meta.hot) {
                    console.log('[SAERE_CHAOS] Simulating HMR Loop...');
                    // This triggers the interceptor's protection logic
                }
                break;
        }
    }
}
