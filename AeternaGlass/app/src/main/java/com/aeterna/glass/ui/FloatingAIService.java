package com.aeterna.glass.ui;

import android.app.Service;
import android.content.Intent;
import android.graphics.PixelFormat;
import android.graphics.drawable.GradientDrawable;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.DisplayMetrics;
import android.view.Gravity;
import android.view.MotionEvent;
import android.view.View;
import android.view.WindowManager;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import com.aeterna.glass.bridge.JSInterface;
import com.aeterna.glass.core.AutopilotEngine;
import com.aeterna.glass.core.KernelManager;
import com.aeterna.glass.core.PersistentPlanStore;
import com.aeterna.glass.core.WebViewKernel;

import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;

public class FloatingAIService extends Service {

    private WindowManager windowManager;
    private LinearLayout floatingPanel;
    private Button toggleBtn;
    private WebViewKernel uiKernel;
    private WindowManager.LayoutParams panelParams;
    private WindowManager.LayoutParams btnParams;
    private boolean isUiOpen = true;

    private static TextView statusBarView;
    private static ProgressBar taskProgressBar;
    private static Handler uiHandler = new Handler(Looper.getMainLooper());

    private static final int COLOR_IDLE = 0xFF333333;
    private static final int COLOR_PLANNING = 0xFF0055FF;
    private static final int COLOR_EXECUTING = 0xFF007700;
    private static final int COLOR_INTERRUPTED = 0xFF886600;
    private static final int COLOR_ERROR = 0xFFCC0000;
    private static final int COLOR_DONE = 0xFF005588;
    private static final int COLOR_PAUSED = 0xFF553399;

    @Override
    public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        windowManager = (WindowManager) getSystemService(WINDOW_SERVICE);
        setupInternalStorageUI();
        createFloatingPanel();
        createToggleButton();
    }

    private void setupInternalStorageUI() {
        try {
            File wwwDir = new File(getFilesDir(), "www");
            if (!wwwDir.exists()) wwwDir.mkdirs();
            File indexFile = new File(wwwDir, "index.html");
            InputStream is = getAssets().open("www/index.html");
            FileOutputStream fos = new FileOutputStream(indexFile);
            byte[] buffer = new byte[4096];
            int len;
            while ((len = is.read(buffer)) > 0) fos.write(buffer, 0, len);
            fos.close();
            is.close();
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void createFloatingPanel() {
        DisplayMetrics dm = getResources().getDisplayMetrics();
        int sw = dm.widthPixels;
        int sh = dm.heightPixels;
        final int pw = (int) (sw * 0.58);
        final int ph = (int) (sh * 0.50);

        floatingPanel = new LinearLayout(this);
        floatingPanel.setOrientation(LinearLayout.VERTICAL);
        floatingPanel.setBackgroundColor(0xEE0A0A0C);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            floatingPanel.setElevation(25f);
        }

        TextView dragHeader = new TextView(this);
        dragHeader.setText("⚲ DRAG");
        dragHeader.setTextColor(0xFF00FFCC);
        dragHeader.setPadding(12, 8, 12, 8);
        dragHeader.setTextSize(10f);
        dragHeader.setTypeface(null, android.graphics.Typeface.BOLD);
        dragHeader.setGravity(Gravity.CENTER);
        GradientDrawable headerBg = new GradientDrawable();
        headerBg.setColor(0xEE0A0A0C);
        headerBg.setStroke(2, 0xFF00FFCC);
        headerBg.setCornerRadii(new float[]{24f, 24f, 24f, 24f, 0f, 0f, 0f, 0f});
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            dragHeader.setBackground(headerBg);
        }

        statusBarView = new TextView(this);
        statusBarView.setText("[IDLE] Aeterna v10 — SINGULARITY");
        statusBarView.setTextColor(0xFFFFFFFF);
        statusBarView.setPadding(10, 6, 10, 6);
        statusBarView.setTextSize(10f);
        statusBarView.setBackgroundColor(COLOR_IDLE);
        statusBarView.setSingleLine(true);

        taskProgressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        taskProgressBar.setMax(100);
        taskProgressBar.setProgress(0);
        LinearLayout.LayoutParams pbParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 6);
        taskProgressBar.setLayoutParams(pbParams);

        LinearLayout controlRow = new LinearLayout(this);
        controlRow.setOrientation(LinearLayout.HORIZONTAL);
        controlRow.setGravity(Gravity.CENTER_VERTICAL);
        controlRow.setBackgroundColor(0xFF111111);
        controlRow.setPadding(6, 4, 6, 4);

        Button pauseBtn = new Button(this);
        pauseBtn.setText("⏸");
        pauseBtn.setTextColor(0xFFFFAA00);
        pauseBtn.setBackgroundColor(0xFF222222);
        pauseBtn.setTextSize(12f);
        LinearLayout.LayoutParams btnLp = new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1f);
        btnLp.setMargins(4, 2, 4, 2);
        pauseBtn.setLayoutParams(btnLp);
        pauseBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (AutopilotEngine.instance != null)
                    AutopilotEngine.instance.processManualCommand("pause");
            }
        });

        Button resumeBtn = new Button(this);
        resumeBtn.setText("▶");
        resumeBtn.setTextColor(0xFF00FFCC);
        resumeBtn.setBackgroundColor(0xFF222222);
        resumeBtn.setTextSize(12f);
        resumeBtn.setLayoutParams(btnLp);
        resumeBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (AutopilotEngine.instance != null)
                    AutopilotEngine.instance.processManualCommand("resume");
            }
        });

        controlRow.addView(pauseBtn);
        controlRow.addView(resumeBtn);

        android.content.Context themeCtx = new android.view.ContextThemeWrapper(
                this, android.R.style.Theme_DeviceDefault);
        uiKernel = new WebViewKernel(themeCtx);
        uiKernel.setBackgroundColor(0x00000000);
        KernelManager.uiKernel = uiKernel;

        JSInterface jsBridge = new JSInterface(this, KernelManager.targetKernel, uiKernel);
        uiKernel.addJavascriptInterface(jsBridge, "AeternaAPI");

        LinearLayout.LayoutParams uiParams = new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f);

        floatingPanel.addView(dragHeader,
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT));
        floatingPanel.addView(statusBarView,
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT));
        floatingPanel.addView(taskProgressBar, pbParams);
        floatingPanel.addView(controlRow,
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT,
                        LinearLayout.LayoutParams.WRAP_CONTENT));
        floatingPanel.addView(uiKernel, uiParams);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        panelParams = new WindowManager.LayoutParams(pw, ph, layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL
                        | WindowManager.LayoutParams.FLAG_WATCH_OUTSIDE_TOUCH,
                PixelFormat.TRANSLUCENT);
        panelParams.gravity = Gravity.TOP | Gravity.START;
        panelParams.x = (sw - pw) / 2;
        panelParams.y = (sh - ph) / 2;
        windowManager.addView(floatingPanel, panelParams);

        dragHeader.setOnTouchListener(new View.OnTouchListener() {
            private int iX, iY;
            private float iTX, iTY;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        iX = panelParams.x; iY = panelParams.y;
                        iTX = e.getRawX(); iTY = e.getRawY();
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        panelParams.x = iX + (int) (e.getRawX() - iTX);
                        panelParams.y = iY + (int) (e.getRawY() - iTY);
                        windowManager.updateViewLayout(floatingPanel, panelParams);
                        return true;
                }
                return false;
            }
        });

        File indexFile = new File(getFilesDir() + "/www/index.html");
        uiKernel.loadUrl("file://" + indexFile.getAbsolutePath());
    }

    private void createToggleButton() {
        toggleBtn = new Button(this);
        toggleBtn.setText("AI");
        toggleBtn.setTextColor(0xFF000000);
        toggleBtn.setTextSize(10f);
        toggleBtn.setTypeface(null, android.graphics.Typeface.BOLD);

        final GradientDrawable shape = new GradientDrawable();
        shape.setShape(GradientDrawable.OVAL);
        shape.setColor(0xCC00FFCC);
        shape.setStroke(2, 0xFF000000);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            toggleBtn.setBackground(shape);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            toggleBtn.setElevation(15f);
        }

        float density = getResources().getDisplayMetrics().density;
        int btnSize = (int) (38 * density);

        int layoutFlag = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
                ? WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY
                : WindowManager.LayoutParams.TYPE_PHONE;

        btnParams = new WindowManager.LayoutParams(btnSize, btnSize, layoutFlag,
                WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE, PixelFormat.TRANSLUCENT);
        btnParams.gravity = Gravity.BOTTOM | Gravity.END;
        btnParams.x = (int) (20 * density);
        btnParams.y = (int) (20 * density);
        windowManager.addView(toggleBtn, btnParams);

        toggleBtn.setOnTouchListener(new View.OnTouchListener() {
            private int iX, iY;
            private float iTX, iTY;
            private boolean isDragging;

            @Override
            public boolean onTouch(View v, MotionEvent e) {
                switch (e.getAction()) {
                    case MotionEvent.ACTION_DOWN:
                        iX = btnParams.x; iY = btnParams.y;
                        iTX = e.getRawX(); iTY = e.getRawY();
                        isDragging = false;
                        return true;
                    case MotionEvent.ACTION_MOVE:
                        float dx = e.getRawX() - iTX;
                        float dy = e.getRawY() - iTY;
                        if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                            isDragging = true;
                            btnParams.x = iX - (int) dx;
                            btnParams.y = iY - (int) dy;
                            windowManager.updateViewLayout(toggleBtn, btnParams);
                        }
                        return true;
                    case MotionEvent.ACTION_UP:
                        if (!isDragging) {
                            isUiOpen = !isUiOpen;
                            floatingPanel.setVisibility(isUiOpen ? View.VISIBLE : View.GONE);
                            toggleBtn.setTextColor(isUiOpen ? 0xFF000000 : 0xFFFFFFFF);
                            shape.setColor(isUiOpen ? 0xCC00FFCC : 0xCCFF0055);
                        }
                        return true;
                }
                return false;
            }
        });
    }

    public static void updateStatus(final String state, final PersistentPlanStore.AgentPlan plan) {
        uiHandler.post(new Runnable() {
            @Override
            public void run() {
                if (statusBarView == null) return;

                int bgColor;
                switch (state) {
                    case "PLANNING": bgColor = COLOR_PLANNING; break;
                    case "EXECUTING": bgColor = COLOR_EXECUTING; break;
                    case "INTERRUPTED": bgColor = COLOR_INTERRUPTED; break;
                    case "TASK_TIMEOUT": bgColor = COLOR_INTERRUPTED; break;
                    case "FATAL_ERROR": bgColor = COLOR_ERROR; break;
                    case "DONE": bgColor = COLOR_DONE; break;
                    case "PAUSED": bgColor = COLOR_PAUSED; break;
                    default: bgColor = COLOR_IDLE; break;
                }
                statusBarView.setBackgroundColor(bgColor);

                String statusText = "[" + state + "]";
                int progress = 0;
                if (plan != null && !plan.tasks.isEmpty()) {
                    int taskIdx = plan.currentTaskIndex;
                    int totalTasks = plan.tasks.size();
                    String taskTitle = taskIdx < totalTasks
                            ? plan.tasks.get(taskIdx).title : "done";
                    if (taskTitle.length() > 25) taskTitle = taskTitle.substring(0, 25) + "...";
                    statusText += " Task " + Math.min(taskIdx + 1, totalTasks)
                            + "/" + totalTasks + ": " + taskTitle;
                    progress = totalTasks > 0 ? (taskIdx * 100 / totalTasks) : 0;
                }
                statusBarView.setText(statusText);

                if (taskProgressBar != null) {
                    taskProgressBar.setProgress(progress);
                }
            }
        });
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (floatingPanel != null) windowManager.removeView(floatingPanel);
        if (toggleBtn != null) windowManager.removeView(toggleBtn);
        if (uiKernel != null) uiKernel.destroy();
    }
}
