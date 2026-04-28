type CircuitState = "closed" | "open" | "half-open";

interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeout: number;
}

interface CircuitData {
  state: CircuitState;
  failures: number;
  lastFailureAt: Date | null;
  nextAttemptAt: Date | null;
}

const circuits = new Map<string, CircuitData>();
const DEFAULT_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeout: 60_000,
};

function getCircuit(slug: string): CircuitData {
  if (!circuits.has(slug)) {
    circuits.set(slug, { state: "closed", failures: 0, lastFailureAt: null, nextAttemptAt: null });
  }
  return circuits.get(slug)!;
}

export function isCircuitOpen(slug: string): boolean {
  const c = getCircuit(slug);
  if (c.state === "open") {
    if (c.nextAttemptAt && Date.now() >= c.nextAttemptAt.getTime()) {
      c.state = "half-open";
      circuits.set(slug, c);
      return false;
    }
    return true;
  }
  return false;
}

export function recordSuccess(slug: string): void {
  const c = getCircuit(slug);
  c.state = "closed";
  c.failures = 0;
  c.lastFailureAt = null;
  c.nextAttemptAt = null;
  circuits.set(slug, c);
}

export function recordFailure(slug: string): void {
  const c = getCircuit(slug);
  c.failures += 1;
  c.lastFailureAt = new Date();
  if (c.failures >= DEFAULT_CONFIG.failureThreshold) {
    c.state = "open";
    c.nextAttemptAt = new Date(Date.now() + DEFAULT_CONFIG.resetTimeout);
  }
  circuits.set(slug, c);
}

export function getAllCircuitStatus() {
  const result: Array<{ slug: string; state: string; failures: number; lastFailureAt: string | null }> = [];
  for (const [slug, data] of circuits.entries()) {
    result.push({
      slug,
      state: data.state,
      failures: data.failures,
      lastFailureAt: data.lastFailureAt?.toISOString() ?? null,
    });
  }
  return result;
}

export function resetCircuit(slug: string): void {
  circuits.set(slug, { state: "closed", failures: 0, lastFailureAt: null, nextAttemptAt: null });
}
