package com.aeterna.glass.core;

import android.content.Context;
import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.File;
import java.io.FileInputStream;
import java.io.FileOutputStream;
import java.util.ArrayList;
import java.util.List;

public class PersistentPlanStore {
    private static final String TAG = "PersistentPlanStore";
    private static final String FILE_NAME = "aeterna_plan.json";
    private Context context;

    public PersistentPlanStore(Context context) {
        this.context = context.getApplicationContext();
    }

    public synchronized void save(AgentPlan plan) {
        if (plan == null) return;
        try {
            File file = new File(context.getFilesDir(), FILE_NAME);
            String json = plan.toJson().toString();
            FileOutputStream fos = new FileOutputStream(file);
            fos.write(json.getBytes("UTF-8"));
            fos.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to save plan", e);
        }
    }

    public synchronized AgentPlan load() {
        try {
            File file = new File(context.getFilesDir(), FILE_NAME);
            if (!file.exists()) return null;
            FileInputStream fis = new FileInputStream(file);
            byte[] data = new byte[(int) file.length()];
            fis.read(data);
            fis.close();
            String jsonStr = new String(data, "UTF-8");
            return AgentPlan.fromJson(new JSONObject(jsonStr));
        } catch (Exception e) {
            Log.e(TAG, "Failed to load plan", e);
            return null;
        }
    }

    public synchronized void clear() {
        File file = new File(context.getFilesDir(), FILE_NAME);
        if (file.exists()) file.delete();
    }

    public static class AgentPlan {
        public String goal = "";
        public String status = "IDLE";
        public List<Task> tasks = new ArrayList<>();
        public int currentTaskIndex = 0;
        public JSONArray episodeCache = new JSONArray();

        public JSONObject toJson() throws Exception {
            JSONObject obj = new JSONObject();
            obj.put("goal", goal);
            obj.put("status", status);
            JSONArray tasksArr = new JSONArray();
            for (Task t : tasks) tasksArr.put(t.toJson());
            obj.put("tasks", tasksArr);
            obj.put("current_task_index", currentTaskIndex);
            obj.put("episode_cache", episodeCache != null ? episodeCache : new JSONArray());
            return obj;
        }

        public static AgentPlan fromJson(JSONObject obj) throws Exception {
            AgentPlan plan = new AgentPlan();
            plan.goal = obj.optString("goal", "");
            plan.status = obj.optString("status", "IDLE");
            JSONArray tasksArr = obj.optJSONArray("tasks");
            if (tasksArr != null) {
                for (int i = 0; i < tasksArr.length(); i++) {
                    plan.tasks.add(Task.fromJson(tasksArr.getJSONObject(i)));
                }
            }
            plan.currentTaskIndex = obj.optInt("current_task_index", 0);
            JSONArray ep = obj.optJSONArray("episode_cache");
            plan.episodeCache = ep != null ? ep : new JSONArray();
            return plan;
        }

        public int countDone() {
            int count = 0;
            for (Task t : tasks) if ("DONE".equals(t.status)) count++;
            return count;
        }

        public int countFailed() {
            int count = 0;
            for (Task t : tasks) if ("FAILED".equals(t.status)) count++;
            return count;
        }
    }

    public static class Task {
        public String id = "";
        public String title = "";
        public int currentStep = 0;
        public long timeoutMs = 60000;
        public long startedAt = 0;
        public String status = "PENDING";
        public int retryCount = 0;
        public String verifyType = "";
        public String verifyValue = "";

        public JSONObject toJson() throws Exception {
            JSONObject obj = new JSONObject();
            obj.put("id", id);
            obj.put("title", title);
            obj.put("current_step", currentStep);
            obj.put("timeout_ms", timeoutMs);
            obj.put("started_at", startedAt);
            obj.put("status", status);
            obj.put("retry_count", retryCount);
            if (!verifyType.isEmpty()) obj.put("verify_type", verifyType);
            if (!verifyValue.isEmpty()) obj.put("verify_value", verifyValue);
            return obj;
        }

        public static Task fromJson(JSONObject obj) {
            Task t = new Task();
            t.id = obj.optString("id", "");
            t.title = obj.optString("title", "");
            t.currentStep = obj.optInt("current_step", 0);
            t.timeoutMs = obj.optLong("timeout_ms", 60000);
            t.startedAt = obj.optLong("started_at", 0);
            t.status = obj.optString("status", "PENDING");
            t.retryCount = obj.optInt("retry_count", 0);
            t.verifyType = obj.optString("verify_type", "");
            t.verifyValue = obj.optString("verify_value", "");
            return t;
        }
    }
}
