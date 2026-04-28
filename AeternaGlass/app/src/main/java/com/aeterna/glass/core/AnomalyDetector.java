package com.aeterna.glass.core;

import android.util.Log;

public class AnomalyDetector {
    private static final String TAG = "AnomalyDetector";
    private String lastSnapshot = "";
    private int stuckCounter = 0;
    private static final int STUCK_THRESHOLD = 5;
    private String expectedPackageName = "";
    private String currentForegroundApp = "";

    public void onWindowStateChanged(String packageName) {
        this.currentForegroundApp = packageName;
    }

    public void setExpectedPackage(String pkg) {
        this.expectedPackageName = pkg != null ? pkg : "";
    }

    public String check(String currentSnapshot) {
        if (currentSnapshot == null || currentSnapshot.isEmpty() || currentSnapshot.equals("[]")) {
            stuckCounter++;
            if (stuckCounter >= STUCK_THRESHOLD) {
                stuckCounter = 0;
                return "BLANK_SCREEN_OR_EMPTY_UI";
            }
            return null;
        }

        if (currentSnapshot.equals(lastSnapshot)) {
            stuckCounter++;
            if (stuckCounter >= STUCK_THRESHOLD) {
                stuckCounter = 0;
                return "STUCK_SCREEN";
            }
        } else {
            stuckCounter = 0;
            lastSnapshot = currentSnapshot;
        }

        if (currentSnapshot.contains("AlertDialog") || currentSnapshot.contains("PopupWindow")) {
            return "UNEXPECTED_DIALOG";
        }

        String lower = currentSnapshot.toLowerCase();

        if (lower.contains("permission") || lower.contains("izin")) {
            if (lower.contains("izinkan") || lower.contains("allow") || lower.contains("grant")
                    || lower.contains("setuju") || lower.contains("deny") || lower.contains("tolak")) {
                return "PERMISSION_REQUEST";
            }
        }

        if (lower.contains("isn't responding") || lower.contains("tidak merespons")
                || lower.contains("has stopped") || lower.contains("telah berhenti")
                || lower.contains("force close") || lower.contains("stop app")) {
            return "APP_CRASH_OR_ANR";
        }

        if (!expectedPackageName.isEmpty() && !currentForegroundApp.isEmpty()
                && !currentForegroundApp.equals(expectedPackageName)
                && !currentForegroundApp.equals("com.aeterna.glass")) {
            Log.d(TAG, "Unexpected navigation: expected=" + expectedPackageName
                    + " current=" + currentForegroundApp);
            return "UNEXPECTED_NAVIGATION";
        }

        return null;
    }
}
