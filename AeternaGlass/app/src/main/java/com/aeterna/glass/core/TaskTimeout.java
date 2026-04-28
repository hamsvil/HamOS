package com.aeterna.glass.core;

public class TaskTimeout {
    private static final int MAX_RETRIES = 2;

    public static boolean check(PersistentPlanStore.Task task) {
        if (task == null || !task.status.equals("RUNNING")) return false;
        if (task.startedAt <= 0) return false;
        long elapsed = System.currentTimeMillis() - task.startedAt;
        return elapsed > task.timeoutMs;
    }

    public static boolean hasExceededRetries(PersistentPlanStore.Task task) {
        if (task == null) return true;
        return task.retryCount >= MAX_RETRIES;
    }

    public static void resetForRetry(PersistentPlanStore.Task task) {
        if (task != null) {
            task.retryCount++;
            task.startedAt = System.currentTimeMillis();
            task.status = "RUNNING";
        }
    }
}
