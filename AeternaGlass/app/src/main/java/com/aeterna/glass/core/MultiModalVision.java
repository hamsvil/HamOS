package com.aeterna.glass.core;

import android.util.Log;

public class MultiModalVision {
    private static final String TAG = "MultiModalVision";
    private static boolean screenshotRequested = false;

    public static void requestScreenshot(AeternaAccessibilityService.ScreenshotCallback callback) {
        if (AeternaAccessibilityService.instance != null) {
            try {
                AeternaAccessibilityService.instance.captureScreenshot(callback);
            } catch (Exception e) {
                Log.w(TAG, "Screenshot failed, falling back to UI tree only: " + e.getMessage());
                callback.onResult("");
            }
        } else {
            Log.w(TAG, "AccessibilityService not available for screenshot");
            callback.onResult("");
        }
    }

    public static void requestScreenshotOnAnomaly(String anomalyType,
                                                   AeternaAccessibilityService.ScreenshotCallback callback) {
        boolean needsScreenshot = anomalyType != null &&
                (anomalyType.equals("UNEXPECTED_DIALOG")
                        || anomalyType.equals("APP_CRASH_OR_ANR")
                        || anomalyType.equals("PERMISSION_REQUEST"));
        if (needsScreenshot) {
            requestScreenshot(callback);
        } else {
            callback.onResult("");
        }
    }
}
