/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-escape */
import { nativeBridge } from '../utils/nativeBridge';
import { ProjectData } from '../components/HamAiStudio/types';
import { vfs as vfsService } from './vfsService';
import { NativeStorage } from '../plugins/NativeStorage';

/**
 * Android Build Service
 * Handles communication with the native Android layer for building APKs.
 */
export const androidBuildService = {
  /**
   * Checks if the native Android build environment is available.
   */
  isNativeAvailable: (): boolean => {
    return nativeBridge.isBuilderAvailable();
  },

  /**
   * Syncs project files to the native Android filesystem.
   * @param project The project data to sync.
   * @param onLog Callback for logs.
   * @returns Promise resolving to the project path on native FS.
   */
  syncProjectFiles: async (project: ProjectData, onLog: (msg: string) => void): Promise<string> => {
    // 1. Ambil snapshot proyek (Full Snapshot untuk menyertakan aset biner)
    const freshProject = await vfsService.getProjectSnapshot({ full: true });
    let buildFiles = [...freshProject.files];
    
    // DETEKSI TIPE PROJECT: Native (Java) vs Web (React/HTML)
    const isNativeProject = buildFiles.some(f => f.path.endsWith('.java') || f.path.endsWith('AndroidManifest.xml'));
    
    if (isNativeProject) {
        onLog("Detected Android Native Project (Java/XML)");
        
        // --- LOGIKA KHUSUS NATIVE ---
        
        // 1. Cek AndroidManifest.xml
        const hasManifest = buildFiles.some(f => f.path === 'AndroidManifest.xml' || f.path.endsWith('/AndroidManifest.xml'));
        if (!hasManifest) {
            onLog("CRITICAL: AndroidManifest.xml missing. Generating default...");
            buildFiles.push({
                path: 'AndroidManifest.xml',
                content: `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.hamaistudio.generated"
    android:versionCode="1"
    android:versionName="1.0">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:theme="@android:style/Theme.DeviceDefault.Light">
        <activity android:name=".MainActivity"
            android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>
</manifest>`
            });
        }

        // 2. Cek strings.xml (Penting untuk @string/app_name)
        const hasStrings = buildFiles.some(f => f.path.includes('res/values/strings.xml'));
        if (!hasStrings) {
            onLog("Generating default strings.xml...");
            buildFiles.push({
                path: 'res/values/strings.xml',
                content: `<resources>
    <string name="app_name">${project.name}</string>
</resources>`
            });
        }

        // 3. Cek MainActivity.java
        const hasJava = buildFiles.some(f => f.path.endsWith('.java'));
        if (!hasJava) {
            onLog("CRITICAL: No Java files found. Generating MainActivity.java...");
            buildFiles.push({
                path: 'src/com/hamaistudio/generated/MainActivity.java',
                content: `package com.hamaistudio.generated;

import android.app.Activity;
import android.os.Bundle;
import android.widget.TextView;
import android.view.Gravity;

public class MainActivity extends Activity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        TextView tv = new TextView(this);
        tv.setText("Hello from Ham AiStudio Native!");
        tv.setTextSize(24);
        tv.setGravity(Gravity.CENTER);
        
        setContentView(tv);
    }
}`
            });
        }

        // 4. Cek build.gradle (Penting untuk build system)
        const hasGradle = buildFiles.some(f => f.path === 'build.gradle');
        if (!hasGradle) {
            onLog("Generating default build.gradle...");
            buildFiles.push({
                path: 'build.gradle',
                content: `apply plugin: 'com.android.application'

android {
    compileSdkVersion 30
    defaultConfig {
        applicationId "com.hamaistudio.generated"
        minSdkVersion 21
        targetSdkVersion 30
        versionCode 1
        versionName "1.0"
    }
    buildTypes {
        release {
            minifyEnabled false
        }
    }
}`
            });
        }

        // 5. SMART RELOCATION: Pindahkan file Java ke struktur folder package yang benar
        const processedFiles: typeof buildFiles = [];
        
        for (const file of buildFiles) {
            if (file.path.endsWith('.java')) {
                const packageMatch = file.content.match(/package\s+([a-zA-Z0-9_.]+)\s*;/);
                if (packageMatch && packageMatch[1]) {
                    const packageName = packageMatch[1];
                    const packagePath = packageName.replace(/\./g, '/');
                    const fileName = file.path.split('/').pop() || 'Unknown.java';
                    
                    if (!file.path.includes(packagePath)) {
                        const newPath = `src/${packagePath}/${fileName}`;
                        onLog(`Relocating ${fileName} to ${newPath} (matched package ${packageName})`);
                        processedFiles.push({
                            ...file,
                            path: newPath
                        });
                        continue;
                    }
                }
            }
            processedFiles.push(file);
        }
        buildFiles = processedFiles;

    } else {
        // --- LOGIKA WEB (REACT/VITE) ---
        onLog("Detected Web Project (React/Vite)");
        
        const entryScriptMatch = buildFiles.find(f => f.path.match(/src\/(main|index)\.(tsx|jsx|ts|js)/));
        const entryScriptPath = entryScriptMatch ? `/${entryScriptMatch.path}` : '/src/main.tsx';
        
        const hasIndex = buildFiles.some(f => f.path === 'index.html' || f.path === 'public/index.html');
        if (!hasIndex) {
            onLog("CRITICAL: index.html missing. Generating default entry point...");
            buildFiles.push({
                path: 'index.html',
                content: `<!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${project.name}</title>
      </head>
      <body>
        <div id="root"></div>
        <script type="module" src="${entryScriptPath}"></script>
      </body>
    </html>`
            });
        }
    
        if (!entryScriptMatch) {
             onLog("CRITICAL: Entry script (src/main.tsx) missing. Generating default...");
             buildFiles.push({
                 path: 'src/main.tsx',
                 content: `import React from 'react';
    import ReactDOM from 'react-dom/client';
    import App from './App';
    
    ReactDOM.createRoot(document.getElementById('root')!).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    );`
             });
             
             const hasApp = buildFiles.some(f => f.path === 'src/App.tsx');
             if (!hasApp) {
                 buildFiles.push({
                     path: 'src/App.tsx',
                     content: `import React from 'react';
    export default function App() {
      return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', backgroundColor: '#000', color: '#fff', fontFamily: 'sans-serif' }}>
          <h1>Hello from Ham OS Native</h1>
        </div>
      );
    }`
                 });
             }
        }
    }

    const getSafePackageName = (name: string) => {
        const safeName = name.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        return safeName || 'ham-engine-app';
    };

    const packageJsonFile = buildFiles.find(f => f.path === 'package.json');
    
    if (!packageJsonFile) {
      onLog("Generating default package.json for build...");
      buildFiles.push({
        path: 'package.json',
        content: JSON.stringify({
          name: getSafePackageName(project.name),
          version: '1.0.0',
          private: true,
          dependencies: {}
        }, null, 2)
      });
    } else {
      try {
        const pkg = JSON.parse(packageJsonFile.content);
        if (!pkg.name) {
           onLog("WARN: package.json missing 'name'. Auto-fixing...");
           pkg.name = getSafePackageName(project.name);
           packageJsonFile.content = JSON.stringify(pkg, null, 2);
        }
      } catch (e: any) {
        onLog("ERROR: Invalid package.json. Regenerating...");
        const index = buildFiles.indexOf(packageJsonFile);
        if (index > -1) buildFiles.splice(index, 1);
        buildFiles.push({
          path: 'package.json',
          content: JSON.stringify({
            name: getSafePackageName(project.name),
            version: '1.0.0',
            private: true,
            dependencies: {}
          }, null, 2)
        });
      }
    }

    // 2. Get Internal Data Directory
    const { path: dataDir } = await NativeStorage.getInternalDataDirectory();
    if (!dataDir) {
      throw new Error("Failed to get internal data directory. Native storage access denied.");
    }
    const projectPath = `${dataDir}/projects/${project.name}`;

    // 3. Write Project Files to Native FS
    onLog("Preparing project files on native filesystem...");
    
    const filesToWrite = buildFiles.map(file => ({
      path: `${projectPath}/${file.path.startsWith('/') ? file.path.substring(1) : file.path}`,
      data: file.content
    }));

    try {
      const CHUNK_SIZE = 20; 
      for (let i = 0; i < filesToWrite.length; i += CHUNK_SIZE) {
        const chunk = filesToWrite.slice(i, i + CHUNK_SIZE);
        const result = await NativeStorage.bulkWrite({ files: chunk });
        if (!result.success) {
           throw new Error(`Failed to write project files chunk ${i / CHUNK_SIZE + 1} to native storage`);
        }
        await new Promise(r => setTimeout(r, 10));
      }
    } catch (e: any) {
      onLog("Bulk write failed, falling back to individual writes...");
      for (const file of buildFiles) {
        const fullPath = `${projectPath}/${file.path.startsWith('/') ? file.path.substring(1) : file.path}`;
        await NativeStorage.writeFile({
            path: fullPath,
            data: file.content,
            encoding: (file as any).isBinary ? 'base64' : 'utf8'
        });
      }
    }

    return projectPath;
  },

  /**
   * Triggers a native build process.
   * @param project The project data to build.
   * @param onLog Callback for build logs.
   * @returns Promise resolving to the path of the built APK.
   */
  build: async (project: ProjectData, onLog: (msg: string) => void): Promise<string> => {
    // 1. Sync files first
    const projectPath = await androidBuildService.syncProjectFiles(project, onLog);

    // 2. Check Native Bridge
    if (!nativeBridge.isBuilderAvailable()) {
      onLog("Native bridge (AndroidBuilder) not detected. Switching to Export Mode.");
      throw new Error("NATIVE_BRIDGE_MISSING");
    }

    return new Promise((resolve, reject) => {
      const uniqueCallbackId = `onBuildComplete_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      // Define the handler logic
      const handleBuildResult = (success: boolean, result: string) => {
        try {
            const resultObj = JSON.parse(result);
            if (resultObj.success) {
                onLog("Build Successful: " + resultObj.message);
                resolve(resultObj.message);
            } else {
                onLog("Build Failed: " + resultObj.message + " - " + resultObj.details);
                reject(new Error(resultObj.message + ": " + resultObj.details));
            }
        } catch (e) {
            // Fallback for legacy plain string responses
            if (success) {
                onLog("Build Successful: " + result);
                resolve(result);
            } else {
                onLog("Build Failed: " + result);
                reject(new Error(result));
            }
        }
      };

      try {
        onLog(`Starting build for project at: ${projectPath}`);
        
        // Check if the native builder supports dynamic callbacks
        // We use type assertion here because we are checking for the *existence* of the method on the bridge object
        // which nativeBridge.call abstracts away, but we need to know WHICH method to call.
        // Ideally nativeBridge should expose capability check.
        // For now, we try to call the dynamic one first via nativeBridge.
        
        // Register unique callback on window so Java can call it
        (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId] = (success: boolean, result: string) => {
            delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];
            handleBuildResult(success, result);
        };

        try {
             // Try calling the modern method first
             // Explicitly check existence first to ensure we fallback if missing
             const builder = (window as unknown as { AndroidBuilder?: { buildApkWithCallback?: Function } }).AndroidBuilder;
             if (builder && typeof builder.buildApkWithCallback === 'function') {
                nativeBridge.call('AndroidBuilder', 'buildApkWithCallback', projectPath, uniqueCallbackId);
             } else {
                throw new Error("buildApkWithCallback not found");
             }
        } catch (e) {
             // Fallback to legacy method if the modern one fails/doesn't exist
             
             // For legacy, we must use the fixed callback name
             const fixedCallbackName = 'onBuildComplete';
             
             // Cleanup the unique callback since we can't use it
             delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];

             if ((window as unknown as Record<string, (success: boolean, result: string) => void>)[fixedCallbackName]) {
                reject(new Error("A build is already in progress. Please wait."));
                return;
             }

             (window as unknown as Record<string, (success: boolean, result: string) => void>)[fixedCallbackName] = (success: boolean, result: string) => {
                delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[fixedCallbackName];
                handleBuildResult(success, result);
             };
             
             nativeBridge.call('AndroidBuilder', 'buildApk', projectPath);
        }

      } catch (e: any) {
        // Cleanup on immediate error
        const fixedCallbackName = 'onBuildComplete';
        if ((window as unknown as Record<string, (success: boolean, result: string) => void>)[fixedCallbackName]) delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[fixedCallbackName];
        if ((window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId]) delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];
        reject(e);
      }
    });
  },

  /**
   * Triggers a native web-to-apk build process.
   * @param webDistPath The path to the web distribution folder.
   * @param onLog Callback for build logs.
   * @returns Promise resolving to the path of the built APK.
   */
  buildWebAppApk: async (webDistPath: string, onLog: (msg: string) => void): Promise<string> => {
    if (!nativeBridge.isBuilderAvailable()) {
      throw new Error("NATIVE_BRIDGE_MISSING");
    }

    return new Promise((resolve, reject) => {
      const uniqueCallbackId = `onBuildComplete_web_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Define the handler logic
      const handleBuildResult = (success: boolean, result: string) => {
        try {
            const resultObj = JSON.parse(result);
            if (resultObj.success) {
                onLog("Build Successful: " + resultObj.message);
                resolve(resultObj.message);
            } else {
                onLog("Build Failed: " + resultObj.message + " - " + resultObj.details);
                reject(new Error(resultObj.message + ": " + resultObj.details));
            }
        } catch (e) {
            // Fallback for legacy plain string responses
            if (success) {
                onLog("Build Successful: " + result);
                resolve(result);
            } else {
                onLog("Build Failed: " + result);
                reject(new Error(result));
            }
        }
      };

      // Register global callback
      (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId] = (success: boolean, result: string) => {
        // Cleanup
        delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];
        handleBuildResult(success, result);
      };

      try {
        onLog(`Starting Web-to-APK build for: ${webDistPath}`);
        // Call the new native method
        const builder = (window as unknown as { AndroidBuilder?: { buildWebAppApk?: Function, buildWebAppApkWithCallback?: Function } }).AndroidBuilder;
        if (builder && typeof builder.buildWebAppApk === 'function') {
            // Check if it supports dynamic callback
            if (typeof builder.buildWebAppApkWithCallback === 'function') {
                nativeBridge.call('AndroidBuilder', 'buildWebAppApkWithCallback', webDistPath, uniqueCallbackId);
            } else {
                // Legacy fallback (but we still use the unique ID if Java supports it, 
                // otherwise it will call the fixed 'onBuildComplete' which we should also handle)
                
                // Set up legacy fallback just in case
                (window as unknown as Record<string, (success: boolean, result: string) => void>).onBuildComplete = (success: boolean, result: string) => {
                    delete (window as unknown as Record<string, (success: boolean, result: string) => void>).onBuildComplete;
                    delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];
                    handleBuildResult(success, result);
                };
                
                nativeBridge.call('AndroidBuilder', 'buildWebAppApk', webDistPath);
            }
        } else {
            throw new Error("Native method buildWebAppApk not found. Please update the app.");
        }
      } catch (e: any) {
        delete (window as unknown as Record<string, (success: boolean, result: string) => void>)[uniqueCallbackId];
        delete (window as unknown as Record<string, (success: boolean, result: string) => void>).onBuildComplete;
        reject(e);
      }
    });
  },

  /**
   * Starts the native local web server.
   * @param rootPath The root directory to serve.
   * @param port The port to listen on.
   */
  startLocalServer: (rootPath: string, port: number = 8080) => {
    if (nativeBridge.isAvailable()) {
      nativeBridge.call('Android', 'startWebServer', rootPath, port);
    }
  },

  /**
   * Stops the native local web server.
   */
  stopLocalServer: () => {
    if (nativeBridge.isAvailable()) {
      nativeBridge.call('Android', 'stopWebServer');
    }
  }
};
