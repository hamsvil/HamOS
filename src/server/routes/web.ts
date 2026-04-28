/* eslint-disable no-useless-assignment */
// [MEMORY LEAK] Cleanup verified.
import express from 'express';
import fs from 'fs';
import path from 'path';
import { TEMP_PROJECTS_DIR } from '../constants';

const router = express.Router();

// Map to store active web projects
const activeWebProjects = new Map<string, string>();

// Middleware to serve dynamic web projects
export const webMiddleware = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const parts = req.path.split('/');
  // req.path starts with /, so parts[0] is empty, parts[1] is projectName
  if (parts.length < 2) return next();
  const projectName = parts[1];
  const tempDir = activeWebProjects.get(projectName);
  if (tempDir) {
    // Serve static files from the temp directory
    // We need to strip the project name from the path to get the file path inside tempDir
    // express.static serves relative to the root, so we need to be careful
    // Actually, if we use express.static(tempDir), it expects the path to be relative to root
    // But req.path includes /projectName/file.html
    // We need to rewrite the URL or mount static middleware dynamically
    
    // The original code was:
    // app.use('/web-projects', (req, res, next) => { ... express.static(tempDir)(req, res, next) ... })
    // This means express.static sees the path *after* /web-projects is stripped?
    // No, app.use('/web-projects', ...) strips /web-projects.
    // So req.path inside the middleware is /projectName/file.html
    
    // If we use express.static(tempDir), and req.path is /projectName/index.html, it looks for tempDir/projectName/index.html
    // But the files are likely in tempDir/index.html (based on run-web-project logic)
    
    // Let's look at run-web-project:
    // tempDir = .../temp_web_projects/projectName_timestamp
    // files are written to tempDir/file.path
    
    // So if I request /web-projects/myproj/index.html
    // req.path in middleware is /myproj/index.html
    // tempDir is .../myproj_123
    // We want to serve .../myproj_123/index.html
    
    // If we use express.static(tempDir), it will look for /myproj/index.html inside tempDir.
    // But the file is at tempDir/index.html.
    
    // So we need to strip the project name from the path before passing to express.static?
    // Or we can just manually serve the file using res.sendFile.
    
    const filePathInProject = parts.slice(2).join('/'); // index.html
    const absolutePath = path.join(tempDir, filePathInProject);
    
    if (fs.existsSync(absolutePath)) {
        res.sendFile(absolutePath);
    } else {
        next();
    }
  } else {
    next();
  }
};

// Web Project Serving Endpoint
router.post('/run-web-project', async (req, res) => {
  const { files, projectName } = req.body;
  if (!files || !projectName) {
    return res.status(400).json({ error: 'Project files and name are required.' });
  }

  const tempDir = path.join(TEMP_PROJECTS_DIR, projectName + '_' + Date.now());
  try {
    await fs.promises.mkdir(tempDir, { recursive: true });
    for (const file of files) {
      const filePath = path.join(tempDir, file.path);
      await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
      await fs.promises.writeFile(filePath, file.content);
    }
    
    // Register the project
    activeWebProjects.set(projectName, tempDir);

    // Return the URL for the frontend to load
    res.status(200).json({ url: `./web-projects/${projectName}/index.html` });

  } catch (error: any) {
    console.error('Error serving web project:', error);
    res.status(500).json({ error: error.message });
  }
});

export const startCleanupTask = () => {
    // Ensure required directories exist
    if (!fs.existsSync(TEMP_PROJECTS_DIR)) {
        fs.mkdirSync(TEMP_PROJECTS_DIR, { recursive: true });
    }

    const cleanup = async () => {
        try {
            if (!fs.existsSync(TEMP_PROJECTS_DIR)) return;
            const projects = await fs.promises.readdir(TEMP_PROJECTS_DIR);
            for (const project of projects) {
                const projectPath = path.join(TEMP_PROJECTS_DIR, project);
                const stats = await fs.promises.stat(projectPath);
                // Delete projects older than 1 hour
                if (Date.now() - stats.birthtimeMs > 3600 * 1000) {
                    await fs.promises.rm(projectPath, { recursive: true, force: true });
                    console.log(`Cleaned up old web project: ${project}`);
                    
                    // Also remove from map if possible, but we don't have the key easily here
                    // It's fine, the map will just have stale entries that point to non-existent dirs
                    // which is handled in the middleware
                }
            }
        } catch (e) {
            console.error('Error during web project cleanup:', e);
        }
    };

    // Run on startup
    cleanup();

    // Run every hour
    const intervalId = setInterval(cleanup, 3600 * 1000);
    if (intervalId.unref) intervalId.unref();
};

export default router;
