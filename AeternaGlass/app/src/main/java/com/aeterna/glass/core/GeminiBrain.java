package com.aeterna.glass.core;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStream;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class GeminiBrain {
    private static final String TAG = "GeminiBrain";
    private static String currentModel = "gemini-2.5-flash";
    private static final String FALLBACK_MODEL = "gemini-1.5-pro";
    private static final String API_BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
    private static final int MAX_BACKOFF_RETRIES = 3;

    private static final String SYSTEM_PROMPT =
        "You are Aeterna, an autonomous Android AI agent. " +
        "You ALWAYS respond in valid JSON only. No explanations, no markdown, no trailing commas. " +
        "You execute tasks step by step, using accessibility APIs to interact with the Android UI. " +
        "Allowed actions: click, type, scroll, scroll_to, swipe, long_press, go_back, go_home, " +
        "open_recents, open_app, navigate, execute_shell, memorize, forget, wait, assert_visible, done, escalate.";

    public static void setModel(String model) {
        currentModel = model;
    }

    public static boolean hasApiKey() {
        String key = EncryptedKeyStore.getInstance().get("api_key");
        return key != null && !key.trim().isEmpty();
    }

    public static String createMacroPlan(String goal, String uiSnapshot, String ltm) {
        String userContent =
            "GOAL: " + goal + "\n" +
            "INITIAL UI: " + (uiSnapshot.length() > 1500 ? uiSnapshot.substring(0, 1500) : uiSnapshot) + "\n" +
            "LONG TERM MEMORY: " + (ltm != null ? ltm : "none") + "\n\n" +
            "Create a structured multi-step plan as JSON:\n" +
            "{\"tasks\": [{\"id\": \"uuid\", \"title\": \"task name\", \"timeout_ms\": 60000}]}\n" +
            "Decompose the goal into ordered, atomic tasks. Max 10 tasks.";
        return callApiWithConfig(SYSTEM_PROMPT, userContent, currentModel, 0.3, 60000);
    }

    public static String createMicroPlan(String taskTitle, String uiSnapshot, String memory) {
        String userContent =
            "CURRENT TASK: " + taskTitle + "\n" +
            "UI STATE: " + (uiSnapshot.length() > 1500 ? uiSnapshot.substring(0, 1500) : uiSnapshot) + "\n" +
            "RECENT ACTIONS: " + (memory != null ? memory : "none") + "\n\n" +
            "Determine the single NEXT action to take. Respond in JSON only:\n" +
            "{\"action\": \"<action>\", \"id\": <node_id>, \"text\": \"<text>\", " +
            "\"command\": \"<cmd>\", \"url\": \"<url>\", \"package\": \"<pkg>\", " +
            "\"amount\": <scroll_px>, \"wait_ms\": <ms>, \"assert_text\": \"<text>\", " +
            "\"fact\": \"<text_to_memorize>\", \"message\": \"<escalation_message>\"}\n" +
            "Include only fields relevant to the chosen action.";
        return callApiWithConfig(SYSTEM_PROMPT, userContent, currentModel, 0.1, 45000);
    }

    public static String adaptivePatch(String oldPlan, String failedTask, String anomalyDesc, String uiSnapshot) {
        String userContent =
            "PREVIOUS PLAN: " + (oldPlan.length() > 800 ? oldPlan.substring(0, 800) : oldPlan) + "\n" +
            "FAILED TASK: " + failedTask + "\n" +
            "ANOMALY: " + anomalyDesc + "\n" +
            "CURRENT UI: " + (uiSnapshot.length() > 1000 ? uiSnapshot.substring(0, 1000) : uiSnapshot) + "\n\n" +
            "Patch the plan from the failed task onward. Respond with JSON:\n" +
            "{\"tasks\": [{\"id\": \"uuid\", \"title\": \"revised task\", \"timeout_ms\": 60000}]}";
        return callApiWithConfig(SYSTEM_PROMPT, userContent, FALLBACK_MODEL, 0.3, 45000);
    }

    public static String selfHealJson(String brokenJson) {
        String userContent =
            "The following is not valid JSON. Fix it and return ONLY the corrected JSON:\n" + brokenJson;
        return callApiWithConfig(SYSTEM_PROMPT, userContent, currentModel, 0.0, 30000);
    }

    private static String callApiWithConfig(String systemPrompt, String userContent,
                                            String model, double temperature, int readTimeoutMs) {
        String apiKey = EncryptedKeyStore.getInstance().get("api_key");
        if (apiKey == null || apiKey.trim().isEmpty()) {
            return "{\"error\": \"API Key not set. Use 'setkey [KEY]' to configure.\"}";
        }

        for (int attempt = 0; attempt <= MAX_BACKOFF_RETRIES; attempt++) {
            try {
                RateLimiter.getInstance().acquire();
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "{\"error\": \"RateLimiter interrupted\"}";
            }

            HttpURLConnection conn = null;
            try {
                URL url = new URL(API_BASE_URL + model + ":generateContent?key=" + apiKey);
                conn = (HttpURLConnection) url.openConnection();
                conn.setRequestMethod("POST");
                conn.setRequestProperty("Content-Type", "application/json");
                conn.setDoOutput(true);
                conn.setConnectTimeout(15000);
                conn.setReadTimeout(readTimeoutMs);

                JSONObject requestBody = new JSONObject();

                JSONObject sysInstruction = new JSONObject();
                JSONArray sysParts = new JSONArray();
                JSONObject sysText = new JSONObject();
                sysText.put("text", systemPrompt);
                sysParts.put(sysText);
                sysInstruction.put("parts", sysParts);
                requestBody.put("system_instruction", sysInstruction);

                JSONArray contents = new JSONArray();
                JSONObject contentObj = new JSONObject();
                JSONArray parts = new JSONArray();
                JSONObject textPart = new JSONObject();
                textPart.put("text", userContent);
                parts.put(textPart);
                contentObj.put("parts", parts);
                contents.put(contentObj);
                requestBody.put("contents", contents);

                JSONObject genConfig = new JSONObject();
                genConfig.put("temperature", temperature);
                genConfig.put("maxOutputTokens", 2048);
                requestBody.put("generationConfig", genConfig);

                try (OutputStream os = conn.getOutputStream()) {
                    byte[] input = requestBody.toString().getBytes("UTF-8");
                    os.write(input, 0, input.length);
                }

                int responseCode = conn.getResponseCode();

                if (responseCode == 429) {
                    long backoffMs = (long) Math.min(Math.pow(2, attempt + 1) * 2000, 16000);
                    Log.w(TAG, "429 rate limit hit. Backing off " + backoffMs + "ms (attempt " + (attempt + 1) + ")");
                    if (attempt < MAX_BACKOFF_RETRIES) {
                        Thread.sleep(backoffMs);
                        continue;
                    }
                    return "{\"error\": \"Rate limit exceeded after " + MAX_BACKOFF_RETRIES + " retries\"}";
                }

                InputStream is = (responseCode == 200) ? conn.getInputStream() : conn.getErrorStream();
                if (is == null) {
                    return "{\"error\": \"No response stream for code: " + responseCode + "\"}";
                }

                BufferedReader br = new BufferedReader(new InputStreamReader(is, "UTF-8"));
                StringBuilder response = new StringBuilder();
                String line;
                while ((line = br.readLine()) != null) {
                    response.append(line.trim());
                }
                br.close();

                if (responseCode == 200) {
                    JSONObject jsonResp = new JSONObject(response.toString());
                    if (jsonResp.has("candidates") && jsonResp.getJSONArray("candidates").length() > 0) {
                        return jsonResp.getJSONArray("candidates")
                                .getJSONObject(0)
                                .getJSONObject("content")
                                .getJSONArray("parts")
                                .getJSONObject(0)
                                .getString("text");
                    }
                    return "{\"error\": \"No candidates in Gemini response\"}";
                } else {
                    if (attempt < MAX_BACKOFF_RETRIES && !model.equals(FALLBACK_MODEL)) {
                        Log.w(TAG, "Model " + model + " failed (HTTP " + responseCode + "), retrying with fallback");
                        return callApiWithConfig(systemPrompt, userContent, FALLBACK_MODEL, temperature, readTimeoutMs);
                    }
                    return "{\"error\": \"HTTP " + responseCode + "\"}";
                }

            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                return "{\"error\": \"Thread interrupted\"}";
            } catch (Exception e) {
                Log.e(TAG, "API call exception (attempt " + (attempt + 1) + ")", e);
                if (attempt >= MAX_BACKOFF_RETRIES) {
                    return "{\"error\": \"" + e.getMessage().replace("\"", "'") + "\"}";
                }
            } finally {
                if (conn != null) conn.disconnect();
            }
        }
        return "{\"error\": \"All API call attempts failed\"}";
    }
}
