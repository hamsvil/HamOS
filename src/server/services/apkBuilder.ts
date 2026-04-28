import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import AdmZip from 'adm-zip';
import { logger } from '../logger';
import { Server as SocketIOServer } from 'socket.io';

export class ApkBuildError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ApkBuildError';
  }
}

interface BuildState {
  id: string;
  type: 'source-zip' | 'android-native';
  config: {
    appName: string;
    packageName: string;
    version: string;
  };
  status: 'pending' | 'building' | 'waiting-device' | 'success' | 'error';
  progress: number;
  logs: string[];
  downloadUrl?: string;
  downloadPath?: string;
  error?: string;
  lastBuildAt?: string;
}

class ApkBuilder {
  private builds = new Map<string, BuildState>();

  startBuild(type: 'source-zip' | 'android-native', config: { appName: string; packageName: string; version: string }, io: SocketIOServer): string {
    const buildId = Date.now().toString();
    const state: BuildState = {
      id: buildId,
      type,
      config,
      status: 'pending',
      progress: 0,
      logs: [],
      lastBuildAt: new Date().toISOString()
    };
    this.builds.set(buildId, state);

    this.runBuild(buildId, io).catch(err => {
      logger.error({ buildId, err }, 'Build failed');
      this.updateState(buildId, { status: 'error', error: err.message });
    });

    return buildId;
  }

  getStatus(buildId: string): BuildState | undefined {
    return this.builds.get(buildId);
  }

  private updateState(buildId: string, update: Partial<BuildState>) {
    const state = this.builds.get(buildId);
    if (state) {
      const newState = { ...state, ...update };
      this.builds.set(buildId, newState);
    }
  }

  private log(buildId: string, message: string, io?: SocketIOServer) {
    const state = this.builds.get(buildId);
    if (state) {
      state.logs.push(message);
      if (io) {
        // Emit to /apk-progress namespace as requested
        io.of('/apk-progress').emit('apk-build-log', { buildId, message });
      }
    }
  }

  private emitProgress(buildId: string, progress: number, io: SocketIOServer) {
    this.updateState(buildId, { progress });
    io.of('/apk-progress').emit('apk-build-progress', { buildId, progress });
  }

  private async runBuild(buildId: string, io: SocketIOServer) {
    const state = this.builds.get(buildId)!;
    this.updateState(buildId, { status: 'building' });

    try {
      // 1. Vite Build
      this.log(buildId, 'Starting Vite build...', io);
      this.emitProgress(buildId, 10, io);
      await this.execNpmBuild(buildId, io);

      // Verify dist folder
      const distDir = path.join(process.cwd(), 'dist');
      if (!await fs.pathExists(distDir) || (await fs.readdir(distDir)).length === 0) {
        throw new ApkBuildError('dist folder empty');
      }

      // 2. Prepare AeternaGlass Assets
      this.log(buildId, 'Preparing Android assets...', io);
      this.emitProgress(buildId, 40, io);
      const wwwDir = path.join(process.cwd(), 'AeternaGlass/app/src/main/assets/www');
      await fs.ensureDir(wwwDir);
      await fs.emptyDir(wwwDir);
      await fs.copy(distDir, wwwDir);

      // Verify assets/www/index.html
      const indexHtmlPath = path.join(wwwDir, 'index.html');
      if (!await fs.pathExists(indexHtmlPath)) {
        throw new ApkBuildError('Verification failed: assets/www/index.html not found');
      }
      this.log(buildId, 'Verified assets/www/index.html exists', io);

      // 3. Update Android Configs
      this.log(buildId, 'Updating Android configurations...', io);
      this.emitProgress(buildId, 60, io);
      await this.updateAndroidConfigs(buildId);

      if (state.type === 'source-zip') {
        await this.finalizeZip(buildId, io);
      } else {
        await this.handleNativeBuild(buildId, io);
      }
    } catch (err: any) {
      const errorMsg = err instanceof ApkBuildError ? err.message : `Build Error: ${err.message}`;
      this.log(buildId, `Error: ${errorMsg}`, io);
      this.updateState(buildId, { status: 'error', error: errorMsg });
      logger.error({ buildId, error: err }, 'ApkBuilder runBuild failed');
    }
  }

  private execNpmBuild(buildId: string, io: SocketIOServer): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn('npm', ['run', 'build'], { shell: true });

      child.stdout.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) this.log(buildId, line.trim(), io);
        });
      });

      child.stderr.on('data', (data) => {
        const lines = data.toString().split('\n');
        lines.forEach((line: string) => {
          if (line.trim()) this.log(buildId, `[STDERR] ${line.trim()}`, io);
        });
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Build process exited with code ${code}`));
      });
    });
  }

  private async updateAndroidConfigs(buildId: string) {
    const state = this.builds.get(buildId)!;
    const { appName, packageName, version } = state.config;

    // Update strings.xml
    const stringsPath = path.join(process.cwd(), 'AeternaGlass/app/src/main/res/values/strings.xml');
    if (await fs.pathExists(stringsPath)) {
      let stringsContent = await fs.readFile(stringsPath, 'utf8');
      stringsContent = stringsContent.replace(/<string name="app_name">.*?<\/string>/, `<string name="app_name">${appName}</string>`);
      await fs.writeFile(stringsPath, stringsContent);
    } else {
      await fs.ensureDir(path.dirname(stringsPath));
      await fs.writeFile(stringsPath, `<?xml version="1.0" encoding="utf-8"?><resources><string name="app_name">${appName}</string></resources>`);
    }

    // Update build.gradle
    const gradlePath = path.join(process.cwd(), 'AeternaGlass/app/build.gradle');
    if (await fs.pathExists(gradlePath)) {
      let gradleContent = await fs.readFile(gradlePath, 'utf8');
      gradleContent = gradleContent.replace(/applicationId ".*?"/, `applicationId "${packageName}"`);
      gradleContent = gradleContent.replace(/versionName ".*?"/, `versionName "${version}"`);
      await fs.writeFile(gradlePath, gradleContent);
    }
  }

  private async finalizeZip(buildId: string, io: SocketIOServer) {
    this.log(buildId, 'Creating ZIP archive for Google Cloud Shell...', io);
    this.emitProgress(buildId, 80, io);
    const buildDir = path.join(process.cwd(), `data/builds/${buildId}`);
    await fs.ensureDir(buildDir);
    
    const zip = new AdmZip();
    // Use AeternaGlass folder as the source for zip
    const aeternaGlassDir = path.join(process.cwd(), 'AeternaGlass');
    if (!await fs.pathExists(aeternaGlassDir)) {
      throw new ApkBuildError('AeternaGlass folder not found');
    }
    zip.addLocalFolder(aeternaGlassDir);
    const zipPath = path.join(buildDir, 'android-source.zip');
    
    return new Promise<void>((resolve, reject) => {
      zip.writeZip(zipPath, (err) => {
        if (err) {
          reject(new Error(`Failed to write ZIP: ${err.message}`));
        } else {
          this.log(buildId, 'Build complete! Download ready.', io);
          this.emitProgress(buildId, 100, io);
          this.updateState(buildId, { 
            status: 'success', 
            downloadUrl: `/api/apk/download/${buildId}`,
            downloadPath: zipPath,
          });
          resolve();
        }
      });
    });
  }

  private async handleNativeBuild(buildId: string, io: SocketIOServer) {
    this.log(buildId, 'Generating Termux build scripts...', io);
    this.emitProgress(buildId, 90, io);
    
    const scriptContent = `#!/bin/bash
cd /sdcard/HamStudio/AeternaGlass && ./gradlew assembleDebug 2>&1 | tee /sdcard/HamStudio/build.log`;

    const buildDir = path.join(process.cwd(), `data/builds/${buildId}`);
    await fs.ensureDir(buildDir);
    await fs.writeFile(path.join(buildDir, 'build.sh'), scriptContent);

    this.log(buildId, 'Script sent to device via storage command simulation.', io);
    this.log(buildId, 'Buka Termux dan jalankan: sh /sdcard/HamStudio/build.sh', io);
    
    this.emitProgress(buildId, 100, io);
    this.updateState(buildId, { status: 'waiting-device' });
  }
}

export const apkBuilder = new ApkBuilder();

