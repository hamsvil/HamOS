package com.aeterna.glass.core;

import android.accessibilityservice.AccessibilityService;
import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.os.Build;
import android.util.Log;
import java.io.DataOutputStream;

public class KineticActuator {
    private static final String TAG = "KineticActuator";

    public static boolean executeBezierSwipe(AccessibilityService service, float startX, float startY, float endX, float endY, int durationMs) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N && service != null) {
            try {
                Path path = new Path();
                path.moveTo(startX, startY);
                // Bezier control point to simulate human thumb curve
                float controlX = startX + (endX - startX) / 2.0f + 50.0f;
                float controlY = startY + (endY - startY) / 2.0f - 50.0f;
                path.quadTo(controlX, controlY, endX, endY);
                
                GestureDescription.Builder builder = new GestureDescription.Builder();
                builder.addStroke(new GestureDescription.StrokeDescription(path, 0, durationMs));
                return service.dispatchGesture(builder.build(), null, null);
            } catch (Exception e) {
                Log.e(TAG, "Bezier Swipe Failed", e);
                return false;
            }
        }
        return false;
    }

    public static boolean executeBezierTap(AccessibilityService service, float x, float y) {
        // A tap is just a micro-swipe with a Bezier curve (Component 4)
        return executeBezierSwipe(service, x, y, x + 1.0f, y + 1.0f, 45);
    }

    public static boolean executeRootTap(float x, float y) {
        // Kernel-Level Event Injection Fallback (Component 4)
        try {
            Process p = Runtime.getRuntime().exec("su");
            DataOutputStream os = new DataOutputStream(p.getOutputStream());
            os.writeBytes("input tap " + x + " " + y + "\n");
            os.writeBytes("exit\n");
            os.flush();
            p.waitFor();
            return p.exitValue() == 0;
        } catch (Exception e) {
            Log.e(TAG, "Root Tap Failed", e);
            return false;
        }
    }
}
