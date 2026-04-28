package com.aeterna.glass.core;

import android.content.Context;
import android.content.pm.PackageManager;
import android.util.Log;
import java.io.File;

public class LongTaskProgressTracker {
    private static final String TAG = "LongTaskProgressTracker";

    public static boolean verifyOutcome(String expectedType, String expectedValue, String uiSnapshot) {
        if (expectedType == null || expectedType.isEmpty() || expectedValue == null || expectedValue.isEmpty()) {
            return true;
        }
        switch (expectedType) {
            case "file_exists":
                try {
                    return new File(expectedValue).exists();
                } catch (Exception e) {
                    Log.e(TAG, "File check error: " + e.getMessage());
                    return false;
                }
            case "text_on_screen":
                return uiSnapshot != null && uiSnapshot.contains(expectedValue);
            case "package_active":
            case "package_installed":
                return isPackageInstalled(expectedValue);
            case "url_contains":
                if (KernelManager.targetKernel != null) {
                    String url = KernelManager.targetKernel.getUrl();
                    return url != null && url.contains(expectedValue);
                }
                return false;
            default:
                Log.w(TAG, "Unknown verify type: " + expectedType + ", defaulting to true");
                return true;
        }
    }

    private static boolean isPackageInstalled(String packageName) {
        if (packageName == null || packageName.isEmpty()) return false;
        if (AeternaAccessibilityService.instance == null) return false;
        try {
            Context ctx = AeternaAccessibilityService.instance.getApplicationContext();
            ctx.getPackageManager().getPackageInfo(packageName, 0);
            return true;
        } catch (PackageManager.NameNotFoundException e) {
            return false;
        } catch (Exception e) {
            Log.e(TAG, "Package check error: " + e.getMessage());
            return false;
        }
    }
}
