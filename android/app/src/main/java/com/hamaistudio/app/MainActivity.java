package com.hamaistudio.app;

import android.os.Bundle;
import android.webkit.JavascriptInterface;
import android.util.Base64;
import com.getcapacitor.BridgeActivity;
import java.io.File;
import java.io.RandomAccessFile;
import java.io.IOException;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
    }

    @Override
    public void onStart() {
        super.onStart();
        // Register the JS interface for chunked writing
        getBridge().getWebView().addJavascriptInterface(this, "AndroidWriteProxy");
    }

    @JavascriptInterface
    public boolean writeChunk(String path, String base64Chunk, long offset, boolean isLast) {
        try {
            File file = new File(path);
            File parent = file.getParentFile();
            if (parent != null && !parent.exists()) {
                parent.mkdirs();
            }

            byte[] data = Base64.decode(base64Chunk, Base64.DEFAULT);
            try (RandomAccessFile raf = new RandomAccessFile(file, "rw")) {
                raf.seek(offset);
                raf.write(data);
                return true;
            }
        } catch (IOException e) {
            e.printStackTrace();
            return false;
        }
    }
}
