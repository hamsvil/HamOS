package com.aeterna.glass.bridge;

import android.util.Log;

public class ASTValidator {
    private static final String TAG = "AeternaAST";
    
    // Strict Blacklist to prevent RCE Suicide (Remote Code Execution on self)
    private static final String[] FATAL_SYSCALLS = {
        "rm -rf", "mkfs", "dd if=", "reboot", "shutdown", "wipe", "fastboot", "chmod 777 /"
    };

    /**
     * Semantic Validator: Membedah kode buatan AI sebelum dieksekusi.
     * Anti-Simulasi: Mencegah AI menghancurkan sistem host secara tidak sengaja akibat halusinasi LLM.
     */
    public static boolean validateSemanticSafety(String script) {
        if (script == null || script.trim().isEmpty()) {
            Log.e(TAG, "Validation failed: Script is empty.");
            return false;
        }
        
        String lowerScript = script.toLowerCase();
        for (String syscall : FATAL_SYSCALLS) {
            if (lowerScript.contains(syscall)) {
                Log.e(TAG, "FATAL: Destructive payload detected and blocked -> " + syscall);
                // Trigger Self-Healing: Reject script and force AI to rethink
                return false; 
            }
        }
        return true;
    }
}
