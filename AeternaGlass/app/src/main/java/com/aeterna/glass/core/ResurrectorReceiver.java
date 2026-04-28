package com.aeterna.glass.core;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

public class ResurrectorReceiver extends BroadcastReceiver {
    private static final String TAG = "AeternaResurrector";

    @Override
    public void onReceive(Context context, Intent intent) {
        if ("com.aeterna.glass.RESURRECT".equals(intent.getAction())) {
            Log.e(TAG, "CRITICAL: Watchdog killed. Executing Self-Healing Resurrection...");
            Intent serviceIntent = new Intent(context, WatchdogService.class);
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
        }
    }
}
