package com.aeterna.glass.core;

import android.util.Log;
import java.io.BufferedReader;
import java.io.DataOutputStream;
import java.io.IOException;
import java.io.InputStreamReader;

public class InputInjector {
    
    private static final String TAG = "AeternaInputInjector";

    /**
     * 4. LANTAI: True Hardware Input Injections
     * Menginjeksi event langsung ke /dev/input/ menggunakan akses shell (membutuhkan root/su).
     * Zero-Simulation: Bypass deteksi klik JS.
     */
    public static boolean injectTap(int x, int y) {
        return executeShellCommand("input tap " + x + " " + y);
    }

    public static boolean injectSwipe(int x1, int y1, int x2, int y2, int durationMs) {
        return executeShellCommand("input swipe " + x1 + " " + y1 + " " + x2 + " " + y2 + " " + durationMs);
    }

    public static boolean injectRawEvent(String devInputPath, int type, int code, int value) {
        // Menulis langsung ke /dev/input/eventX (Sangat berbahaya, butuh root murni)
        String command = String.format("sendevent %s %d %d %d", devInputPath, type, code, value);
        return executeShellCommand(command);
    }

    private static boolean executeShellCommand(String command) {
        Process process = null;
        DataOutputStream os = null;
        BufferedReader reader = null;
        try {
            // Membutuhkan akses SU untuk True Hardware Injection di Android
            ProcessBuilder pb = new ProcessBuilder("su");
            pb.redirectErrorStream(true); // [AUDIT FIX]: Mencegah deadlock buffer stderr
            process = pb.start();
            
            os = new DataOutputStream(process.getOutputStream());
            os.writeBytes(command + "\n");
            os.writeBytes("exit\n");
            os.flush();
            
            // [AUDIT FIX]: Konsumsi output stream agar proses su tidak hang
            reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            while (reader.readLine() != null) {
                // Buang output, kita hanya butuh eksekusi
            }
            
            int exitValue = process.waitFor();
            return exitValue == 0;
        } catch (Exception e) {
            Log.e(TAG, "Injection failed: " + e.getMessage());
            // Self-Healing Loop: Fallback ke AccessibilityService jika SU gagal (diimplementasikan terpisah)
            return false;
        } finally {
            try {
                if (os != null) os.close();
                if (reader != null) reader.close();
                if (process != null) process.destroy();
            } catch (IOException e) {
                e.printStackTrace();
            }
        }
    }
}
