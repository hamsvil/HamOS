package com.aeterna.glass.core;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.Service;
import android.content.Intent;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.util.Log;

public class WatchdogService extends Service {
    private static final String TAG = "AeternaWatchdog";
    private static final String CHANNEL_ID = "AeternaFailsafeChannel";
    private static final String EXTRA_PLAN_JSON = "resume_plan_json";
    private Handler heartbeatHandler;
    private Runnable heartbeatRunnable;
    private PersistentPlanStore planStore;

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();
        startForeground(110, getNotification("Watchdog Active — Singularity Architecture v10"));
        EncryptedKeyStore.init(getApplicationContext());
        planStore = new PersistentPlanStore(this);
        heartbeatHandler = new Handler(Looper.getMainLooper());
        heartbeatRunnable = new Runnable() {
            @Override
            public void run() {
                monitorAgent();
                heartbeatHandler.postDelayed(this, 5000);
            }
        };
        heartbeatHandler.post(heartbeatRunnable);
    }

    private void monitorAgent() {
        if (AutopilotEngine.instance == null) {
            Log.w(TAG, "AutopilotEngine is null — attempting resurrection");
            PersistentPlanStore.AgentPlan plan = planStore.load();
            Intent launchIntent = getPackageManager().getLaunchIntentForPackage(getPackageName());
            if (launchIntent != null) {
                launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_SINGLE_TOP);
                if (plan != null && "RUNNING".equals(plan.status)) {
                    try {
                        launchIntent.putExtra(EXTRA_PLAN_JSON, plan.toJson().toString());
                        Log.i(TAG, "Resuming plan: " + plan.goal);
                    } catch (Exception e) {
                        Log.e(TAG, "Failed to serialize plan for Intent", e);
                    }
                }
                startActivity(launchIntent);
            }
        }
    }

    public static String getPlanJsonFromIntent(Intent intent) {
        if (intent == null) return null;
        return intent.getStringExtra(EXTRA_PLAN_JSON);
    }

    private Notification getNotification(String content) {
        Notification.Builder builder;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            builder = new Notification.Builder(this, CHANNEL_ID);
        } else {
            builder = new Notification.Builder(this);
        }
        builder.setContentTitle("Aeterna Glass v10 — SINGULARITY")
                .setContentText(content)
                .setSmallIcon(android.R.drawable.ic_secure);
        return builder.build();
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID, "Failsafe & Resurrector", NotificationManager.IMPORTANCE_LOW);
            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) manager.createNotificationChannel(channel);
        }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        return START_STICKY;
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onDestroy() {
        super.onDestroy();
        if (heartbeatHandler != null) heartbeatHandler.removeCallbacks(heartbeatRunnable);
        Intent broadcastIntent = new Intent("com.aeterna.glass.RESURRECT");
        sendBroadcast(broadcastIntent);
    }
}
