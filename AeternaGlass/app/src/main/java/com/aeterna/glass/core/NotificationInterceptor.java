package com.aeterna.glass.core;

import android.app.Notification;
import android.os.Bundle;
import android.service.notification.NotificationListenerService;
import android.service.notification.StatusBarNotification;
import android.util.Log;

public class NotificationInterceptor extends NotificationListenerService {
    private static final String TAG = "NotificationInterceptor";

    @Override
    public void onNotificationPosted(StatusBarNotification sbn) {
        if (sbn == null || sbn.getNotification() == null) return;

        String text = extractNotificationText(sbn);
        if (text == null || text.isEmpty()) return;

        Log.d(TAG, "Notification from " + sbn.getPackageName() + ": " + text);

        if (AutopilotEngine.instance != null) {
            AutopilotEngine.instance.injectNotificationMemory(text);
        }
    }

    private String extractNotificationText(StatusBarNotification sbn) {
        Notification notification = sbn.getNotification();

        Bundle extras = notification.extras;
        if (extras != null) {
            CharSequence title = extras.getCharSequence(Notification.EXTRA_TITLE);
            CharSequence body = extras.getCharSequence(Notification.EXTRA_TEXT);
            StringBuilder sb = new StringBuilder();
            if (title != null) sb.append(title.toString().trim());
            if (body != null) {
                if (sb.length() > 0) sb.append(": ");
                sb.append(body.toString().trim());
            }
            if (sb.length() > 0) return sb.toString();
        }

        CharSequence ticker = notification.tickerText;
        if (ticker != null && ticker.length() > 0) {
            return ticker.toString().trim();
        }
        return "";
    }

    @Override
    public void onNotificationRemoved(StatusBarNotification sbn) {}
}
