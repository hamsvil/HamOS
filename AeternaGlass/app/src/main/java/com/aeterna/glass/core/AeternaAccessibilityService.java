package com.aeterna.glass.core;

import android.accessibilityservice.AccessibilityService;
import android.view.accessibility.AccessibilityEvent;
import android.view.accessibility.AccessibilityNodeInfo;
import android.os.Bundle;
import android.util.Log;
import android.util.DisplayMetrics;
import java.util.HashMap;
import java.util.Map;
import org.json.JSONArray;
import org.json.JSONObject;
import android.graphics.Rect;

public class AeternaAccessibilityService extends AccessibilityService {
    public static AeternaAccessibilityService instance;
    private Map<Integer, AccessibilityNodeInfo> nodeMap = new HashMap<>();
    private Map<Integer, Rect> rectMap = new HashMap<>();
    private int nodeCounter = 0;

    @Override
    public void onServiceConnected() {
        instance = this;
        Log.d("AeternaA11y", "OS-Level Accessibility Connected");
    }

    @Override
    public void onAccessibilityEvent(AccessibilityEvent event) {
        // Events are now handled asynchronously by the Reflex Engine in AutopilotEngine
        if (event.getEventType() == AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) {
            CharSequence packageName = event.getPackageName();
            if (packageName != null) {
                Log.d("AeternaA11y", "Window State Changed: " + packageName);
                if (AutopilotEngine.instance != null && AutopilotEngine.instance.anomalyDetector != null) {
                    AutopilotEngine.instance.anomalyDetector.onWindowStateChanged(packageName.toString());
                }
            }
        }
    }

    @Override
    public void onInterrupt() {}

    @Override
    public boolean onUnbind(android.content.Intent intent) {
        instance = null;
        return super.onUnbind(intent);
    }

    public interface ScreenshotCallback {
        void onResult(String base64Image);
    }

    public void captureScreenshot(final ScreenshotCallback callback) {
        try {
            if (android.os.Build.VERSION.SDK_INT >= 30) {
                takeScreenshot(android.view.Display.DEFAULT_DISPLAY, new java.util.concurrent.Executor() {
                                                @Override
                                                public void execute(Runnable command) {
                                                        new android.os.Handler(android.os.Looper.getMainLooper()).post(command);
                                                }
                                        }, new TakeScreenshotCallback() {
                                                @Override
                                                public void onSuccess(ScreenshotResult screenshot) {
                                                        try {
                                                                android.graphics.Bitmap bitmap = android.graphics.Bitmap.wrapHardwareBuffer(screenshot.getHardwareBuffer(), screenshot.getColorSpace());
                                                                if (bitmap != null) {
                                                                        java.io.ByteArrayOutputStream baos = new java.io.ByteArrayOutputStream();
                                                                        bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 40, baos);
                                                                        String base64Image = android.util.Base64.encodeToString(baos.toByteArray(), android.util.Base64.NO_WRAP);
                                                                        callback.onResult(base64Image);
                                                                } else {
                                                                        callback.onResult("");
                                                                }
                                                        } catch (Exception e) {
                                                                callback.onResult("");
                                                        }
                                                }
                                                @Override
                                                public void onFailure(int errorCode) {
                                                        callback.onResult("");
                                                }
                                        });
            } else {
                callback.onResult("");
            }
        } catch (Throwable t) {
            callback.onResult("");
        }
    }

    // Component 1: Semantic Compression (Fast UI Tree Extraction)
    public String captureUITreeFast() {
        nodeMap.clear();
        rectMap.clear();
        nodeCounter = 0;
        JSONArray snapshot = new JSONArray();

        DisplayMetrics metrics = getResources().getDisplayMetrics();
        int screenWidth = metrics.widthPixels;
        int screenHeight = metrics.heightPixels;

        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            java.util.List<android.view.accessibility.AccessibilityWindowInfo> windows = getWindows();
            for (android.view.accessibility.AccessibilityWindowInfo window : windows) {
                if (window.getType() == android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root != null) {
                        traverseNodeFast(root, snapshot, 0, screenWidth, screenHeight);
                    }
                }
            }
        } else {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                traverseNodeFast(root, snapshot, 0, screenWidth, screenHeight);
            }
        }
        return snapshot.toString();
    }

    private void traverseNodeFast(AccessibilityNodeInfo node, JSONArray snapshot, int depth, int screenWidth, int screenHeight) {
        if (node == null || depth > 15) return;

        Rect rect = new Rect();
        node.getBoundsInScreen(rect);

        // Viewport culling
        if (rect.bottom < 0 || rect.top > screenHeight || rect.right < 0 || rect.left > screenWidth) {
            return;
        }

        boolean isInteractive = node.isClickable() || node.isEditable() || node.isScrollable();
        boolean hasText = node.getText() != null && node.getText().length() > 0;
        boolean hasDesc = node.getContentDescription() != null && node.getContentDescription().length() > 0;

        if (isInteractive || hasText || hasDesc) {
            try {
                JSONObject obj = new JSONObject();
                int id = nodeCounter++;
                nodeMap.put(id, node);
                rectMap.put(id, rect);
                
                obj.put("id", id);
                obj.put("class", node.getClassName());

                String text = "";
                if (hasText) text += node.getText().toString();
                if (hasDesc) text += (text.isEmpty() ? "" : " | ") + node.getContentDescription().toString();
                obj.put("text", text);

                obj.put("x", rect.centerX());
                obj.put("y", rect.centerY());

                snapshot.put(obj);
            } catch (Exception e) {}
        }

        for (int i = 0; i < node.getChildCount(); i++) {
            traverseNodeFast(node.getChild(i), snapshot, depth + 1, screenWidth, screenHeight);
        }
    }

    public String captureUITree() {
        return captureUITreeFast();
    }

    public boolean clickNode(int id) {
        AccessibilityNodeInfo node = nodeMap.get(id);
        if (node != null) {
            if (node.isClickable()) {
                return node.performAction(AccessibilityNodeInfo.ACTION_CLICK);
            } else {
                AccessibilityNodeInfo parent = node.getParent();
                while (parent != null) {
                    if (parent.isClickable()) {
                        return parent.performAction(AccessibilityNodeInfo.ACTION_CLICK);
                    }
                    parent = parent.getParent();
                }
            }
        }
        
        // Component 4: Kinetic Actuator Fallback (Bezier Curve & Root)
        Rect rect = rectMap.get(id);
        if (rect != null) {
            boolean success = KineticActuator.executeBezierTap(this, rect.centerX(), rect.centerY());
            if (!success) {
                success = KineticActuator.executeRootTap(rect.centerX(), rect.centerY());
            }
            return success;
        }
        return false;
    }

    public Rect getRectForId(int id) {
        return rectMap.get(id);
    }

    public boolean typeNode(int id, String text) {
        AccessibilityNodeInfo node = nodeMap.get(id);
        if (node != null && node.isEditable()) {
            Bundle arguments = new Bundle();
            arguments.putCharSequence(AccessibilityNodeInfo.ACTION_ARGUMENT_SET_TEXT_CHARSEQUENCE, text);
            return node.performAction(AccessibilityNodeInfo.ACTION_SET_TEXT, arguments);
        }
        return false;
    }

    public boolean scroll(int direction) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.LOLLIPOP) {
            java.util.List<android.view.accessibility.AccessibilityWindowInfo> windows = getWindows();
            for (android.view.accessibility.AccessibilityWindowInfo window : windows) {
                if (window.getType() == android.view.accessibility.AccessibilityWindowInfo.TYPE_APPLICATION) {
                    AccessibilityNodeInfo root = window.getRoot();
                    if (root != null) {
                        AccessibilityNodeInfo scrollable = findScrollableNode(root);
                        if (scrollable != null) {
                            return scrollable.performAction(direction == 0 ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
                        }
                    }
                }
            }
        } else {
            AccessibilityNodeInfo root = getRootInActiveWindow();
            if (root != null) {
                AccessibilityNodeInfo scrollable = findScrollableNode(root);
                if (scrollable != null) {
                    return scrollable.performAction(direction == 0 ? AccessibilityNodeInfo.ACTION_SCROLL_FORWARD : AccessibilityNodeInfo.ACTION_SCROLL_BACKWARD);
                }
            }
        }
        return false;
    }

    private AccessibilityNodeInfo findScrollableNode(AccessibilityNodeInfo node) {
        if (node == null) return null;
        if (node.isScrollable()) return node;
        for (int i = 0; i < node.getChildCount(); i++) {
            AccessibilityNodeInfo res = findScrollableNode(node.getChild(i));
            if (res != null) return res;
        }
        return null;
    }

    public boolean goBack() {
        return performGlobalAction(GLOBAL_ACTION_BACK);
    }

    public boolean goHome() {
        return performGlobalAction(GLOBAL_ACTION_HOME);
    }

    public boolean openRecents() {
        return performGlobalAction(GLOBAL_ACTION_RECENTS);
    }
}
