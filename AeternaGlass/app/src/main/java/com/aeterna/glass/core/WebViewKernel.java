package com.aeterna.glass.core;

import android.annotation.SuppressLint;
import android.content.Context;
import android.os.Build;
import android.util.AttributeSet;
import android.webkit.CookieManager;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.net.http.SslError;
import android.webkit.SslErrorHandler;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;

public class WebViewKernel extends WebView {

    public WebViewKernel(Context context) {
        super(context);
        initKernel();
    }

    public WebViewKernel(Context context, AttributeSet attrs) {
        super(context, attrs);
        initKernel();
    }

    public WebViewKernel(Context context, AttributeSet attrs, int defStyleAttr) {
        super(context, attrs, defStyleAttr);
        initKernel();
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void initKernel() {
        WebSettings settings = this.getSettings();

        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true); 
        settings.setDatabaseEnabled(true);   
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.JELLY_BEAN) {
            settings.setAllowFileAccessFromFileURLs(true);
            settings.setAllowUniversalAccessFromFileURLs(true);
        }

        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);

        String desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
        settings.setUserAgentString(desktopUA);
        settings.setUseWideViewPort(true);
        settings.setLoadWithOverviewMode(true);

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
            CookieManager.getInstance().setAcceptThirdPartyCookies(this, true);
        }

        this.setWebViewClient(new WebViewClient() {
                                @Override
                                public boolean shouldOverrideUrlLoading(WebView view, String url) {
                                        view.loadUrl(url);
                                        return true;
                                }

                                @Override
                                public void onPageFinished(WebView view, String url) {
                                        super.onPageFinished(view, url);
                                        if (AutopilotEngine.instance != null) {
                                                AutopilotEngine.instance.onWebStateChanged();
                                        }
                                }

                                @Override
                                public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                                    String url = request.getUrl().toString();
                                    if (url.startsWith("http://") || url.startsWith("https://")) {
                                        try {
                                            // Proxy through local server on port 5000
                                            String proxyUrl = "http://localhost:5000/api/proxy?url=" + java.net.URLEncoder.encode(url, "UTF-8");
                                            HttpURLConnection connection = (HttpURLConnection) new URL(proxyUrl).openConnection();
                                            connection.setRequestMethod(request.getMethod());
                                            
                                            // Copy request headers
                                            for (java.util.Map.Entry<String, String> entry : request.getRequestHeaders().entrySet()) {
                                                connection.setRequestProperty(entry.getKey(), entry.getValue());
                                            }

                                            InputStream inputStream = connection.getInputStream();
                                            String contentType = connection.getContentType();
                                            String encoding = connection.getContentEncoding();
                                            
                                            if (contentType != null && contentType.contains(";")) {
                                                contentType = contentType.split(";")[0].trim();
                                            }

                                            return new WebResourceResponse(contentType, encoding, inputStream);
                                        } catch (Exception e) {
                                            e.printStackTrace();
                                        }
                                    }
                                    return super.shouldInterceptRequest(view, request);
                                }

                                @Override
                                public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
                                    handler.proceed(); // Dev mode: proceed with SSL errors
                                }
                        });

        this.setWebChromeClient(new WebChromeClient());

        this.setBackgroundColor(0x00000000); 
    }

    public void executeHScript(String script) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT) {
            this.evaluateJavascript(script, null);
        } else {
            this.loadUrl("javascript:" + script);
        }
    }

    public void setBrowserMode(boolean isDesktop) {
        WebSettings settings = this.getSettings();
        if (isDesktop) {
            String desktopUA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
            settings.setUserAgentString(desktopUA);
            settings.setUseWideViewPort(true);
            settings.setLoadWithOverviewMode(true);
            settings.setSupportZoom(true);
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);
        } else {
            settings.setUserAgentString(null); 
            settings.setUseWideViewPort(false);
            settings.setLoadWithOverviewMode(false);
            settings.setSupportZoom(false);
            settings.setBuiltInZoomControls(false);
        }
        this.reload();
    }
}
