/* eslint-disable no-useless-assignment */
import { vfs } from './vfsService';
import { useProjectStore } from '../store/projectStore';

export const aiToolsService = {
  async readFile(path: string): Promise<string> {
    try {
      // Check shadow buffer first for uncommitted changes
      const shadowContent = useProjectStore.getState().shadowBuffers[path];
      if (shadowContent === '__DELETED__' || shadowContent === null) {
        return `Error reading file: File ${path} has been deleted.`;
      }
      if (shadowContent !== undefined) {
        return shadowContent;
      }
      return await vfs.readFile(path);
    } catch (e: any) {
      return `Error reading file: ${e.message}`;
    }
  },

  async listDir(path: string): Promise<string[]> {
    try {
      let entries: string[] = [];
      try {
        entries = await vfs.readdir(path);
      } catch (e) {
        // Directory might only exist in shadow buffer
      }
      
      const shadowBuffers = useProjectStore.getState().shadowBuffers;
      const shadowEntries = new Set<string>();
      
      const dirPrefix = path === '/' ? '/' : path + '/';
      for (const p of Object.keys(shadowBuffers)) {
          if (shadowBuffers[p] === null || shadowBuffers[p] === '__DELETED__') continue;
          if (p.startsWith(dirPrefix)) {
              const relativePath = p.substring(dirPrefix.length);
              const parts = relativePath.split('/');
              if (parts.length > 0 && parts[0]) {
                  shadowEntries.add(parts[0]);
              }
          }
      }
      
      let allEntries = Array.from(new Set([...entries, ...Array.from(shadowEntries)]));
      allEntries = allEntries.filter(entry => {
          const fullPath = path === '/' ? `/${entry}` : `${path}/${entry}`;
          return shadowBuffers[fullPath] !== null && shadowBuffers[fullPath] !== '__DELETED__';
      });
      
      if (allEntries.length === 0 && entries.length === 0 && shadowEntries.size === 0) {
          return [`Error listing directory: Directory not found or empty.`];
      }
      
      return allEntries;
    } catch (e: any) {
      return [`Error listing directory: ${e.message}`];
    }
  },

  async searchCode(query: string): Promise<string> {
    try {
      const results: string[] = [];
      const project = useProjectStore.getState().project;
      const shadowBuffers = useProjectStore.getState().shadowBuffers;
      
      if (!project) return 'Error: Project not loaded.';

      // Search in VFS tracked files
      for (const file of project.files) {
        if (file.path.includes('node_modules') || file.path.includes('.git') || file.path.includes('dist')) continue;
        
        let content = file.content;
        // Override with shadow buffer if exists
        const shadowContent = shadowBuffers[file.path];
        if (shadowContent === '__DELETED__' || shadowContent === null) continue;
        if (shadowContent !== undefined) {
          content = shadowContent;
        }

        try {
          if (content.includes(query) || new RegExp(query).test(content)) {
            results.push(`Match found in ${file.path}`);
          }
        } catch (regexErr) {
          // Fallback to simple string inclusion if regex is invalid
          if (content.includes(query)) {
            results.push(`Match found in ${file.path}`);
          }
        }
      }

      // Search in newly created files in shadow buffer that aren't in project.files yet
      for (const [path, content] of Object.entries(shadowBuffers)) {
        if (content === '__DELETED__' || content === null) continue;
        if (!project.files.some(f => f.path === path)) {
           try {
             if (content.includes(query) || new RegExp(query).test(content)) {
               results.push(`Match found in ${path} (Unsaved)`);
             }
           } catch (regexErr) {
             if (content.includes(query)) {
               results.push(`Match found in ${path} (Unsaved)`);
             }
           }
        }
      }
      
      return results.length > 0 ? results.join('\n') : 'No matches found.';
    } catch (e: any) {
      return `Error searching code: ${e.message}`;
    }
  }
};
