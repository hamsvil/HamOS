package com.aeterna.glass.core;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Environment;
import android.util.Log;
import org.json.JSONObject;
import java.io.File;
import java.io.FileOutputStream;

public class SessionExporter {
    private static final String TAG = "SessionExporter";
    private static final String CHANNEL_ID = "AeternaSessionChannel";

    public static void export(Context context, PersistentPlanStore.AgentPlan plan, EpisodicCache episodicCache) {
        if (plan == null || context == null) return;
        new Thread(new Runnable() {
            @Override
            public void run() {
                try {
                    JSONObject report = new JSONObject();
                    report.put("goal", plan.goal);
                    report.put("status", plan.status);
                    report.put("tasks_total", plan.tasks.size());
                    report.put("tasks_completed", plan.countDone());
                    report.put("tasks_failed", plan.countFailed());
                    report.put("exported_at", System.currentTimeMillis());
                    if (episodicCache != null) {
                        report.put("episode_log", episodicCache.getRaw());
                    }

                    String fileName = "aeterna_session_" + System.currentTimeMillis() + ".json";
                    File file = null;

                    try {
                        File dir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_DOWNLOADS);
                        if (dir != null && (dir.exists() || dir.mkdirs())) {
                            file = new File(dir, fileName);
                        }
                    } catch (Exception e) {
                        Log.w(TAG, "Cannot write to Downloads, using internal storage: " + e.getMessage());
                    }

                    if (file == null) {
                        file = new File(context.getFilesDir(), fileName);
                    }

                    FileOutputStream fos = new FileOutputStream(file);
                    fos.write(report.toString(2).getBytes("UTF-8"));
                    fos.close();
                    Log.i(TAG, "Session exported to: " + file.getAbsolutePath());

                    showExportNotification(context, plan.goal, file.getAbsolutePath());
                } catch (Exception e) {
                    Log.e(TAG, "Export failed", e);
                }
            }
        }).start();
    }

    private static void showExportNotification(Context context, String goal, String filePath) {
        try {
            NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
            if (nm == null) return;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                NotificationChannel channel = new NotificationChannel(
                        CHANNEL_ID, "Aeterna Session Reports", NotificationManager.IMPORTANCE_LOW);
                nm.createNotificationChannel(channel);
            }
            Notification.Builder builder;
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                builder = new Notification.Builder(context, CHANNEL_ID);
            } else {
                builder = new Notification.Builder(context);
            }
            builder.setContentTitle("Aeterna — Sesi Selesai")
                    .setContentText("Laporan tersedia: " + filePath)
                    .setSmallIcon(android.R.drawable.ic_menu_save);
            nm.notify(200, builder.build());
        } catch (Exception e) {
            Log.e(TAG, "Failed to show notification", e);
        }
    }
}
