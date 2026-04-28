 
interface PerformanceBaseline {
    endpoint: string;
    samples: number[];
    p50: number;
    p95: number;
    lastUpdated: number;
}

export class WorldSimulator {
    private static baselines: Map<string, PerformanceBaseline> = new Map();
    private static readonly MIN_SAMPLES = 20;
    private static readonly ANOMALY_MULTIPLIER = 2.5;

    static observe(endpoint: string, durationMs: number): void {
        if (!this.baselines.has(endpoint)) {
            this.baselines.set(endpoint, { endpoint, samples: [], p50: 0, p95: 0, lastUpdated: Date.now() });
        }
        const baseline = this.baselines.get(endpoint)!;
        baseline.samples.push(durationMs);
        if (baseline.samples.length > 100) baseline.samples.shift();

        if (baseline.samples.length >= this.MIN_SAMPLES) {
            this.updatePercentiles(baseline);
            this.detectAnomaly(baseline, durationMs);
        }
        baseline.lastUpdated = Date.now();
    }

    private static updatePercentiles(baseline: PerformanceBaseline): void {
        const sorted = [...baseline.samples].sort((a, b) => a - b);
        baseline.p50 = sorted[Math.floor(sorted.length * 0.5)];
        baseline.p95 = sorted[Math.floor(sorted.length * 0.95)];
    }

    private static detectAnomaly(baseline: PerformanceBaseline, current: number): void {
        if (baseline.p95 === 0) return;
        if (current > baseline.p95 * this.ANOMALY_MULTIPLIER) {
            const msg = `[WORLD_SIMULATOR] Silent performance anomaly on "${baseline.endpoint}": ${current}ms vs p95 baseline of ${baseline.p95}ms.`;
            if (typeof self !== 'undefined' && 'postMessage' in self) {
                (self as any).postMessage({ type: 'SAERE_LOG', payload: msg });
            }
        }
    }

    static getMetrics(endpoint?: string): PerformanceBaseline[] | PerformanceBaseline | null {
        if (endpoint) return this.baselines.get(endpoint) || null;
        return Array.from(this.baselines.values());
    }
}
