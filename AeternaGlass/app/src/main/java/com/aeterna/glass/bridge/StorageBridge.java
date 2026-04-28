package com.aeterna.glass.bridge;

import android.util.Log;
import com.aeterna.glass.core.ActionExecutor;
import com.aeterna.glass.core.KineticCommand;
import org.json.JSONArray;
import org.json.JSONObject;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class StorageBridge {
    private static final String TAG = "StorageBridge";
    private static final String BASE_URL = "http://localhost:5000/api/storage"; // Adjust as needed
    private static final String AUTH_TOKEN = "LISA_TOKEN_PLACEHOLDER"; // Should be synced from secrets
    private static boolean running = false;

    public static void start() {
        if (running) return;
        running = true;
        new Thread(new Runnable() {
            @Override
            public void run() {
                while (running) {
                    try {
                        pollCommands();
                    } catch (Exception e) {
                        Log.e(TAG, "Polling error: " + e.getMessage());
                    }
                    try { Thread.sleep(5000); } catch (InterruptedException e) { break; }
                }
            }
        }).start();
    }

    public static void stop() {
        running = false;
    }

    private static void pollCommands() throws Exception {
        URL url = new URL(BASE_URL + "/apk-poll");
        HttpURLConnection conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);

        if (conn.getResponseCode() == 200) {
            BufferedReader in = new BufferedReader(new InputStreamReader(conn.getInputStream()));
            StringBuilder response = new StringBuilder();
            String line;
            while ((line = in.readLine()) != null) response.append(line);
            in.close();

            JSONObject json = new JSONObject(response.toString());
            JSONArray commands = json.getJSONArray("commands");
            for (int i = 0; i < commands.length(); i++) {
                JSONObject cmdJson = commands.getJSONObject(i);
                executeCommand(cmdJson);
            }
        }
    }

    private static void executeCommand(JSONObject json) {
        try {
            String id = json.getString("id");
            String action = json.getString("command");
            JSONObject params = json.optJSONObject("params");

            KineticCommand cmd = new KineticCommand();
            cmd.action = action;
            if (params != null) {
                cmd.path = params.optString("path");
                cmd.content = params.optString("content");
            }

            ActionExecutor.ActionResult result = ActionExecutor.execute(cmd);
            reportResult(id, result);
        } catch (Exception e) {
            Log.e(TAG, "Execute error: " + e.getMessage());
        }
    }

    private static void reportResult(String commandId, ActionExecutor.ActionResult result) {
        try {
            URL url = new URL(BASE_URL + "/write");
            HttpURLConnection conn = (HttpURLConnection) url.openConnection();
            conn.setRequestMethod("POST");
            conn.setRequestProperty("Authorization", "Bearer " + AUTH_TOKEN);
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setDoOutput(true);

            JSONObject report = new JSONObject();
            report.put("path", "logs/apk_result_" + commandId + ".json");
            JSONObject content = new JSONObject();
            content.put("success", result.success);
            content.put("output", result.output);
            content.put("error", result.errorReason);
            report.put("content", content.toString());

            OutputStream os = conn.getOutputStream();
            os.write(report.toString().getBytes());
            os.flush();
            os.close();
            conn.getResponseCode();
        } catch (Exception e) {
            Log.e(TAG, "Report error: " + e.getMessage());
        }
    }
}
