package com.aeterna.glass.core;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

public class EpisodicCache {
    private static final String TAG = "EpisodicCache";
    private static final int MAX_ENTRIES = 20;
    private JSONArray cache = new JSONArray();

    public synchronized void add(String actionType, String outcome, int nodeId, String text, String errorReason) {
        try {
            JSONObject entry = new JSONObject();
            entry.put("timestamp", System.currentTimeMillis());
            entry.put("action", actionType);
            entry.put("outcome", outcome);
            if (nodeId >= 0) entry.put("id", nodeId);
            if (text != null && !text.isEmpty()) {
                entry.put("text", text.length() > 60 ? text.substring(0, 60) + "..." : text);
            }
            if (errorReason != null && !errorReason.isEmpty()) {
                entry.put("error", errorReason.length() > 80 ? errorReason.substring(0, 80) + "..." : errorReason);
            }

            cache.put(entry);

            if (cache.length() > MAX_ENTRIES + 5) {
                JSONArray newCache = new JSONArray();
                int start = cache.length() - MAX_ENTRIES;
                for (int i = start; i < cache.length(); i++) {
                    newCache.put(cache.getJSONObject(i));
                }
                cache = newCache;
            }
        } catch (Exception e) {
            Log.e(TAG, "Failed to add entry", e);
        }
    }

    public synchronized String getRecent(int count) {
        StringBuilder sb = new StringBuilder();
        int start = Math.max(0, cache.length() - count);
        for (int i = start; i < cache.length(); i++) {
            try {
                JSONObject obj = cache.getJSONObject(i);
                String outcome = obj.optString("outcome", "?");
                boolean isFail = outcome.equals("FAIL") || outcome.equals("TIMEOUT");
                String prefix = isFail ? "⚠ " : "";
                sb.append(prefix)
                  .append("T-").append(cache.length() - i).append(": ")
                  .append(obj.optString("action", "?"));
                if (obj.has("id")) sb.append("(id=").append(obj.optInt("id")).append(")");
                if (obj.has("text")) sb.append("('").append(obj.optString("text")).append("')");
                sb.append(" ").append(outcome);
                if (obj.has("error")) sb.append(" [ERR:").append(obj.optString("error")).append("]");
                sb.append(" | ");
            } catch (Exception e) {
                Log.e(TAG, "Error reading cache entry", e);
            }
        }
        return sb.toString();
    }

    public synchronized JSONArray getRaw() {
        return cache;
    }

    public synchronized void restore(JSONArray savedCache) {
        if (savedCache != null) {
            this.cache = savedCache;
        }
    }

    public synchronized void clear() {
        this.cache = new JSONArray();
    }

    public synchronized int size() {
        return cache.length();
    }
}
