package com.aeterna.glass.core;

import android.util.Log;
import org.json.JSONObject;
import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class ChainOfThoughtParser {
    private static final String TAG = "ChainOfThoughtParser";
    private static int consecutiveFailures = 0;

    private static final Set<String> ALLOWED_ACTIONS = new HashSet<>(Arrays.asList(
        "click", "type", "scroll", "scroll_to", "swipe", "long_press",
        "go_back", "go_home", "open_recents", "open_app", "navigate",
        "execute_shell", "memorize", "forget", "wait", "assert_visible",
        "done", "escalate"
    ));

    public static String cleanJson(String raw) {
        if (raw == null) return "{}";
        String cleaned = raw.trim();

        if (cleaned.startsWith("```json")) {
            cleaned = cleaned.substring(7);
        } else if (cleaned.startsWith("```")) {
            cleaned = cleaned.substring(3);
        }
        if (cleaned.endsWith("```")) {
            cleaned = cleaned.substring(0, cleaned.length() - 3).trim();
        }

        cleaned = removeLineComments(cleaned);
        cleaned = removeBlockComments(cleaned);

        cleaned = cleaned.replaceAll(",\\s*}", "}");
        cleaned = cleaned.replaceAll(",\\s*]", "]");

        int startBrace = cleaned.indexOf('{');
        int startBracket = cleaned.indexOf('[');
        if (startBrace >= 0 || startBracket >= 0) {
            int start = (startBrace >= 0 && startBracket >= 0)
                    ? Math.min(startBrace, startBracket)
                    : (startBrace >= 0 ? startBrace : startBracket);
            cleaned = cleaned.substring(start).trim();
        }

        return cleaned.trim();
    }

    private static String removeLineComments(String json) {
        StringBuilder sb = new StringBuilder();
        boolean inString = false;
        boolean escaped = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escaped) {
                sb.append(c);
                escaped = false;
                continue;
            }
            if (c == '\\' && inString) {
                sb.append(c);
                escaped = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                sb.append(c);
                continue;
            }
            if (!inString && c == '/' && i + 1 < json.length() && json.charAt(i + 1) == '/') {
                while (i < json.length() && json.charAt(i) != '\n') i++;
                continue;
            }
            sb.append(c);
        }
        return sb.toString();
    }

    private static String removeBlockComments(String json) {
        StringBuilder sb = new StringBuilder();
        boolean inString = false;
        boolean escaped = false;
        for (int i = 0; i < json.length(); i++) {
            char c = json.charAt(i);
            if (escaped) {
                sb.append(c);
                escaped = false;
                continue;
            }
            if (c == '\\' && inString) {
                sb.append(c);
                escaped = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
                sb.append(c);
                continue;
            }
            if (!inString && c == '/' && i + 1 < json.length() && json.charAt(i + 1) == '*') {
                int end = json.indexOf("*/", i + 2);
                if (end >= 0) {
                    i = end + 1;
                }
                continue;
            }
            sb.append(c);
        }
        return sb.toString();
    }

    public static JSONObject validateAndParse(String raw) throws Exception {
        String cleaned = cleanJson(raw);

        JSONObject obj;
        try {
            obj = new JSONObject(cleaned);
        } catch (Exception parseEx) {
            consecutiveFailures++;
            if (consecutiveFailures <= 2) {
                Log.w(TAG, "JSON parse failed (attempt " + consecutiveFailures + "), attempting self-healing via AI");
                String healed = GeminiBrain.selfHealJson(raw);
                String healedCleaned = cleanJson(healed);
                obj = new JSONObject(healedCleaned);
                consecutiveFailures = 0;
            } else {
                consecutiveFailures = 0;
                throw new Exception("JSON parse failed after self-healing: " + parseEx.getMessage());
            }
        }

        consecutiveFailures = 0;

        String action = obj.optString("action", "");
        if (action.isEmpty()) {
            throw new Exception("Missing 'action' field in AI response");
        }
        if (!ALLOWED_ACTIONS.contains(action)) {
            Log.w(TAG, "Unknown action from AI: " + action + " — defaulting to 'done'");
            obj.put("action", "done");
            return obj;
        }

        if ((action.equals("click") || action.equals("type") || action.equals("long_press")) && !obj.has("id")) {
            throw new Exception("Action '" + action + "' requires 'id' field");
        }
        if (action.equals("type") && !obj.has("text")) {
            throw new Exception("Action 'type' requires 'text' field");
        }
        if (action.equals("navigate") && !obj.has("url")) {
            throw new Exception("Action 'navigate' requires 'url' field");
        }
        if (action.equals("execute_shell") && !obj.has("command")) {
            throw new Exception("Action 'execute_shell' requires 'command' field");
        }
        if (action.equals("open_app") && !obj.has("package")) {
            throw new Exception("Action 'open_app' requires 'package' field");
        }
        if (action.equals("memorize") && !obj.has("fact")) {
            throw new Exception("Action 'memorize' requires 'fact' field");
        }
        if (action.equals("assert_visible") && !obj.has("assert_text")) {
            throw new Exception("Action 'assert_visible' requires 'assert_text' field");
        }

        return obj;
    }
}
