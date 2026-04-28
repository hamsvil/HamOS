package com.aeterna.glass.bridge;

import android.content.Context;
import android.os.Handler;
import android.os.Looper;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;

import com.aeterna.glass.core.AutopilotEngine;
import com.aeterna.glass.core.EncryptedKeyStore;
import com.aeterna.glass.core.GeminiBrain;
import com.aeterna.glass.core.InputInjector;
import com.aeterna.glass.core.KernelManager;
import com.aeterna.glass.core.MemoryManager;
import com.aeterna.glass.core.ProotInstaller;
import com.aeterna.glass.core.WebViewKernel;

public class JSInterface {
    private static final String TAG = "AeternaJSBridge";
    private Context context;
    private WebViewKernel targetKernel;

    public JSInterface(Context context, WebViewKernel targetKernel, WebView uiKernel) {
        this.context = context;
        this.targetKernel = targetKernel;

        if (AutopilotEngine.instance == null) {
            new AutopilotEngine(targetKernel, uiKernel);
        }
    }

    @JavascriptInterface
    public void log(String message) {
        Log.d(TAG, "[JS]: " + message);
    }

    @JavascriptInterface
    public void setBrowserMode(final boolean isDesktop) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (targetKernel != null) targetKernel.setBrowserMode(isDesktop);
            }
        });
    }

    @JavascriptInterface
    public void triggerHapticAlert(int intensity) {
        Vibrator vibrator = (Vibrator) context.getSystemService(Context.VIBRATOR_SERVICE);
        if (vibrator != null && vibrator.hasVibrator()) {
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                vibrator.vibrate(VibrationEffect.createOneShot(300, VibrationEffect.DEFAULT_AMPLITUDE));
            } else {
                vibrator.vibrate(300);
            }
        }
    }

    @JavascriptInterface
    public boolean executeHardwareClick(int x, int y) {
        return InputInjector.injectTap(x, y);
    }

    @JavascriptInterface
    public void saveApiKey(String key) {
        if (key != null && !key.trim().isEmpty()) {
            EncryptedKeyStore.getInstance().save("api_key", key.trim());
            Log.d(TAG, "API key saved securely.");
        }
    }

    @JavascriptInterface
    public void setModel(String model) {
        if (model != null && !model.trim().isEmpty()) {
            GeminiBrain.setModel(model.trim());
        }
    }

    @JavascriptInterface
    public void clearLTM() {
        if (AutopilotEngine.instance != null && AutopilotEngine.instance.memoryManager != null) {
            AutopilotEngine.instance.memoryManager.clearAll();
        }
    }

    @JavascriptInterface
    public String getLTMEntryCount() {
        if (AutopilotEngine.instance != null && AutopilotEngine.instance.memoryManager != null) {
            return String.valueOf(AutopilotEngine.instance.memoryManager.getEntryCount());
        }
        return "0";
    }

    @JavascriptInterface
    public void pauseAgent() {
        if (AutopilotEngine.instance != null) {
            AutopilotEngine.instance.processManualCommand("pause");
        }
    }

    @JavascriptInterface
    public void resumeAgent() {
        if (AutopilotEngine.instance != null) {
            AutopilotEngine.instance.processManualCommand("resume");
        }
    }

    @JavascriptInterface
    public String getAgentState() {
        if (AutopilotEngine.instance != null) {
            return AutopilotEngine.instance.getCurrentState().name();
        }
        return "IDLE";
    }

    @JavascriptInterface
    public String getAgentStatus() {
        if (AutopilotEngine.instance != null) {
            return AutopilotEngine.instance.getStatusString();
        }
        return "IDLE | No active plan";
    }

    @JavascriptInterface
    public String createAndExecuteTool(String toolCode) {
        if (!ASTValidator.validateSemanticSafety(toolCode)) {
            return "ERROR: FATAL_SYSCALL_BLOCKED.";
        }
        return TerminalBridge.executeCommand(toolCode);
    }

    @JavascriptInterface
    public String askAI(String prompt) {
        try {
            Log.d(TAG, "askAI received: " + prompt);
            if (AutopilotEngine.instance == null) {
                return "ERROR: Agent not initialized.";
            }
            return AutopilotEngine.instance.processManualCommand(prompt);
        } catch (Exception e) {
            Log.e(TAG, "Error in askAI", e);
            String msg = e.getMessage();
            if (msg == null) msg = "Unknown error";
            return "{\"action\":\"error\",\"message\":\"" + msg.replace("\"", "'") + "\"}";
        }
    }

    @JavascriptInterface
    public void onActionCompleted() {}

    @JavascriptInterface
    public void onDomSnapshot(String currentUrl, String domJson) {}

    @JavascriptInterface
    public String getProotExecutionPath(String binaryName) {
        return ProotInstaller.getSafeExecutionPath(context, binaryName);
    }

    @JavascriptInterface
    public void navigateBrowser(final String url) {
        new Handler(Looper.getMainLooper()).post(new Runnable() {
            @Override
            public void run() {
                if (targetKernel != null) targetKernel.loadUrl(url);
            }
        });
    }
}
