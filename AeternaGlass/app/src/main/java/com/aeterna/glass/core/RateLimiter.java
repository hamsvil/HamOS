package com.aeterna.glass.core;

import android.util.Log;

public class RateLimiter {
    private static final String TAG = "RateLimiter";
    private static final int MAX_TOKENS = 10;
    private static final long REFILL_RATE_MS = 3000;

    private int tokens = MAX_TOKENS;
    private long lastRefillTime = System.currentTimeMillis();
    private static RateLimiter instance;

    private RateLimiter() {}

    public static synchronized RateLimiter getInstance() {
        if (instance == null) {
            instance = new RateLimiter();
        }
        return instance;
    }

    public synchronized void acquire() throws InterruptedException {
        refill();
        int waitCycles = 0;
        while (tokens <= 0) {
            if (waitCycles++ > 30) {
                Log.w(TAG, "RateLimiter: waited too long, forcing proceed");
                break;
            }
            wait(REFILL_RATE_MS);
            refill();
        }
        if (tokens > 0) tokens--;
        Log.d(TAG, "RateLimiter: token acquired. Remaining: " + tokens);
    }

    public synchronized void acquireWithBackoff(int attempt) throws InterruptedException {
        long backoffMs = (long) Math.min(Math.pow(2, attempt) * 2000, 30000);
        Log.w(TAG, "RateLimiter: 429 backoff, waiting " + backoffMs + "ms (attempt " + attempt + ")");
        Thread.sleep(backoffMs);
        acquire();
    }

    private void refill() {
        long now = System.currentTimeMillis();
        long elapsed = now - lastRefillTime;
        int newTokens = (int) (elapsed / REFILL_RATE_MS);
        if (newTokens > 0) {
            tokens = Math.min(MAX_TOKENS, tokens + newTokens);
            lastRefillTime = now;
        }
    }

    public synchronized int getAvailableTokens() {
        refill();
        return tokens;
    }
}
