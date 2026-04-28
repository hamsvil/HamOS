import * as fs from 'fs';
import * as path from 'path';

export interface VerificationDetail {
  test: string;
  status: 'passed' | 'failed';
  message?: string;
}

export interface VerificationResult {
  passed: boolean;
  failed: number;
  details: VerificationDetail[];
  domCheck?: boolean;
  lisaStatusCheck?: boolean;
}

const LOG_PATH = path.resolve(process.cwd(), '.lisa/VERIFICATION_LOG.jsonl');

export class SelfVerifier {
  public async runVerification(): Promise<VerificationResult> {
    const details: VerificationDetail[] = [];
    const port = process.env.PORT || 3000;
    const baseUrl = `http://localhost:${port}`;
    let domCheckResult = false;
    let lisaStatusCheckResult = false;

    // Test 1: Health Check
    try {
      const start = Date.now();
      const res = await fetch(`${baseUrl}/api/health`);
      const duration = Date.now() - start;
      const data = await res.json();
      
      if (res.ok && data.status === 'ok') {
        details.push({ test: 'Health Check', status: 'passed' });
      } else {
        details.push({ test: 'Health Check', status: 'failed', message: `Status: ${res.status}, Body: ${JSON.stringify(data)}` });
      }

      // Test 4: Response Time
      if (duration < 2000) {
        details.push({ test: 'Response Time', status: 'passed' });
      } else {
        details.push({ test: 'Response Time', status: 'failed', message: `Time: ${duration}ms` });
      }

      // Test 3: Headers
      const coop = res.headers.get('cross-origin-opener-policy');
      const coep = res.headers.get('cross-origin-embedder-policy');
      if (coop === 'same-origin' && coep === 'require-corp') {
        details.push({ test: 'COOP/COEP Headers', status: 'passed' });
      } else {
        details.push({ test: 'COOP/COEP Headers', status: 'failed', message: `COOP: ${coop}, COEP: ${coep}` });
      }

    } catch (e: any) {
      details.push({ test: 'API Connection', status: 'failed', message: e.message });
    }

    // Test 2: Lisa Status
    try {
      const res = await fetch(`${baseUrl}/api/lisa/status`);
      if (res.ok) {
        const data = await res.json();
        if (data && (data.uptime !== undefined || data.health !== undefined)) {
          lisaStatusCheckResult = true;
          details.push({ test: 'Lisa Status API Content', status: 'passed' });
        } else {
          details.push({ test: 'Lisa Status API Content', status: 'failed', message: 'Missing uptime or health field' });
        }
        details.push({ test: 'Lisa Status API', status: 'passed' });
      } else {
        details.push({ test: 'Lisa Status API', status: 'failed', message: `Status: ${res.status}` });
      }
    } catch (e: any) {
      // It's okay if this doesn't exist yet, but we log it
      details.push({ test: 'Lisa Status API', status: 'failed', message: e.message });
    }

    // Test 5: DOM Presence Check
    try {
      const res = await fetch(`${baseUrl}/`);
      if (res.ok) {
        const html = await res.text();
        if (html.includes('HAM') || html.includes('Hamli') || html.includes('<div')) {
          domCheckResult = true;
          details.push({ test: 'DOM Presence Check', status: 'passed' });
        } else {
          details.push({ test: 'DOM Presence Check', status: 'failed', message: 'Basic DOM elements or HAM/Hamli not found' });
        }
      } else {
        details.push({ test: 'DOM Presence Check', status: 'failed', message: `Status: ${res.status}` });
      }
    } catch (e: any) {
      details.push({ test: 'DOM Presence Check', status: 'failed', message: e.message });
    }

    const failedCount = details.filter(d => d.status === 'failed').length;
    const result: VerificationResult = {
      passed: failedCount === 0,
      failed: failedCount,
      details,
      domCheck: domCheckResult,
      lisaStatusCheck: lisaStatusCheckResult
    };

    fs.appendFileSync(LOG_PATH, JSON.stringify({ timestamp: new Date().toISOString(), ...result }) + '\n');
    return result;
  }
}

export const selfVerifier = new SelfVerifier();
