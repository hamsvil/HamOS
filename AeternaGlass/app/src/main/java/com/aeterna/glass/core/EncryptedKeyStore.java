package com.aeterna.glass.core;

import android.content.Context;
import android.content.SharedPreferences;
import android.util.Log;
import androidx.security.crypto.EncryptedSharedPreferences;
import androidx.security.crypto.MasterKey;

public class EncryptedKeyStore {
    private static final String TAG = "EncryptedKeyStore";
    private static final String FILE = "aeterna_secure_prefs";
    private SharedPreferences prefs;
    private static EncryptedKeyStore instance;

    private EncryptedKeyStore(Context ctx) {
        SharedPreferences encryptedPrefs = null;
        try {
            MasterKey masterKey = new MasterKey.Builder(ctx.getApplicationContext())
                    .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
                    .build();
            encryptedPrefs = EncryptedSharedPreferences.create(
                    ctx.getApplicationContext(),
                    FILE,
                    masterKey,
                    EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
                    EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
            );
        } catch (Exception e) {
            Log.e(TAG, "EncryptedSharedPreferences init failed, using plain fallback", e);
            encryptedPrefs = ctx.getSharedPreferences(FILE + "_plain", Context.MODE_PRIVATE);
        }
        this.prefs = encryptedPrefs;
    }

    public static synchronized void init(Context ctx) {
        if (instance == null) {
            instance = new EncryptedKeyStore(ctx.getApplicationContext());
        }
    }

    public static synchronized EncryptedKeyStore getInstance() {
        if (instance == null) {
            throw new IllegalStateException("EncryptedKeyStore not initialized. Call init(context) first.");
        }
        return instance;
    }

    public void save(String key, String val) {
        if (prefs != null && key != null && val != null) {
            prefs.edit().putString(key, val).apply();
        }
    }

    public String get(String key) {
        if (prefs != null && key != null) {
            return prefs.getString(key, null);
        }
        return null;
    }

    public void remove(String key) {
        if (prefs != null && key != null) {
            prefs.edit().remove(key).apply();
        }
    }

    public boolean has(String key) {
        return prefs != null && prefs.contains(key);
    }
}
