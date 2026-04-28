package com.aeterna.glass.ui;

import android.app.Activity;
import android.content.Intent;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.provider.Settings;
import android.util.Log;
import android.view.View;
import android.view.Window;
import android.view.WindowManager;
import android.webkit.WebChromeClient;
import android.webkit.WebViewClient;
import android.webkit.WebView;
import android.widget.LinearLayout;
import android.widget.Toast;

import com.aeterna.glass.core.AutopilotEngine;
import com.aeterna.glass.core.EncryptedKeyStore;
import com.aeterna.glass.core.KernelManager;
import com.aeterna.glass.core.PersistentPlanStore;
import com.aeterna.glass.core.WatchdogService;
import com.aeterna.glass.core.WebViewKernel;

import org.json.JSONObject;

public class GlassmorphismActivity extends Activity {
    private static final String TAG = "GlassmorphismActivity";
    private WebViewKernel targetKernel;
    private static final int OVERLAY_PERMISSION_REQ_CODE = 1234;
    private boolean isDesktopMode = false;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        requestWindowFeature(Window.FEATURE_NO_TITLE);
        getWindow().setFlags(WindowManager.LayoutParams.FLAG_FULLSCREEN,
                WindowManager.LayoutParams.FLAG_FULLSCREEN);
        hideSystemUI();

        EncryptedKeyStore.init(getApplicationContext());

        LinearLayout rootLayout = new LinearLayout(this);
        rootLayout.setOrientation(LinearLayout.VERTICAL);
        rootLayout.setBackgroundColor(0xFF000000);

        LinearLayout headerLayout = new LinearLayout(this);
        headerLayout.setOrientation(LinearLayout.HORIZONTAL);
        headerLayout.setBackgroundColor(0xFF1A1A1C);
        headerLayout.setPadding(16, 16, 16, 16);
        headerLayout.setGravity(android.view.Gravity.CENTER_VERTICAL);

        android.widget.Button homeBtn = new android.widget.Button(this);
        homeBtn.setText("🏠");
        homeBtn.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        homeBtn.setTextColor(0xFF00FFCC);

        final android.widget.EditText urlInput = new android.widget.EditText(this);
        LinearLayout.LayoutParams urlParams = new LinearLayout.LayoutParams(0,
                LinearLayout.LayoutParams.WRAP_CONTENT, 1.0f);
        urlParams.setMargins(16, 0, 16, 0);
        urlInput.setLayoutParams(urlParams);
        urlInput.setSingleLine(true);
        urlInput.setImeOptions(android.view.inputmethod.EditorInfo.IME_ACTION_GO);
        urlInput.setInputType(android.text.InputType.TYPE_TEXT_VARIATION_URI);
        urlInput.setBackgroundColor(0xFF2A2A2C);
        urlInput.setTextColor(0xFFFFFFFF);
        urlInput.setPadding(24, 16, 24, 16);
        urlInput.setText("https://www.google.com");

        android.widget.Button refreshBtn = new android.widget.Button(this);
        refreshBtn.setText("↻");
        refreshBtn.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        refreshBtn.setTextColor(0xFF00FFCC);

        android.widget.Button menuBtn = new android.widget.Button(this);
        menuBtn.setText("⋮");
        menuBtn.setBackgroundColor(android.graphics.Color.TRANSPARENT);
        menuBtn.setTextColor(0xFF00FFCC);

        headerLayout.addView(homeBtn);
        headerLayout.addView(urlInput);
        headerLayout.addView(refreshBtn);
        headerLayout.addView(menuBtn);

        final android.widget.ProgressBar progressBar = new android.widget.ProgressBar(this, null,
                android.R.attr.progressBarStyleHorizontal);
        progressBar.setMax(100);
        progressBar.setLayoutParams(new LinearLayout.LayoutParams(
                LinearLayout.LayoutParams.MATCH_PARENT, 6));

        targetKernel = new WebViewKernel(this);
        KernelManager.targetKernel = targetKernel;

        rootLayout.addView(headerLayout);
        rootLayout.addView(progressBar);
        rootLayout.addView(targetKernel,
                new LinearLayout.LayoutParams(LinearLayout.LayoutParams.MATCH_PARENT, 0, 1.0f));

        homeBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { targetKernel.loadUrl("https://www.google.com"); }
        });
        refreshBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { targetKernel.reload(); }
        });
        menuBtn.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) { showAgentSettingsDialog(); }
        });

        urlInput.setOnEditorActionListener(new android.widget.TextView.OnEditorActionListener() {
            @Override
            public boolean onEditorAction(android.widget.TextView v, int actionId, android.view.KeyEvent event) {
                if (actionId == android.view.inputmethod.EditorInfo.IME_ACTION_GO) {
                    String q = urlInput.getText().toString().trim();
                    if (!q.isEmpty()) {
                        String url = q;
                        if (!url.startsWith("http://") && !url.startsWith("https://")) {
                            if (url.contains(".") && !url.contains(" ")) {
                                url = "https://" + url;
                            } else {
                                url = "https://www.google.com/search?q=" + Uri.encode(q);
                            }
                        }
                        targetKernel.loadUrl(url);
                        android.view.inputmethod.InputMethodManager imm =
                                (android.view.inputmethod.InputMethodManager) getSystemService(INPUT_METHOD_SERVICE);
                        if (imm != null) imm.hideSoftInputFromWindow(urlInput.getWindowToken(), 0);
                    }
                    return true;
                }
                return false;
            }
        });

        targetKernel.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                super.onProgressChanged(view, newProgress);
                progressBar.setProgress(newProgress);
                progressBar.setVisibility(newProgress < 100 ? View.VISIBLE : View.GONE);
                if (KernelManager.uiKernel != null) {
                    KernelManager.uiKernel.evaluateJavascript(
                            "if(window.updateProgress) updateProgress(" + newProgress + ");", null);
                }
            }
        });

        targetKernel.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                view.loadUrl(url);
                return true;
            }
            @Override
            public void onPageFinished(WebView view, String url) {
                super.onPageFinished(view, url);
                urlInput.setText(url);
                if (KernelManager.uiKernel != null) {
                    KernelManager.uiKernel.evaluateJavascript(
                            "if(window.updateUrl) updateUrl('" + url.replace("'", "\\'") + "');", null);
                }
            }
        });

        setContentView(rootLayout);
        targetKernel.loadUrl("https://www.google.com");

        startWatchdog();
        checkOverlayPermissionAndStartService();
        handleResumeIntent(getIntent());
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleResumeIntent(intent);
    }

    private void handleResumeIntent(Intent intent) {
        if (intent == null) return;
        String planJson = WatchdogService.getPlanJsonFromIntent(intent);
        if (planJson != null && !planJson.isEmpty()) {
            try {
                PersistentPlanStore.AgentPlan plan = PersistentPlanStore.AgentPlan.fromJson(
                        new JSONObject(planJson));
                if (AutopilotEngine.instance != null) {
                    AutopilotEngine.instance.resumeFromPlan(plan);
                    Log.i(TAG, "Plan resumed from WatchdogService: " + plan.goal);
                }
            } catch (Exception e) {
                Log.e(TAG, "Failed to resume plan from intent", e);
            }
        }
    }

    private void showAgentSettingsDialog() {
        LinearLayout layout = new LinearLayout(this);
        layout.setOrientation(LinearLayout.VERTICAL);
        layout.setPadding(32, 32, 32, 32);
        layout.setBackgroundColor(0xFF0A0A0C);

        final android.widget.EditText apiKeyInput = new android.widget.EditText(this);
        apiKeyInput.setHint("Gemini API Key");
        apiKeyInput.setInputType(android.text.InputType.TYPE_CLASS_TEXT
                | android.text.InputType.TYPE_TEXT_VARIATION_PASSWORD);
        apiKeyInput.setTextColor(0xFFFFFFFF);
        apiKeyInput.setHintTextColor(0x88FFFFFF);
        layout.addView(apiKeyInput);

        final android.widget.EditText modelInput = new android.widget.EditText(this);
        modelInput.setHint("Model (contoh: gemini-2.5-flash)");
        modelInput.setTextColor(0xFFFFFFFF);
        modelInput.setHintTextColor(0x88FFFFFF);
        modelInput.setText("gemini-2.5-flash");
        layout.addView(modelInput);

        new android.app.AlertDialog.Builder(this)
                .setTitle("Setelan Aeterna Agent")
                .setView(layout)
                .setPositiveButton("Simpan", new android.content.DialogInterface.OnClickListener() {
                    @Override
                    public void onClick(android.content.DialogInterface d, int w) {
                        String key = apiKeyInput.getText().toString().trim();
                        if (!key.isEmpty()) {
                            EncryptedKeyStore.getInstance().save("api_key", key);
                        }
                        String model = modelInput.getText().toString().trim();
                        if (!model.isEmpty()) {
                            com.aeterna.glass.core.GeminiBrain.setModel(model);
                        }
                        Toast.makeText(GlassmorphismActivity.this,
                                "Setelan Agent disimpan.", Toast.LENGTH_SHORT).show();
                    }
                })
                .setNegativeButton("Batal", null)
                .show();
    }

    private void checkOverlayPermissionAndStartService() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            if (!Settings.canDrawOverlays(this)) {
                Intent intent = new Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION,
                        Uri.parse("package:" + getPackageName()));
                startActivityForResult(intent, OVERLAY_PERMISSION_REQ_CODE);
            } else {
                startFloatingService();
                checkAccessibilityPermission();
            }
        } else {
            startFloatingService();
            checkAccessibilityPermission();
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode == OVERLAY_PERMISSION_REQ_CODE) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && Settings.canDrawOverlays(this)) {
                startFloatingService();
                checkAccessibilityPermission();
            } else {
                Toast.makeText(this, "Izin overlay diperlukan untuk overlay AI.", Toast.LENGTH_LONG).show();
            }
        }
    }

    private void startFloatingService() {
        Intent intent = new Intent(this, FloatingAIService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(intent);
        } else {
            startService(intent);
        }
    }

    private void checkAccessibilityPermission() {
        if (!isAccessibilityEnabled()) {
            Toast.makeText(this,
                    "Aktifkan Accessibility Service Aeterna di Setelan → Aksesibilitas",
                    Toast.LENGTH_LONG).show();
            Intent intent = new Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS);
            startActivity(intent);
        }
    }

    private boolean isAccessibilityEnabled() {
        try {
            int setting = Settings.Secure.getInt(getContentResolver(),
                    Settings.Secure.ACCESSIBILITY_ENABLED, 0);
            if (setting == 0) return false;
            String services = Settings.Secure.getString(getContentResolver(),
                    Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES);
            return services != null && services.contains(getPackageName());
        } catch (Exception e) {
            return false;
        }
    }

    private void startWatchdog() {
        Intent wi = new Intent(this, WatchdogService.class);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            startForegroundService(wi);
        } else {
            startService(wi);
        }
    }

    private void hideSystemUI() {
        View decorView = getWindow().getDecorView();
        int flags = View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
                | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
                | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_FULLSCREEN;
        decorView.setSystemUiVisibility(flags);
    }
}
