package com.ham.quantum.pro;

import android.app.Activity;
import android.os.Bundle;
import android.os.Handler;
import android.os.Looper;
import android.os.Environment;
import android.util.Base64;
import android.webkit.*;
import android.widget.Toast;
import android.content.Context;
import android.content.Intent;
import java.io.*;
import java.nio.charset.StandardCharsets;

public class MainActivity extends Activity {
    private WebView webView;

    public class AndroidBridge {
        private Context context;
        private Handler handler = new Handler(Looper.getMainLooper());

        AndroidBridge(Context c) { context = c; }

        @JavascriptInterface
        public void toast(final String message) {
            handler.post(() -> Toast.makeText(context, message, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface
        public void saveToDocuments(final String filename, final String content) {
            new Thread(() -> {
                try {
                    File path = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS);
                    if (!path.exists()) path.mkdirs();
                    File file = new File(path, filename);
                    FileWriter writer = new FileWriter(file);
                    writer.write(content);
                    writer.close();
                    toast("Saved: " + filename);
                } catch (IOException e) { toast("Save Failed: " + e.getMessage()); }
            }).start();
        }

        @JavascriptInterface
        public String readFromDocuments(String filename) {
            StringBuilder text = new StringBuilder();
            try {
                File file = new File(Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOCUMENTS), filename);
                BufferedReader br = new BufferedReader(new FileReader(file));
                String line;
                while ((line = br.readLine()) != null) { text.append(line).append('\n'); }
                br.close();
                return text.toString();
            } catch (IOException e) { return null; }
        }

        @JavascriptInterface
        public void encryptAndSaveConfig(String jsonConfig) {
            saveToDocuments("ham_config.hc", Base64.encodeToString(jsonConfig.getBytes(), Base64.DEFAULT));
        }

        @JavascriptInterface
        public String decryptAndLoadConfig() {
            String b64 = readFromDocuments("ham_config.hc");
            if (b64 == null) return null;
            try {
                return new String(Base64.decode(b64, Base64.DEFAULT), StandardCharsets.UTF_8);
            } catch (Exception e) { return null; }
        }
        
        @JavascriptInterface
        public void startVpnService(String configJson) {
            Intent intent = new Intent(MainActivity.this, QuantumVpnService.class);
            intent.putExtra("CONFIG", configJson);
            startService(intent);
        }
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);
        webView = findViewById(R.id.webView);
        WebSettings s = webView.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setDatabaseEnabled(true);
        s.setAllowFileAccessFromFileURLs(true);
        s.setAllowUniversalAccessFromFileURLs(true);
        
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Return false forces all URLs to be loaded inside this WebView.
                // Prevents opening external browsers.
                return false;
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.loadUrl("file:///android_asset/index.html");
    }
}