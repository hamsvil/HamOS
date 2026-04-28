package com.aeterna.glass.core;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.util.UUID;

public class HierarchicalPlanner {
    private static final String TAG = "HierarchicalPlanner";

    public static PersistentPlanStore.AgentPlan createMacroPlan(String goal, String uiSnapshot, String ltm) {
        String response = GeminiBrain.createMacroPlan(goal, uiSnapshot, ltm);
        return parseMacroPlan(goal, response);
    }

    public static PersistentPlanStore.AgentPlan parseMacroPlan(String goal, String response) {
        PersistentPlanStore.AgentPlan plan = new PersistentPlanStore.AgentPlan();
        plan.goal = goal;
        plan.status = "RUNNING";

        try {
            String cleaned = ChainOfThoughtParser.cleanJson(response);
            JSONArray tasksArr = null;

            if (cleaned.startsWith("[")) {
                tasksArr = new JSONArray(cleaned);
            } else {
                JSONObject obj = new JSONObject(cleaned);
                tasksArr = obj.optJSONArray("tasks");
            }

            if (tasksArr != null) {
                for (int i = 0; i < tasksArr.length(); i++) {
                    JSONObject tObj = tasksArr.getJSONObject(i);
                    PersistentPlanStore.Task task = new PersistentPlanStore.Task();
                    task.id = tObj.optString("id", UUID.randomUUID().toString());
                    task.title = tObj.optString("title", "Task " + (i + 1));
                    task.timeoutMs = tObj.optLong("timeout_ms", 60000);
                    task.status = "PENDING";
                    task.verifyType = tObj.optString("verify_type", "");
                    task.verifyValue = tObj.optString("verify_value", "");
                    plan.tasks.add(task);
                }
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to parse macro plan, creating single-task fallback: " + e.getMessage());
            PersistentPlanStore.Task task = new PersistentPlanStore.Task();
            task.id = UUID.randomUUID().toString();
            task.title = "Execute goal: " + goal;
            task.timeoutMs = 120000;
            plan.tasks.add(task);
        }
        return plan;
    }

    public static String createMicroPlan(String taskTitle, String uiSnapshot, String memory) {
        return GeminiBrain.createMicroPlan(taskTitle, uiSnapshot, memory);
    }

    public static String adaptivePatch(String oldPlanStr, String failedTask, String anomalyDesc, String uiSnapshot) {
        return GeminiBrain.adaptivePatch(oldPlanStr, failedTask, anomalyDesc, uiSnapshot);
    }

    public static void applyPatch(PersistentPlanStore.AgentPlan plan, String patchResponse) {
        try {
            String cleaned = ChainOfThoughtParser.cleanJson(patchResponse);
            JSONArray newTasks = null;
            if (cleaned.startsWith("[")) {
                newTasks = new JSONArray(cleaned);
            } else {
                newTasks = new JSONObject(cleaned).optJSONArray("tasks");
            }
            if (newTasks != null && newTasks.length() > 0) {
                int resumeIndex = plan.currentTaskIndex;
                while (plan.tasks.size() > resumeIndex) {
                    plan.tasks.remove(plan.tasks.size() - 1);
                }
                for (int i = 0; i < newTasks.length(); i++) {
                    JSONObject tObj = newTasks.getJSONObject(i);
                    PersistentPlanStore.Task task = new PersistentPlanStore.Task();
                    task.id = tObj.optString("id", UUID.randomUUID().toString());
                    task.title = tObj.optString("title", "Patched Task " + (i + 1));
                    task.timeoutMs = tObj.optLong("timeout_ms", 60000);
                    task.status = "PENDING";
                    plan.tasks.add(task);
                }
                Log.d(TAG, "Patch applied: " + newTasks.length() + " new tasks from index " + resumeIndex);
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to apply adaptive patch: " + e.getMessage());
        }
    }
}
