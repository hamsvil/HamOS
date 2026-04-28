package com.aeterna.glass.core;

import android.util.Log;
import org.json.JSONArray;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;

public class ContextCompressor {
    private static final String TAG = "ContextCompressor";
    private static final int MAX_NODES = 50;
    private static final int MAX_NODE_TEXT_LENGTH = 80;
    private static final int TARGET_MAX_CHARS = 2000;

    public static String compress(String uiSnapshot) {
        if (uiSnapshot == null || uiSnapshot.isEmpty() || uiSnapshot.equals("[]")) return "[]";
        try {
            JSONArray arr = new JSONArray(uiSnapshot);
            List<JSONObject> interactive = new ArrayList<>();
            List<JSONObject> withText = new ArrayList<>();
            List<JSONObject> others = new ArrayList<>();

            for (int i = 0; i < arr.length(); i++) {
                JSONObject obj = arr.getJSONObject(i);
                String cls = obj.optString("class", "");
                String text = obj.optString("text", "");
                boolean isInteractive = cls.contains("Button") || cls.contains("EditText")
                        || cls.contains("CheckBox") || cls.contains("Switch")
                        || cls.contains("RadioButton") || cls.contains("Spinner")
                        || obj.optBoolean("clickable", false);
                boolean hasText = !text.isEmpty();

                JSONObject compressed = new JSONObject();
                compressed.put("id", obj.optInt("id"));
                if (hasText) {
                    String truncText = text.length() > MAX_NODE_TEXT_LENGTH
                            ? text.substring(0, MAX_NODE_TEXT_LENGTH) + "..." : text;
                    compressed.put("t", truncText);
                }
                if (!cls.isEmpty()) {
                    String shortCls = cls.contains(".") ? cls.substring(cls.lastIndexOf('.') + 1) : cls;
                    if (isInteractive) compressed.put("c", shortCls);
                }
                if (obj.has("bounds")) {
                    String bounds = obj.optString("bounds", "");
                    if (!bounds.isEmpty()) compressed.put("b", bounds);
                }

                if (isInteractive) {
                    interactive.add(compressed);
                } else if (hasText) {
                    withText.add(compressed);
                } else {
                    others.add(compressed);
                }
            }

            JSONArray result = new JSONArray();
            for (JSONObject o : interactive) { result.put(o); if (result.length() >= MAX_NODES) break; }
            for (JSONObject o : withText) { if (result.length() >= MAX_NODES) break; result.put(o); }
            for (JSONObject o : others) { if (result.length() >= MAX_NODES) break; result.put(o); }

            String out = result.toString();
            if (out.length() > TARGET_MAX_CHARS) {
                JSONArray trimmed = new JSONArray();
                int chars = 0;
                for (int i = 0; i < result.length(); i++) {
                    String node = result.getJSONObject(i).toString();
                    if (chars + node.length() > TARGET_MAX_CHARS) break;
                    trimmed.put(result.getJSONObject(i));
                    chars += node.length();
                }
                out = trimmed.toString();
            }
            return out;
        } catch (Exception e) {
            Log.e(TAG, "Compression error, returning original", e);
            if (uiSnapshot.length() > TARGET_MAX_CHARS) {
                return uiSnapshot.substring(0, TARGET_MAX_CHARS);
            }
            return uiSnapshot;
        }
    }
}
