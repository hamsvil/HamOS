package com.aeterna.glass.core;

import android.accessibilityservice.GestureDescription;
import android.graphics.Path;
import android.graphics.Rect;
import android.os.Build;
import android.util.Log;

public class GestureDispatch {
    private static final String TAG = "GestureDispatch";

    public static boolean executeFallbackClick(int id) {
        if (AeternaAccessibilityService.instance == null) return false;
        Rect rect = AeternaAccessibilityService.instance.getRectForId(id);
        if (rect == null) {
            Log.w(TAG, "No rect found for id: " + id);
            return false;
        }
        return executeBezierTap(rect.centerX(), rect.centerY());
    }

    public static boolean executeBezierTap(int x, int y) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false;
        if (AeternaAccessibilityService.instance == null) return false;
        try {
            Path path = new Path();
            path.moveTo(x - 2, y - 2);
            path.quadTo(x + 1, y - 1, x, y);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 100));
            return AeternaAccessibilityService.instance.dispatchGesture(builder.build(), null, null);
        } catch (Exception e) {
            Log.e(TAG, "BezierTap failed", e);
            return false;
        }
    }

    public static boolean executeLongPress(int id) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false;
        if (AeternaAccessibilityService.instance == null) return false;
        try {
            Rect rect = AeternaAccessibilityService.instance.getRectForId(id);
            if (rect == null) return false;
            Path path = new Path();
            path.moveTo(rect.centerX(), rect.centerY());
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 800));
            return AeternaAccessibilityService.instance.dispatchGesture(builder.build(), null, null);
        } catch (Exception e) {
            Log.e(TAG, "LongPress failed", e);
            return false;
        }
    }

    public static boolean executeSwipe(int startX, int startY, int endXOrAmount, int direction) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.N) return false;
        if (AeternaAccessibilityService.instance == null) return false;
        try {
            int endX = startX;
            int endY = startY;

            if (direction == 0 && endXOrAmount != 0) {
                endX = startX + endXOrAmount;
            } else if (direction == 1) {
                endY = startY - 500;
            } else if (direction == -1) {
                endY = startY + 500;
            } else {
                endY = startY - endXOrAmount;
            }

            Path path = new Path();
            path.moveTo(startX, startY);
            path.lineTo(endX, endY);
            GestureDescription.Builder builder = new GestureDescription.Builder();
            builder.addStroke(new GestureDescription.StrokeDescription(path, 0, 300));
            return AeternaAccessibilityService.instance.dispatchGesture(builder.build(), null, null);
        } catch (Exception e) {
            Log.e(TAG, "Swipe failed", e);
            return false;
        }
    }
}
