package com.aeterna.glass.core;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.util.concurrent.TimeUnit;

public class ShellSandbox {
    private static final String[] BLOCKLIST = {"rm -rf", "format", "dd if=", "mkfs", "chmod 777 /"};
    private static final long TIMEOUT_MS = 30000;
    private static final int MAX_OUTPUT_LEN = 4096;

    public static class ShellResult {
        public boolean success;
        public String output;

        public ShellResult(boolean success, String output) {
            this.success = success;
            this.output = output;
        }
    }

    public static ShellResult execute(String command) {
        for (String blocked : BLOCKLIST) {
            if (command.contains(blocked)) {
                return new ShellResult(false, "Command blocked by security policy.");
            }
        }

        try {
            final Process process = Runtime.getRuntime().exec(new String[]{"sh", "-c", command});
            
            // Wait with timeout
            boolean finished = false;
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                finished = process.waitFor(TIMEOUT_MS, TimeUnit.MILLISECONDS);
            } else {
                // Manual timeout thread for older devices
                Thread timeoutThread = new Thread(new Runnable() {
                    @Override
                    public void run() {
                        try {
                            Thread.sleep(TIMEOUT_MS);
                            process.destroy();
                        } catch (InterruptedException e) {}
                    }
                });
                timeoutThread.start();
                process.waitFor();
                timeoutThread.interrupt();
                finished = true; // We assume it finished or was destroyed
            }

            if (!finished) {
                if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
                    process.destroyForcibly();
                } else {
                    process.destroy();
                }
                return new ShellResult(false, "Command timed out after 30s.");
            }

            BufferedReader reader = new BufferedReader(new InputStreamReader(process.getInputStream()));
            StringBuilder output = new StringBuilder();
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
                if (output.length() > MAX_OUTPUT_LEN) {
                    output.setLength(MAX_OUTPUT_LEN);
                    output.append("...[TRUNCATED]");
                    break;
                }
            }
            
            return new ShellResult(process.exitValue() == 0, output.toString().trim());
        } catch (Exception e) {
            return new ShellResult(false, "Shell Error: " + e.getMessage());
        }
    }
}
