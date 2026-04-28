package com.ham.quantum.pro;

import android.util.Log;
import java.io.FileDescriptor;

/**
 * Tun2SocksBridge - Bridge between Java TUN interface and Native tun2socks implementation.
 * 
 * APPROACH: Using a JNI-based wrapper for tun2socks.
 * If the native library (libtun2socks.so) is missing, it will log a critical warning.
 */
public class Tun2SocksBridge {
    private static final String TAG = "Tun2SocksBridge";
    private static boolean isNativeLoaded = false;

    static {
        try {
            System.loadLibrary("tun2socks");
            isNativeLoaded = true;
            Log.i(TAG, "Native tun2socks library loaded successfully.");
        } catch (UnsatisfiedLinkError e) {
            Log.e(TAG, "CRITICAL: libtun2socks.so NOT FOUND! VPN will not forward traffic.");
            Log.e(TAG, "TODO: Place libtun2socks.so in android/app/src/main/jniLibs/<abi>/");
        }
    }

    /**
     * Starts the tun2socks engine.
     * 
     * @param vpnFd The FileDescriptor of the TUN interface.
     * @param vpnMtu MTU of the VPN interface.
     * @param socksAddr SOCKS5 proxy address (e.g., "127.0.0.1:1080").
     * @param dnsAddr DNS server address (e.g., "8.8.8.8:53").
     */
    public static void start(FileDescriptor vpnFd, int vpnMtu, String socksAddr, String dnsAddr) {
        if (!isNativeLoaded) {
            Log.w(TAG, "tun2socks.start() called but native library is missing. Traffic forwarding STUBBED.");
            return;
        }
        
        try {
            nativeStart(vpnFd, vpnMtu, socksAddr, dnsAddr);
        } catch (Exception e) {
            Log.e(TAG, "Error starting native tun2socks", e);
        }
    }

    public static void stop() {
        if (isNativeLoaded) {
            nativeStop();
        }
    }

    // Native methods to be implemented in C/C++ (e.g., via badvpn-tun2socks)
    private static native void nativeStart(FileDescriptor vpnFd, int vpnMtu, String socksAddr, String dnsAddr);
    private static native void nativeStop();
}
