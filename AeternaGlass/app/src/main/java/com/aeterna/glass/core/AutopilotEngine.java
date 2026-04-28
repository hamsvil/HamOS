package com.aeterna.glass.core;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.util.Log;
import android.webkit.WebView;
import org.json.JSONObject;

import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.locks.LockSupport;

public class AutopilotEngine implements AgentStateMachine.StateChangeListener {
    private static final String TAG = "AutopilotEngine_V10";
    public static AutopilotEngine instance;

    private WebView targetKernel;
    private WebView uiKernel;
    public Context context;

    private AgentStateMachine stateMachine;
    private PersistentPlanStore planStore;
    PersistentPlanStore.AgentPlan currentPlan;
    public EpisodicCache episodicCache;
    public AnomalyDetector anomalyDetector;
    public MemoryManager memoryManager;

    private ExecutorService reflexThread = Executors.newSingleThreadExecutor();
    private ExecutorService cognitiveThread = Executors.newSingleThreadExecutor();

    private static final long REFLEX_INTERVAL_MS = 1000;
    private static final long COGNITIVE_IDLE_SLEEP_MS = 2000;

    public AutopilotEngine(WebView targetKernel, WebView uiKernel) {
        if (instance != null) {
            this.targetKernel = targetKernel;
            this.uiKernel = uiKernel;
            return;
        }
        this.targetKernel = targetKernel;
        this.uiKernel = uiKernel;
        this.context = targetKernel != null ? targetKernel.getContext().getApplicationContext()
                : (uiKernel != null ? uiKernel.getContext().getApplicationContext() : null);

        if (this.context != null) {
            EncryptedKeyStore.init(this.context);
            this.memoryManager = new MemoryManager(this.context);
            this.planStore = new PersistentPlanStore(this.context);
        }

        this.stateMachine = new AgentStateMachine();
        this.stateMachine.setListener(this);
        this.episodicCache = new EpisodicCache();
        this.anomalyDetector = new AnomalyDetector();

        instance = this;

        startReflexEngine();
        startCognitiveEngine();
    }

    public void setApiKey(String key) {
        if (context != null) EncryptedKeyStore.getInstance().save("api_key", key);
    }

    public void setModel(String model) {
        GeminiBrain.setModel(model);
    }

    public String processManualCommand(String prompt) {
        if (prompt == null || prompt.trim().isEmpty()) return "Empty command.";

        String lowerPrompt = prompt.toLowerCase().trim();
        if (lowerPrompt.startsWith("setkey ")) {
            String key = prompt.substring(7).trim().replaceAll("^\\[|\\]$", "");
            setApiKey(key);
            return "API Key tersimpan aman (AES256-GCM).";
        }
        if (lowerPrompt.equals("stop") || lowerPrompt.equals("pause")) {
            stateMachine.dispatch(AgentStateMachine.Event.PAUSE);
            return "Agent paused.";
        }
        if (lowerPrompt.equals("resume")) {
            stateMachine.dispatch(AgentStateMachine.Event.RESUME);
            return "Agent resumed.";
        }
        if (lowerPrompt.equals("status")) {
            return "State: " + stateMachine.getCurrentState().name()
                    + " | Plan: " + (currentPlan != null ? currentPlan.goal : "none")
                    + " | Tasks: " + (currentPlan != null ? currentPlan.currentTaskIndex + "/" + currentPlan.tasks.size() : "0/0")
                    + " | LTM: " + (memoryManager != null ? memoryManager.getEntryCount() + " entries" : "N/A");
        }
        if (lowerPrompt.equals("clearltm")) {
            if (memoryManager != null) memoryManager.clearAll();
            return "Long-term memory cleared.";
        }
        if (lowerPrompt.startsWith("setmodel ")) {
            String model = prompt.substring(9).trim();
            setModel(model);
            return "Model set to: " + model;
        }

        if (!GeminiBrain.hasApiKey()) {
            return "ERROR: API Key belum diatur. Ketik 'setkey [YOUR_KEY]' terlebih dahulu.";
        }

        currentPlan = new PersistentPlanStore.AgentPlan();
        currentPlan.goal = prompt.trim();
        currentPlan.status = "RUNNING";
        stateMachine.dispatch(AgentStateMachine.Event.START_GOAL);
        return "Goal diterima. Agent mulai planning...";
    }

    public void injectNotificationMemory(String text) {
        if (episodicCache != null) episodicCache.add("NOTIFICATION", "RECEIVED", -1, text, "");
        if (currentPlan != null && text != null) {
            String goal = currentPlan.goal.toLowerCase();
            String lowerText = text.toLowerCase();
            if (lowerText.contains(goal.substring(0, Math.min(goal.length(), 20)))) {
                sendPublicLogToUI("NOTIFICATION relevante: " + text);
            }
        }
    }

    public void resumeFromPlan(PersistentPlanStore.AgentPlan plan) {
        if (plan != null && "RUNNING".equals(plan.status)) {
            this.currentPlan = plan;
            if (plan.episodeCache != null) episodicCache.restore(plan.episodeCache);
            stateMachine.dispatch(AgentStateMachine.Event.RESUME);
            sendPublicLogToUI("Melanjutkan rencana: " + plan.goal);
        }
    }

    @Override
    public void onStateChanged(AgentStateMachine.State oldState, AgentStateMachine.State newState,
                               AgentStateMachine.Event triggerEvent) {
        sendPublicLogToUI("STATE: " + newState.name());
        FloatingAIService.updateStatus(newState.name(), currentPlan);
        if (newState == AgentStateMachine.State.DONE && context != null && currentPlan != null) {
            currentPlan.status = "DONE";
            if (planStore != null) planStore.save(currentPlan);
            SessionExporter.export(context, currentPlan, episodicCache);
        }
    }

    private void startReflexEngine() {
        reflexThread.execute(new Runnable() {
            @Override
            public void run() {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        Thread.sleep(REFLEX_INTERVAL_MS);
                        AgentStateMachine.State state = stateMachine.getCurrentState();
                        if (state != AgentStateMachine.State.EXECUTING) continue;

                        String snapshot = "";
                        if (AeternaAccessibilityService.instance != null) {
                            snapshot = AeternaAccessibilityService.instance.captureUITreeFast();
                        }

                        String anomaly = anomalyDetector.check(snapshot);
                        if (anomaly != null) {
                            sendPublicLogToUI("ANOMALY: " + anomaly);
                            episodicCache.add("ANOMALY", "DETECTED", -1, anomaly, "");
                            stateMachine.dispatch(AgentStateMachine.Event.ANOMALY_DETECTED);
                        }

                        if (currentPlan != null && currentPlan.currentTaskIndex < currentPlan.tasks.size()) {
                            PersistentPlanStore.Task task = currentPlan.tasks.get(currentPlan.currentTaskIndex);
                            if (TaskTimeout.check(task)) {
                                sendPublicLogToUI("TIMEOUT: " + task.title);
                                stateMachine.dispatch(AgentStateMachine.Event.TIMEOUT_REACHED);
                            }
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    }
                }
            }
        });
    }

    private void startCognitiveEngine() {
        cognitiveThread.execute(new Runnable() {
            @Override
            public void run() {
                while (!Thread.currentThread().isInterrupted()) {
                    try {
                        AgentStateMachine.State state = stateMachine.getCurrentState();

                        switch (state) {
                            case PLANNING:
                                runPlanning();
                                break;
                            case EXECUTING:
                                runExecution();
                                break;
                            case INTERRUPTED:
                                runAdaptiveReplan();
                                break;
                            case TASK_TIMEOUT:
                                handleTaskTimeout();
                                break;
                            case FATAL_ERROR:
                                sendPublicLogToUI("FATAL ERROR: Agent berhenti. Periksa API Key dan koneksi.");
                                Thread.sleep(10000);
                                break;
                            default:
                                Thread.sleep(COGNITIVE_IDLE_SLEEP_MS);
                                break;
                        }
                    } catch (InterruptedException e) {
                        Thread.currentThread().interrupt();
                        break;
                    } catch (Exception e) {
                        Log.e(TAG, "Cognitive loop error", e);
                        sendPublicLogToUI("ERROR: " + e.getMessage());
                        stateMachine.dispatch(AgentStateMachine.Event.ERROR);
                        try { Thread.sleep(3000); } catch (InterruptedException ie) { Thread.currentThread().interrupt(); break; }
                    }
                }
            }
        });
    }

    private void runPlanning() throws Exception {
        String snapshot = captureCompressed();
        String ltm = memoryManager != null ? memoryManager.getMemoryString() : "";

        sendPublicLogToUI("Planning: " + currentPlan.goal);
        RateLimiter.getInstance().acquire();
        String response = GeminiBrain.createMacroPlan(currentPlan.goal, snapshot, ltm);

        if (response.contains("\"error\":")) {
            sendPublicLogToUI("Gagal planning: " + response);
            stateMachine.dispatch(AgentStateMachine.Event.ERROR);
            return;
        }

        currentPlan = HierarchicalPlanner.parseMacroPlan(currentPlan.goal, response);
        if (currentPlan.tasks.isEmpty()) {
            sendPublicLogToUI("ERROR: Rencana kosong dari AI.");
            stateMachine.dispatch(AgentStateMachine.Event.ERROR);
            return;
        }

        if (planStore != null) planStore.save(currentPlan);
        sendPublicLogToUI("Rencana dibuat: " + currentPlan.tasks.size() + " task");
        stateMachine.dispatch(AgentStateMachine.Event.PLAN_READY);
    }

    private void runExecution() throws Exception {
        if (currentPlan == null || currentPlan.currentTaskIndex >= currentPlan.tasks.size()) {
            stateMachine.dispatch(AgentStateMachine.Event.ALL_TASKS_DONE);
            return;
        }

        PersistentPlanStore.Task task = currentPlan.tasks.get(currentPlan.currentTaskIndex);
        if ("PENDING".equals(task.status)) {
            task.status = "RUNNING";
            task.startedAt = System.currentTimeMillis();
            if (planStore != null) planStore.save(currentPlan);
        }

        String snapshot = captureCompressed();
        String memory = episodicCache.getRecent(10);

        sendPublicLogToUI("Executing [" + (currentPlan.currentTaskIndex + 1) + "/"
                + currentPlan.tasks.size() + "]: " + task.title);

        RateLimiter.getInstance().acquire();
        String response = GeminiBrain.createMicroPlan(task.title, snapshot, memory);

        if (response.contains("\"error\":")) {
            sendPublicLogToUI("AI Error: " + response);
            episodicCache.add("AI_CALL", "FAIL", -1, "", response);
            Thread.sleep(3000);
            return;
        }

        try {
            JSONObject aiJson = ChainOfThoughtParser.validateAndParse(response);
            String action = aiJson.optString("action", "");

            KineticCommand cmd = new KineticCommand(action, aiJson.optInt("id", -1), false);
            cmd.text = aiJson.optString("text", "");
            cmd.url = aiJson.optString("url", "");
            cmd.command = aiJson.optString("command", "");
            cmd.direction = aiJson.optInt("direction", 0);
            cmd.packageName = aiJson.optString("package", "");
            cmd.amount = aiJson.optInt("amount", 0);
            cmd.waitMs = aiJson.optLong("wait_ms", 0);
            cmd.assertText = aiJson.optString("assert_text", "");
            cmd.fact = aiJson.optString("fact", "");
            cmd.memoryId = aiJson.optString("memory_id", "");
            cmd.message = aiJson.optString("message", "");
            cmd.x = aiJson.optInt("x", -1);
            cmd.y = aiJson.optInt("y", -1);

            if ("done".equals(action)) {
                boolean verified = LongTaskProgressTracker.verifyOutcome(
                        task.verifyType.isEmpty() ? aiJson.optString("verify_type", "") : task.verifyType,
                        task.verifyValue.isEmpty() ? aiJson.optString("verify_value", "") : task.verifyValue,
                        snapshot);
                if (verified || task.verifyType.isEmpty()) {
                    task.status = "DONE";
                    currentPlan.currentTaskIndex++;
                    if (planStore != null) planStore.save(currentPlan);
                    stateMachine.dispatch(AgentStateMachine.Event.STEP_DONE);
                    sendPublicLogToUI("Task selesai: " + task.title);
                } else {
                    sendPublicLogToUI("Verifikasi gagal untuk: " + task.title);
                    episodicCache.add("VERIFY", "FAIL", -1, task.title, "Outcome not found on screen");
                }
            } else {
                ActionExecutor.ActionResult result = ActionExecutor.execute(cmd);
                episodicCache.add(action, result.success ? "SUCCESS" : "FAIL",
                        cmd.id, cmd.text, result.errorReason);
                currentPlan.episodeCache = episodicCache.getRaw();
                if (planStore != null) planStore.save(currentPlan);
                if (!result.success) {
                    sendPublicLogToUI("Aksi gagal: " + action + " | " + result.errorReason);
                } else {
                    sendPublicLogToUI("Aksi sukses: " + action);
                }
            }
        } catch (Exception parseEx) {
            Log.e(TAG, "Parse/execution error", parseEx);
            episodicCache.add("PARSE", "FAIL", -1, "", parseEx.getMessage());
            sendPublicLogToUI("Parse error: " + parseEx.getMessage());
        }
    }

    private void runAdaptiveReplan() throws Exception {
        if (currentPlan == null) {
            stateMachine.dispatch(AgentStateMachine.Event.ERROR);
            return;
        }
        String snapshot = captureCompressed();
        String failedTask = currentPlan.currentTaskIndex < currentPlan.tasks.size()
                ? currentPlan.tasks.get(currentPlan.currentTaskIndex).title : "unknown";
        sendPublicLogToUI("Re-planning dari task: " + failedTask);
        RateLimiter.getInstance().acquire();
        try {
            String patch = GeminiBrain.adaptivePatch(
                    currentPlan.toJson().toString(), failedTask, "Anomaly detected", snapshot);
            HierarchicalPlanner.applyPatch(currentPlan, patch);
            if (planStore != null) planStore.save(currentPlan);
        } catch (Exception e) {
            Log.e(TAG, "Adaptive patch failed", e);
        }
        stateMachine.dispatch(AgentStateMachine.Event.REPLAN_DONE);
    }

    private void handleTaskTimeout() throws Exception {
        if (currentPlan == null || currentPlan.currentTaskIndex >= currentPlan.tasks.size()) {
            stateMachine.dispatch(AgentStateMachine.Event.ERROR);
            return;
        }
        PersistentPlanStore.Task task = currentPlan.tasks.get(currentPlan.currentTaskIndex);
        episodicCache.add("TIMEOUT", "TIMEOUT", -1, task.title, "Task exceeded timeout");

        if (TaskTimeout.hasExceededRetries(task)) {
            sendPublicLogToUI("Task FAILED (max retries): " + task.title);
            task.status = "FAILED";
            currentPlan.currentTaskIndex++;
            if (currentPlan.currentTaskIndex >= currentPlan.tasks.size()) {
                stateMachine.dispatch(AgentStateMachine.Event.ALL_TASKS_DONE);
            } else {
                stateMachine.dispatch(AgentStateMachine.Event.REPLAN_DONE);
            }
        } else {
            sendPublicLogToUI("Task TIMEOUT, retry " + (task.retryCount + 1) + ": " + task.title);
            TaskTimeout.resetForRetry(task);
            if (planStore != null) planStore.save(currentPlan);
            stateMachine.dispatch(AgentStateMachine.Event.REPLAN_DONE);
        }
    }

    private String captureCompressed() {
        String snapshot = "";
        if (AeternaAccessibilityService.instance != null) {
            snapshot = AeternaAccessibilityService.instance.captureUITreeFast();
        }
        return ContextCompressor.compress(snapshot);
    }

    public void sendPublicLogToUI(final String message) {
        final String safeMsg = message.replace("'", "\\'").replace("\n", " ").replace("\"", "\\\"");
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (uiKernel != null) {
                    uiKernel.evaluateJavascript(
                            "javascript:if(window.appendMessage) appendMessage('AGENT: " + safeMsg + "', 'ai');", null);
                }
            }
        });
        Log.d(TAG, message);
    }

    public AgentStateMachine.State getCurrentState() {
        return stateMachine != null ? stateMachine.getCurrentState() : AgentStateMachine.State.IDLE;
    }

    public String getStatusString() {
        if (currentPlan == null) return getCurrentState().name() + " | No active plan";
        return getCurrentState().name()
                + " | Task " + (currentPlan.currentTaskIndex + 1) + "/" + currentPlan.tasks.size()
                + (currentPlan.currentTaskIndex < currentPlan.tasks.size()
                    ? ": " + currentPlan.tasks.get(currentPlan.currentTaskIndex).title : ": done")
                + " | LTM: " + (memoryManager != null ? memoryManager.getEntryCount() : 0) + " entries";
    }
}
