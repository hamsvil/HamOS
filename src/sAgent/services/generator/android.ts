
import { LicenseConfig } from '../../src/types';

export const androidTemplates = {
  getManifest: () => `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" 
    package="com.ham.quantum.pro"
    xmlns:tools="http://schemas.android.com/tools">

    <!-- Izin Akses Internet & Jaringan (Dasar) -->
    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
    <uses-permission android:name="android.permission.ACCESS_WIFI_STATE" />

    <!-- Izin Fungsionalitas Aplikasi -->
    <uses-permission android:name="android.permission.VIBRATE" />
    <uses-permission android:name="android.permission.WAKE_LOCK" />
    <uses-permission android:name="android.permission.FOREGROUND_SERVICE" />
    
    <!-- Izin VPN (Inti) -->
    <uses-permission android:name="android.permission.BIND_VPN_SERVICE" tools:ignore="ProtectedPermissions" />

    <!-- Izin Penyimpanan (Import/Export & Cache) -->
    <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
    <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" android:maxSdkVersion="28" />
    <uses-permission android:name="android.permission.MANAGE_EXTERNAL_STORAGE" tools:ignore="ScopedStorage" />

    <!-- Izin Multimedia (Fitur AI) -->
    <uses-permission android:name="android.permission.RECORD_AUDIO" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
    <uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
    
    <!-- Izin Akses "Root" untuk HAMLI -->
    <uses-permission android:name="android.permission.READ_CONTACTS" />
    <uses-permission android:name="android.permission.WRITE_CONTACTS" />
    <uses-permission android:name="android.permission.READ_SMS" />
    <uses-permission android:name="android.permission.SEND_SMS" />
    <uses-permission android:name="android.permission.RECEIVE_SMS" />
    <uses-permission android:name="android.permission.READ_CALL_LOG" />
    <uses-permission android:name="android.permission.CALL_PHONE" />
    <uses-permission android:name="android.permission.READ_PHONE_STATE" />
    <uses-permission android:name="android.permission.BLUETOOTH" />
    <uses-permission android:name="android.permission.BLUETOOTH_ADMIN" />
    <uses-permission android:name="android.permission.BLUETOOTH_CONNECT" />
    <uses-permission android:name="android.permission.BLUETOOTH_SCAN" />
    <uses-permission android:name="android.permission.REQUEST_INSTALL_PACKAGES" />
    <uses-permission android:name="android.permission.SYSTEM_ALERT_WINDOW" />
    <uses-permission android:name="android.permission.QUERY_ALL_PACKAGES" />
    <uses-permission android:name="android.permission.WRITE_SETTINGS" tools:ignore="ProtectedPermissions" />
    
    <application 
        android:label="HAM Tunnel Pro" 
        android:icon="@mipmap/ic_launcher" 
        android:theme="@android:style/Theme.NoTitleBar.Fullscreen" 
        android:hardwareAccelerated="true" 
        android:requestLegacyExternalStorage="true" 
        android:usesCleartextTraffic="true">
        
        <activity android:name=".MainActivity" android:exported="true" android:configChanges="orientation|screenSize|keyboardHidden">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
        
        <service android:name=".QuantumVpnService" 
            android:permission="android.permission.BIND_VPN_SERVICE" 
            android:exported="false">
            <intent-filter>
                <action android:name="android.net.VpnService" />
            </intent-filter>
        </service>
    </application>
</manifest>`,
  getLayoutXml: () => `<?xml version="1.0" encoding="utf-8"?>
<RelativeLayout xmlns:android="http://schemas.android.com/apk/res/android"
    android:layout_width="match_parent" android:layout_height="match_parent" android:background="#020617">
    <WebView android:id="@+id/webView" android:layout_width="match_parent" android:layout_height="match_parent" />
</RelativeLayout>`,
  getJavaActivity: (lic?: LicenseConfig) => `package com.ham.quantum.pro;

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
                while ((line = br.readLine()) != null) { text.append(line).append('\\n'); }
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
        
        // **PERBAIKAN:** Override WebViewClient untuk internal navigation
        webView.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                // Return false memaksa semua URL untuk dimuat di dalam WebView ini.
                // Mencegah pembukaan browser eksternal.
                return false;
            }
        });

        webView.addJavascriptInterface(new AndroidBridge(this), "AndroidBridge");
        webView.loadUrl("file:///android_asset/index.html");
    }
}`,
  getVpnService: () => `package com.ham.quantum.pro;

import android.content.Intent;
import android.net.VpnService;
import android.os.ParcelFileDescriptor;
import android.util.Log;
import java.io.*;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.nio.ByteBuffer;
import java.nio.channels.FileChannel;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

// REQUIRES: implementation 'com.jcraft:jsch:0.1.55' in build.gradle
import com.jcraft.jsch.*;

public class QuantumVpnService extends VpnService {
    private ParcelFileDescriptor vpnInterface;
    private Thread vpnThread;
    private boolean isRunning = false;
    private ExecutorService executorService = Executors.newFixedThreadPool(4);

    // CONFIG PLACEHOLDERS
    private String remoteHost = "1.1.1.1";
    private int remotePort = 443;
    private String sniHost = "m.facebook.com";
    private String sshUser = "user";
    private String sshPass = "pass";
    private String payload = "GET / HTTP/1.1\\r\\nHost: m.facebook.com\\r\\n\\r\\n";

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null && "STOP".equals(intent.getAction())) {
            stopVpn();
            return START_NOT_STICKY;
        }
        // Extract config from intent here (omitted for brevity)
        if (!isRunning) {
            isRunning = true;
            vpnThread = new Thread(this::runVpn);
            vpnThread.start();
        }
        return START_STICKY;
    }

    private void runVpn() {
        try {
            // 1. Establish SSL/TLS Connection (Stunnel)
            Socket socket;
            if (sniHost != null && !sniHost.isEmpty()) {
                SSLContext sslContext = SSLContext.getInstance("TLSv1.3");
                sslContext.init(null, null, null);
                SSLSocketFactory factory = sslContext.getSocketFactory();
                SSLSocket sslSocket = (SSLSocket) factory.createSocket(remoteHost, remotePort);
                
                // SNI Spoofing
                // Note: Android requires specific API/Reflection for deeper SNI manipulation if plain SSLSocket fails
                // But generally, creating socket with hostname handles basic SNI.
                sslSocket.startHandshake();
                socket = sslSocket;
            } else {
                socket = new Socket(remoteHost, remotePort);
            }

            // 2. Inject Custom Payload (HTTP Header Injection)
            if (payload != null && !payload.isEmpty()) {
                OutputStream out = socket.getOutputStream();
                out.write(payload.getBytes());
                out.flush();
            }

            // 3. Setup SSH Connection over the socket
            JSch jsch = new JSch();
            Session session = jsch.getSession(sshUser, "127.0.0.1", 22); // Host is virtual here
            session.setSocketFactory(new SocketFactory() {
                public Socket createSocket(String host, int port) { return socket; }
                public InputStream getInputStream(Socket socket) throws IOException { return socket.getInputStream(); }
                public OutputStream getOutputStream(Socket socket) throws IOException { return socket.getOutputStream(); }
            });
            session.setPassword(sshPass);
            session.setConfig("StrictHostKeyChecking", "no");
            session.connect(10000); // 10s Timeout

            // 4. Setup Local Tun2Socks / Port Forwarding
            // For true VPN, we read packets from TUN and write to a Dynamic Forwarding channel
            // Simplified: Establish VPN Interface
            Builder builder = new Builder();
            builder.addAddress("10.0.0.2", 24);
            builder.addRoute("0.0.0.0", 0);
            builder.setMtu(1280); // CRITICAL: MTU Optimization to prevent fragmentation/slow internet
            builder.setSession("HamTunnelQuantum");
            vpnInterface = builder.establish();

            // 5. Packet Forwarding Loop
            startPacketLoop(vpnInterface, session);

        } catch (Exception e) {
            Log.e("HAM_VPN", "Error", e);
            stopVpn();
        }
    }

    private void startPacketLoop(ParcelFileDescriptor vpn, Session sshSession) {
        // Implement reading from vpn.getFileDescriptor() and writing to SSH Channel
        // This usually involves a native Tun2Socks library (e.g., badvpn-tun2socks)
        // or a Java-based TCP/IP stack implementation.
        // For this prototype, we simulate the loop structure.
        
        FileInputStream in = new FileInputStream(vpn.getFileDescriptor());
        FileOutputStream out = new FileOutputStream(vpn.getFileDescriptor());
        
        ByteBuffer packet = ByteBuffer.allocate(1280);
        
        while (isRunning) {
            try {
                // Read from TUN
                int length = in.read(packet.array());
                if (length > 0) {
                    // Write to SSH Direct TCP/IP Channel or SOCKS Proxy
                    // Channel channel = sshSession.openChannel("direct-tcpip");
                    // ... forwarding logic ...
                }
            } catch (Exception e) { break; }
        }
    }

    private void stopVpn() {
        isRunning = false;
        try {
            if (vpnInterface != null) vpnInterface.close();
        } catch (IOException e) { e.printStackTrace(); }
        stopSelf();
    }

    @Override
    public void onDestroy() {
        stopVpn();
        super.onDestroy();
    }
}`
};