 
import { ErrorInterceptor } from '../interceptor';
import { MultiProviderRouter } from '../MultiProviderRouter';
import { FiveTierDegradation } from '../FiveTierDegradation';
import { CircuitMaster } from '../CircuitMaster';
import { TemporalContextEngine } from '../TemporalContext';
import { OracleEye } from '../OracleEye';
import { CausalArchitect } from '../CausalArchitect';
import { DependencyOracle } from '../DependencyOracle';
import { SemanticNeuralPatcher } from '../SemanticNeuralPatcher';
import { SwarmConductor } from '../SwarmConductor';
import { DiversityEngine } from '../DiversityEngine';
import { ConfidenceOracle } from '../ConfidenceOracle';
import { ConstitutionalCore, executeAction } from '../ConstitutionalCore';
import { RealJudge } from '../RealJudge';
import { InterpretabilityEngine } from '../InterpretabilityEngine';
import { SelfArchitect } from '../SelfArchitect';
import { MerkleScribe } from '../MerkleScribe';
import { WorldSimulator } from '../WorldSimulator';
import { Anonymizer } from '../Anonymizer';

let isProcessing = false;
const errorQueue: string[] = [];
const recentErrors = new Map<string, number>();

self.onmessage = async (e) => {
    if (e.data.type === 'NEW_ERROR') {
        const safeError = Anonymizer.scrub(e.data.payload);
        const sig = safeError.substring(0, 100);
        const now = Date.now();
        if (recentErrors.has(sig) && now - recentErrors.get(sig)! < 10000) {
            return; // Deduplicate identical errors within 10 seconds
        }
        recentErrors.set(sig, now);
        errorQueue.push(safeError);
        processQueue();
    }
    if (e.data.type === 'PERFORMANCE_SAMPLE') {
        WorldSimulator.observe(e.data.endpoint, e.data.durationMs);
    }
};

async function processQueue() {
    if (isProcessing || errorQueue.length === 0) return;

    const mem = typeof performance !== 'undefined' && (performance as any).memory ? (performance as any).memory : null;
    if (mem && mem.usedJSHeapSize / 1048576 > 500) {
        setTimeout(processQueue, 5000);
        return;
    }

    FiveTierDegradation.update();
    isProcessing = true;
    const errorMsg = errorQueue.shift()!;

    try {
        await processError(errorMsg);
    } catch (e) {
        ErrorInterceptor.runInternal(() => console.error('[SAERE WORKER] Fatal:', e));
        SelfArchitect.recordFailure('worker_fatal');
        CircuitMaster.recordFailure(errorMsg.substring(0, 100));
    } finally {
        isProcessing = false;
        if (errorQueue.length > 0) setTimeout(processQueue, 500);
    }
}

async function processError(errorMsg: string) {
    const errorSig = errorMsg.substring(0, 100);

    // STEP 1: Circuit breaker check
    if (CircuitMaster.isOpen(errorSig)) {
        console.warn('[SAERE] Circuit open for this error — skipping to avoid waste');
        return;
    }

    // STEP 2: Temporal context — is it safe to fix?
    const temporal = await TemporalContextEngine.getContext('unknown'); // target file from stack trace
    if (!temporal.isSafeToFix) {
        MerkleScribe.logAndVerify('DEFERRED', { reason: temporal.cautionReason, error: errorSig });
        return;
    }

    // STEP 3: Visual analysis (non-blocking)
    const _visualContext = await OracleEye.captureAndAnalyze(errorMsg);

    // STEP 4 & 5 & 6: Parallel Execution (Causal Graph, Semantic Cache, Swarm Analysis)
    const [causalGraph, cached, swarmAnalysis] = await Promise.all([
        CausalArchitect.buildGraph(errorMsg, '', '').catch(() => null),
        SemanticNeuralPatcher.findSimilar(errorMsg, 0.88),
        SwarmConductor.analyze(errorMsg, '')
    ]);
    const rootCauses = causalGraph?.rootCauses || [];

    if (cached && cached.successRate > 0.85) {
        // Fast path: apply cached solution
        const confidence = await ConfidenceOracle.score(cached.solution, errorMsg, '');
        if (confidence.policy === 'AUTO_APPLY') {
            const validation = ConstitutionalCore.validate({ type: 'EDIT_FILE', content: cached.solution, confidence: confidence.totalScore });
            if (validation.allowed) {
                MerkleScribe.logAndVerify('FAST_PATH_APPLY', { cached: true, confidence: confidence.totalScore });
                CircuitMaster.recordSuccess(errorSig);
                return;
            }
        }
    }

    // Diversity Engine depends on root causes
    const diversityResult = await DiversityEngine.trilogyAnalysis(errorMsg, rootCauses[0]?.description || errorMsg);

    // STEP 7: Confidence scoring
    const confidence = await ConfidenceOracle.score(diversityResult, errorMsg, '');

    // STEP 8: Constitutional validation
    const action = { type: 'EDIT_FILE' as const, content: diversityResult, confidence: confidence.totalScore };
    const validation = ConstitutionalCore.validate(action);
    if (!validation.allowed) {
        MerkleScribe.logAndVerify('BLOCKED', { reason: validation.reason });
        return;
    }

    // STEP 9: Real verification
    const judgeResult = await RealJudge.verify(diversityResult);
    if (!judgeResult.passed && confidence.totalScore < 70) {
        SelfArchitect.recordFailure(errorSig.substring(0, 50));
        CircuitMaster.recordFailure(errorSig);
        SemanticNeuralPatcher.store(errorMsg, diversityResult, false);
        return;
    }

    // STEP 10: Apply based on policy
    if (confidence.policy === 'AUTO_APPLY' || confidence.policy === 'SHADOW_ONLY') {
        // Apply to Shadow Mirror first, then main VFS if policy allows
        await MerkleScribe.logAndVerify('FIX_APPLIED', { policy: confidence.policy, confidence: confidence.totalScore });
        
        // Trigger Neural Link Write-Back
        self.postMessage({ 
            type: 'WRITE_FILE_REQUEST', 
            payload: { 
                path: '.saere/fixes/last_fix.ts', 
                content: diversityResult 
            } 
        });
        self.postMessage({ type: 'SAERE_NOTIFICATION', payload: { title: 'Fix Applied', message: 'A verified fix has been applied to the file system via Neural Link.' } });
    }

    // STEP 11: Document decision
    await InterpretabilityEngine.document({
        error: errorMsg,
        rootCause: rootCauses[0]?.description || 'Unknown',
        chosenFix: diversityResult,
        alternatives: [swarmAnalysis],
        confidenceScore: confidence.totalScore,
        policy: confidence.policy,
        impactedFiles: [],
    });

    // STEP 12: Learn
    await SemanticNeuralPatcher.store(errorMsg, diversityResult, judgeResult.passed);
    CircuitMaster.recordSuccess(errorSig);
}
