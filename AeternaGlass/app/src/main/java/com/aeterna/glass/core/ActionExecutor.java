package com.aeterna.glass.core;

import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.os.SystemClock;
import android.util.Log;

import java.util.Arrays;
import java.util.HashSet;
import java.util.Set;

public class ActionExecutor {
    private static final String TAG = "ActionExecutor";
    private static final int MAX_RETRIES = 2;
    private static final int RETRY_DELAY_MS = 500;
    private static final int DEFAULT_ACTION_TIMEOUT_MS = 10000;

    private static final Set<String> ALLOWED_ACTIONS = new HashSet<>(Arrays.asList(
        "click", "type", "scroll", "scroll_to", "swipe", "long_press",
        "go_back", "go_home", "open_recents", "open_app", "navigate",
        "execute_shell", "memorize", "forget", "wait", "assert_visible",
        "done", "escalate", "write_test_file",
        "read_file", "list_dir", "delete_file", "write_file", "build_native"
    ));

    public static class ActionResult {
        public boolean success;
        public String errorReason;
        public String output;
        public long durationMs;

        public ActionResult(boolean success, String errorReason, String output, long durationMs) {
            this.success = success;
            this.errorReason = errorReason;
            this.output = output;
            this.durationMs = durationMs;
        }
    }

    public static ActionResult execute(KineticCommand cmd) {
        long startTime = SystemClock.uptimeMillis();

        if (cmd == null || cmd.action == null) {
            return new ActionResult(false, "Null command or action", "", 0);
        }
        if (!ALLOWED_ACTIONS.contains(cmd.action)) {
            return new ActionResult(false, "Unknown action: " + cmd.action, "", 0);
        }

        if (cmd.action.equals("wait")) {
            long waitTime = cmd.waitMs > 0 ? cmd.waitMs : 1000;
            SystemClock.sleep(Math.min(waitTime, 30000));
            return new ActionResult(true, "", "", SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("done")) {
            return new ActionResult(true, "", "Task marked complete", SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("escalate")) {
            if (AutopilotEngine.instance != null) {
                AutopilotEngine.instance.sendPublicLogToUI("ESCALATION: " + cmd.message);
            }
            return new ActionResult(true, "", "Escalated: " + cmd.message, SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("build_native")) {
            try {
                String scriptPath = cmd.params != null ? cmd.params.optString("script_path", "/sdcard/HamStudio/build.sh") : "/sdcard/HamStudio/build.sh";
                java.io.File triggerFile = new java.io.File("/sdcard/HamStudio/.build_trigger");
                
                if (cmd.params != null && cmd.params.has("script_content")) {
                    java.io.File file = new java.io.File(scriptPath);
                    java.io.File parent = file.getParentFile();
                    if (parent != null && !parent.exists()) parent.mkdirs();
                    java.io.FileWriter writer = new java.io.FileWriter(file);
                    writer.write(cmd.params.getString("script_content"));
                    writer.close();
                }
                
                triggerFile.createNewFile();
                return new ActionResult(true, "", "build_triggered:" + scriptPath, SystemClock.uptimeMillis() - startTime);
            } catch (Exception e) {
                return new ActionResult(false, "Build trigger error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("write_file")) {
            try {
                java.io.File file = new java.io.File(cmd.path);
                java.io.File parent = file.getParentFile();
                if (parent != null && !parent.exists()) parent.mkdirs();
                java.io.FileWriter writer = new java.io.FileWriter(file);
                writer.write(cmd.content);
                writer.close();
                return new ActionResult(true, "", "File written to " + file.getAbsolutePath(), SystemClock.uptimeMillis() - startTime);
            } catch (java.io.IOException e) {
                return new ActionResult(false, "Write error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("read_file")) {
            try {
                java.io.File file = new java.io.File(cmd.path);
                if (!file.exists()) return new ActionResult(false, "File not found", "", SystemClock.uptimeMillis() - startTime);
                java.io.BufferedReader reader = new java.io.BufferedReader(new java.io.FileReader(file));
                StringBuilder sb = new StringBuilder();
                String line;
                while ((line = reader.readLine()) != null) {
                    sb.append(line).append("\n");
                }
                reader.close();
                return new ActionResult(true, "", sb.toString(), SystemClock.uptimeMillis() - startTime);
            } catch (java.io.IOException e) {
                return new ActionResult(false, "Read error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("list_dir")) {
            try {
                java.io.File dir = new java.io.File(cmd.path);
                if (!dir.exists() || !dir.isDirectory()) return new ActionResult(false, "Not a directory", "", SystemClock.uptimeMillis() - startTime);
                String[] files = dir.list();
                String json = files != null ? Arrays.toString(files) : "[]";
                return new ActionResult(true, "", json, SystemClock.uptimeMillis() - startTime);
            } catch (Exception e) {
                return new ActionResult(false, "List error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("delete_file")) {
            try {
                java.io.File file = new java.io.File(cmd.path);
                if (!file.exists()) return new ActionResult(true, "", "File already gone", SystemClock.uptimeMillis() - startTime);
                boolean deleted = file.delete();
                return new ActionResult(deleted, deleted ? "" : "Delete failed", "", SystemClock.uptimeMillis() - startTime);
            } catch (Exception e) {
                return new ActionResult(false, "Delete error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("write_test_file")) {
            try {
                java.io.File dir = new java.io.File("/sdcard/HamStudio");
                if (!dir.exists()) dir.mkdirs();
                java.io.File file = new java.io.File(dir, "test.example");
                java.io.FileWriter writer = new java.io.FileWriter(file);
                writer.write("Hello from AeternaGlass ActionExecutor\n");
                writer.write("Timestamp: " + new java.util.Date().toString() + "\n");
                writer.close();
                return new ActionResult(true, "", "File written to " + file.getAbsolutePath(), SystemClock.uptimeMillis() - startTime);
            } catch (java.io.IOException e) {
                return new ActionResult(false, "Write error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
            }
        }

        if (cmd.action.equals("memorize")) {
            if (AutopilotEngine.instance != null && AutopilotEngine.instance.memoryManager != null) {
                AutopilotEngine.instance.memoryManager.store(cmd.fact);
                return new ActionResult(true, "", "Memorized: " + cmd.fact, SystemClock.uptimeMillis() - startTime);
            }
            return new ActionResult(false, "MemoryManager not available", "", SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("forget")) {
            if (AutopilotEngine.instance != null && AutopilotEngine.instance.memoryManager != null) {
                AutopilotEngine.instance.memoryManager.forget(cmd.memoryId);
                return new ActionResult(true, "", "Forgotten: " + cmd.memoryId, SystemClock.uptimeMillis() - startTime);
            }
            return new ActionResult(false, "MemoryManager not available", "", SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("execute_shell")) {
            ShellSandbox.ShellResult res = ShellSandbox.execute(cmd.command);
            String out = res.output != null ? res.output : "";
            return new ActionResult(res.success, res.success ? "" : "Shell error: " + out, out,
                    SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("navigate")) {
            if (KernelManager.targetKernel != null && !cmd.url.isEmpty()) {
                final String url = cmd.url;
                new android.os.Handler(android.os.Looper.getMainLooper()).post(new Runnable() {
                    @Override
                    public void run() {
                        KernelManager.targetKernel.loadUrl(url);
                    }
                });
                SystemClock.sleep(2000);
                return new ActionResult(true, "", "Navigated to " + url, SystemClock.uptimeMillis() - startTime);
            }
            return new ActionResult(false, "No target kernel or empty URL", "", SystemClock.uptimeMillis() - startTime);
        }

        if (cmd.action.equals("open_app")) {
            return openApp(cmd.packageName, startTime);
        }

        if (cmd.action.equals("assert_visible")) {
            if (AeternaAccessibilityService.instance != null) {
                String snapshot = AeternaAccessibilityService.instance.captureUITreeFast();
                boolean found = snapshot != null && snapshot.contains(cmd.assertText);
                return new ActionResult(found,
                        found ? "" : "Text not found: " + cmd.assertText,
                        found ? "found" : "not_found",
                        SystemClock.uptimeMillis() - startTime);
            }
            return new ActionResult(false, "AccessibilityService not available", "", SystemClock.uptimeMillis() - startTime);
        }

        boolean success = false;
        String error = "Action not executed";
        String output = "";
        int retries = 0;

        while (retries <= MAX_RETRIES && !success) {
            try {
                success = performAccessibilityAction(cmd);
                if (!success) {
                    error = "Attempt " + (retries + 1) + " failed";
                    if (retries < MAX_RETRIES) {
                        SystemClock.sleep(RETRY_DELAY_MS);
                    }
                }
            } catch (Exception e) {
                error = e.getMessage() != null ? e.getMessage() : "Exception";
                SystemClock.sleep(RETRY_DELAY_MS);
            }
            retries++;
        }

        if (!success && (cmd.action.equals("click") || cmd.action.equals("long_press") || cmd.action.equals("swipe"))) {
            Log.w(TAG, "Accessibility action failed, trying GestureDispatch fallback");
            if (cmd.action.equals("click") && cmd.id >= 0) {
                success = GestureDispatch.executeFallbackClick(cmd.id);
                if (success) error = "";
                else error = "GestureDispatch fallback also failed";
            } else if (cmd.action.equals("swipe") && cmd.x >= 0 && cmd.y >= 0) {
                success = GestureDispatch.executeSwipe(cmd.x, cmd.y, cmd.amount, 0);
                if (success) error = "";
                else error = "Swipe gesture failed";
            }
        }

        return new ActionResult(success, success ? "" : error, output, SystemClock.uptimeMillis() - startTime);
    }

    private static boolean performAccessibilityAction(KineticCommand cmd) {
        if (AeternaAccessibilityService.instance == null) {
            Log.w(TAG, "AccessibilityService not running");
            return false;
        }

        switch (cmd.action) {
            case "click":
                return AeternaAccessibilityService.instance.clickNode(cmd.id);
            case "type":
                return AeternaAccessibilityService.instance.typeNode(cmd.id, cmd.text);
            case "scroll":
                return AeternaAccessibilityService.instance.scroll(cmd.direction);
            case "scroll_to":
                return scrollToText(cmd.assertText);
            case "swipe":
                return GestureDispatch.executeSwipe(cmd.x, cmd.y, cmd.amount, cmd.direction);
            case "long_press":
                return GestureDispatch.executeLongPress(cmd.id);
            case "go_back":
                return AeternaAccessibilityService.instance.goBack();
            case "go_home":
                return AeternaAccessibilityService.instance.goHome();
            case "open_recents":
                return AeternaAccessibilityService.instance.openRecents();
            default:
                return false;
        }
    }

    private static boolean scrollToText(String targetText) {
        if (AeternaAccessibilityService.instance == null || targetText == null) return false;
        for (int attempt = 0; attempt < 8; attempt++) {
            String snapshot = AeternaAccessibilityService.instance.captureUITreeFast();
            if (snapshot != null && snapshot.contains(targetText)) {
                return true;
            }
            AeternaAccessibilityService.instance.scroll(1);
            SystemClock.sleep(500);
        }
        return false;
    }

    private static ActionResult openApp(String packageName, long startTime) {
        if (packageName == null || packageName.isEmpty()) {
            return new ActionResult(false, "No package name provided", "", SystemClock.uptimeMillis() - startTime);
        }
        if (AutopilotEngine.instance == null) {
            return new ActionResult(false, "AutopilotEngine not ready", "", SystemClock.uptimeMillis() - startTime);
        }
        Context context = null;
        if (AeternaAccessibilityService.instance != null) {
            context = AeternaAccessibilityService.instance.getApplicationContext();
        }
        if (context == null) {
            return new ActionResult(false, "No context for open_app", "", SystemClock.uptimeMillis() - startTime);
        }
        try {
            Intent intent = context.getPackageManager().getLaunchIntentForPackage(packageName);
            if (intent != null) {
                intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
                context.startActivity(intent);
                SystemClock.sleep(2000);
                return new ActionResult(true, "", "Opened: " + packageName, SystemClock.uptimeMillis() - startTime);
            }
            return new ActionResult(false, "App not found: " + packageName, "", SystemClock.uptimeMillis() - startTime);
        } catch (Exception e) {
            return new ActionResult(false, "open_app error: " + e.getMessage(), "", SystemClock.uptimeMillis() - startTime);
        }
    }
}
