package com.aeterna.glass.core;

import android.content.ContentValues;
import android.content.Context;
import android.database.Cursor;
import android.database.sqlite.SQLiteDatabase;
import android.database.sqlite.SQLiteOpenHelper;
import android.util.Log;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class MemoryManager extends SQLiteOpenHelper {
    private static final String TAG = "MemoryManager";
    private static final String DATABASE_NAME = "aeterna_ltm_v10.db";
    private static final int DATABASE_VERSION = 2;
    private static final String TABLE_MEMORY = "memory";
    private static final int MAX_MEMORY_LIMIT = 500;

    public MemoryManager(Context context) {
        super(context, DATABASE_NAME, null, DATABASE_VERSION);
    }

    @Override
    public void onCreate(SQLiteDatabase db) {
        db.execSQL("CREATE TABLE " + TABLE_MEMORY + " (" +
                "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
                "fact TEXT, " +
                "keywords TEXT, " +
                "score REAL DEFAULT 1.0, " +
                "timestamp INTEGER)");
    }

    @Override
    public void onUpgrade(SQLiteDatabase db, int oldVersion, int newVersion) {
        if (oldVersion < 2) {
            try {
                db.execSQL("ALTER TABLE " + TABLE_MEMORY + " ADD COLUMN score REAL DEFAULT 1.0");
            } catch (Exception e) {
                Log.w(TAG, "Column score may already exist: " + e.getMessage());
            }
        }
    }

    public void store(String fact) {
        memorize(fact);
    }

    public void memorize(String fact) {
        if (fact == null || fact.trim().isEmpty()) return;
        try {
            SQLiteDatabase db = getWritableDatabase();
            enforceMemoryLimit(db);
            String keywords = extractKeywords(fact);
            ContentValues values = new ContentValues();
            values.put("fact", fact.trim());
            values.put("keywords", keywords);
            values.put("score", 1.0);
            values.put("timestamp", System.currentTimeMillis());
            db.insert(TABLE_MEMORY, null, values);
        } catch (Exception e) {
            Log.e(TAG, "Failed to memorize", e);
        }
    }

    public void forget(String idStr) {
        if (idStr == null || idStr.trim().isEmpty()) return;
        try {
            getWritableDatabase().delete(TABLE_MEMORY, "id=?", new String[]{idStr.trim()});
        } catch (Exception e) {
            Log.e(TAG, "Failed to forget", e);
        }
    }

    public void clearAll() {
        try {
            getWritableDatabase().delete(TABLE_MEMORY, null, null);
        } catch (Exception e) {
            Log.e(TAG, "Failed to clear all memory", e);
        }
    }

    public int getEntryCount() {
        try {
            Cursor c = getReadableDatabase().rawQuery("SELECT COUNT(*) FROM " + TABLE_MEMORY, null);
            if (c.moveToFirst()) {
                int count = c.getInt(0);
                c.close();
                return count;
            }
            c.close();
        } catch (Exception e) {
            Log.e(TAG, "Failed to get entry count", e);
        }
        return 0;
    }

    private void enforceMemoryLimit(SQLiteDatabase db) {
        try {
            Cursor c = db.rawQuery("SELECT COUNT(*) FROM " + TABLE_MEMORY, null);
            if (c.moveToFirst() && c.getInt(0) >= MAX_MEMORY_LIMIT) {
                db.execSQL("DELETE FROM " + TABLE_MEMORY +
                        " WHERE id IN (SELECT id FROM " + TABLE_MEMORY +
                        " ORDER BY score ASC, timestamp ASC LIMIT 50)");
            }
            c.close();
        } catch (Exception e) {
            Log.e(TAG, "Memory limit enforcement failed", e);
        }
    }

    private String extractKeywords(String text) {
        if (text == null) return "";
        String[] words = text.toLowerCase().replaceAll("[^a-z0-9\\s]", "").split("\\s+");
        List<String> stopWords = Arrays.asList("dan", "atau", "di", "ke", "dari", "yang", "untuk",
                "dengan", "ini", "itu", "the", "a", "an", "and", "or", "in", "on", "at", "to",
                "for", "with", "is", "are", "was", "were", "be", "it", "of");
        StringBuilder keywords = new StringBuilder();
        for (String word : words) {
            if (word.length() > 2 && !stopWords.contains(word)) {
                keywords.append(word).append(" ");
            }
        }
        return keywords.toString().trim();
    }

    public String getContextualMemory(String queryContext) {
        if (queryContext == null || queryContext.trim().isEmpty()) return getMemoryString();
        String queryKeywords = extractKeywords(queryContext);
        if (queryKeywords.isEmpty()) return getMemoryString();

        try {
            SQLiteDatabase db = getReadableDatabase();
            String[] qWords = queryKeywords.split("\\s+");
            Map<String, Double> factScores = new HashMap<>();
            Map<String, String> factMap = new HashMap<>();

            Cursor cursor = db.rawQuery("SELECT id, fact, keywords, score FROM " + TABLE_MEMORY, null);
            if (cursor.moveToFirst()) {
                do {
                    String id = cursor.getString(0);
                    String fact = cursor.getString(1);
                    String keywords = cursor.getString(2);
                    double baseScore = cursor.getDouble(3);

                    double matchScore = 0;
                    for (String qw : qWords) {
                        if (keywords != null && keywords.contains(qw)) matchScore += 1.0;
                    }
                    if (matchScore > 0) {
                        factScores.put(id, matchScore * baseScore);
                        factMap.put(id, fact);
                    }
                } while (cursor.moveToNext());
            }
            cursor.close();

            List<Map.Entry<String, Double>> list = new ArrayList<>(factScores.entrySet());
            Collections.sort(list, new Comparator<Map.Entry<String, Double>>() {
                @Override
                public int compare(Map.Entry<String, Double> o1, Map.Entry<String, Double> o2) {
                    return o2.getValue().compareTo(o1.getValue());
                }
            });

            StringBuilder result = new StringBuilder();
            int count = 0;
            for (Map.Entry<String, Double> entry : list) {
                if (++count > 5) break;
                result.append("[ID:").append(entry.getKey()).append("] ")
                        .append(factMap.get(entry.getKey())).append("\n");
            }
            return result.length() > 0 ? result.toString() : getMemoryString();
        } catch (Exception e) {
            Log.e(TAG, "Contextual retrieval failed", e);
            return getMemoryString();
        }
    }

    public String getMemoryString() {
        try {
            Cursor c = getReadableDatabase().rawQuery(
                    "SELECT id, fact FROM " + TABLE_MEMORY + " ORDER BY timestamp DESC LIMIT 5", null);
            StringBuilder res = new StringBuilder();
            while (c.moveToNext()) {
                res.append("[ID:").append(c.getInt(0)).append("] ").append(c.getString(1)).append("\n");
            }
            c.close();
            return res.toString();
        } catch (Exception e) {
            return "LTM offline.";
        }
    }
}
