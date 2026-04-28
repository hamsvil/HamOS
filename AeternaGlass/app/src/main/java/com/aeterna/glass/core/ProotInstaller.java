package com.aeterna.glass.core;

import android.content.Context;
import android.util.Log;
import java.io.File;

public class ProotInstaller {
    private static final String TAG = "AeternaProot";

    /**
     * W^X Bypass for API 29+ (Android 10)
     * Mengekstrak dan mengeksekusi biner dari nativeLibraryDir untuk mem-bypass blokir eksekusi SELinux.
     */
    public static String getSafeExecutionPath(Context context, String binaryName) {
        try {
            // Pada Android 10+, hanya file di nativeLibraryDir yang bisa dieksekusi (Kebijakan W^X)
            // Biner Bash/Proot harus di-pack sebagai lib<name>.so di dalam APK
            String nativeDir = context.getApplicationInfo().nativeLibraryDir;
            File executable = new File(nativeDir, "lib" + binaryName + ".so");
            
            if (executable.exists()) {
                if (!executable.canExecute()) {
                    Log.w(TAG, "Binary not executable. Self-Healing: Attempting chmod...");
                    executable.setExecutable(true);
                }
                return executable.getAbsolutePath();
            } else {
                Log.e(TAG, "CRITICAL: Binary " + binaryName + " not found in native dir.");
                return null;
            }
        } catch (Exception e) {
            Log.e(TAG, "W^X Bypass Failed: " + e.getMessage());
            return null;
        }
    }
}
