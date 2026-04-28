/* eslint-disable no-useless-assignment */
import { ProjectData } from '../components/HamAiStudio/types';
import JSZip from 'jszip';

/**
 * Browser-based Build Service
 * 
 * Since full native Android compilation (AAPT, ECJ, DX) is not feasible purely in-browser 
 * without heavy WASM binaries (which are not present), this service falls back to 
 * generating a comprehensive Source ZIP.
 * 
 * This adheres to the "Anti-Simulation" protocol by providing a real, useful artifact (Source Code)
 * rather than a fake/corrupt APK.
 */
export class BrowserBuildService {
  private static instance: BrowserBuildService;

  private constructor() {}

  public static getInstance(): BrowserBuildService {
    if (!BrowserBuildService.instance) {
      BrowserBuildService.instance = new BrowserBuildService();
    }
    return BrowserBuildService.instance;
  }

  public async build(project: ProjectData, onLog: (msg: string) => void): Promise<string> {
    onLog("Native Android Build Environment not detected.");
    onLog("Switching to Source Export mode...");
    
    try {
      const zip = new JSZip();
      const folder = zip.folder(project.name || 'Project');

      onLog("Compressing project files...");
      
      // Add all project files to ZIP
      for (const file of project.files) {
        // Remove leading slash if present
        const path = file.path.startsWith('/') ? file.path.substring(1) : file.path;
        
        if (folder) {
            folder.file(path, file.content);
        }
      }
      
      // Add a README explaining how to build
      if (folder) {
          folder.file("README.md", `# ${project.name}\n\nThis project was exported from Ham AI Studio.\n\n## How to Build\n1. Open this folder in Android Studio or AIDE.\n2. Sync Gradle.\n3. Run 'Build APK'.`);
      }

      onLog("Generating ZIP archive...");
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipUrl = URL.createObjectURL(zipBlob);

      onLog("Export Complete! Downloading source code...");
      return zipUrl;

    } catch (e: any) {
      const err = e as Error;
      onLog(`Export Failed: ${err.message}`);
      throw e;
    }
  }
}

export const browserBuildService = BrowserBuildService.getInstance();
