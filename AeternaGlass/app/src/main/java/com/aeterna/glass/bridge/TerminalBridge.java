package com.aeterna.glass.bridge;

import android.util.Log;
import java.io.BufferedReader;
import java.io.InputStreamReader;

public class TerminalBridge {
    private static final String TAG = "AeternaTerminal";

    /**
     * 3. DINDING: Terminal/Shell Window
     * Mengeksekusi perintah bash/shell dan mengembalikan output ke UI.
     * [AUDIT FIX]: Menggunakan ProcessBuilder dengan redirectErrorStream untuk mencegah Deadlock pada buffer.
     */
    public static String executeCommand(String command) {
        StringBuilder output = new StringBuilder();
        try {
            ProcessBuilder pb = new ProcessBuilder("sh", "-c", command);
            pb.redirectErrorStream(true); // Gabungkan stderr ke stdout agar buffer tidak penuh dan hang
            Process process = pb.start();
            
            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
            process.waitFor();
        } catch (Exception e) {
            Log.e(TAG, "Terminal execution failed", e);
            output.append("Execution Exception: ").append(e.getMessage());
        }
        return output.toString();
    }
}
