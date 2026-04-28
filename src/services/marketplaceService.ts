/* eslint-disable no-useless-assignment */
/* eslint-disable no-useless-catch */
import { extensionService } from './extensionService';
import { vfs } from './vfsService';
import { safeStorage } from '../utils/storage';

export interface Extension {
  id: string;
  name: string;
  version: string;
  author: string;
  description: string;
  url?: string;
  installed?: boolean;
}

const REGISTRY_URL = 'https://raw.githubusercontent.com/ham-ai-studio/extensions/main/registry.json';

export class MarketplaceService {
  private static instance: MarketplaceService;
  private installedExtensions: Set<string> = new Set();

  private constructor() {
    const saved = safeStorage.getItem('ham_installed_extensions');
    if (saved) {
      try {
        this.installedExtensions = new Set(JSON.parse(saved));
        this.installedExtensions.forEach(id => this.activateExtension(id));
      } catch (e) {
        // Failed to load installed extensions
      }
    }
  }

  public static getInstance(): MarketplaceService {
    if (!MarketplaceService.instance) {
      MarketplaceService.instance = new MarketplaceService();
    }
    return MarketplaceService.instance;
  }

  public async getAvailableExtensions(): Promise<Extension[]> {
    try {
      const response = await fetch(REGISTRY_URL);
      if (!response.ok) throw new Error('Failed to fetch registry');
      const extensions: Extension[] = await response.json();
      
      return extensions.map(ext => ({
        ...ext,
        installed: this.installedExtensions.has(ext.id)
      }));
    } catch (error) {
      const extensions: Extension[] = [
        { id: 'ham-hello-world', name: 'Hello World', version: '1.0.0', description: 'A real extension example.', author: 'HamEngine', url: 'https://raw.githubusercontent.com/ham-ai-studio/extensions/main/packages/hello-world/index.js' },
        { id: 'ham-theme-dark-pro', name: 'Dark Pro Theme', version: '1.2.0', description: 'A premium dark theme for Ham AiStudio.', author: 'HamEngine' },
        { id: 'ham-git-lens', name: 'GitLens+', version: '2.0.1', description: 'Supercharge your Git integration with advanced history and blame.', author: 'GitMaster' },
        { id: 'ham-ai-copilot', name: 'AI Copilot Pro', version: '3.0.0', description: 'Advanced AI code completion and refactoring.', author: 'AILabs' },
        { id: 'ham-prettier', name: 'Prettier', version: '1.5.0', description: 'Opinionated code formatter for consistent style.', author: 'HamEngine' },
        { id: 'ham-docker-manager', name: 'Docker Manager', version: '0.8.0', description: 'Manage your containers directly from the IDE.', author: 'DevOpsTools' },
        { id: 'ham-sqlite-viewer', name: 'SQLite Viewer', version: '1.1.0', description: 'Browse and edit SQLite databases visually.', author: 'DataMaster' }
      ];
      return extensions.map(ext => ({
        ...ext,
        installed: this.installedExtensions.has(ext.id)
      }));
    }
  }

  public async installExtension(id: string) {
    if (this.installedExtensions.has(id)) return;
    
    try {
        const extensions = await this.getAvailableExtensions();
        const ext = extensions.find(e => e.id === id);
        if (!ext) throw new Error(`Extension ${id} not found`);

        if (ext.url) {
            const response = await fetch(ext.url);
            if (!response.ok) throw new Error(`Failed to download extension ${id}`);
            const code = await response.text();
            
            // Save to VFS (user scope to persist)
            await vfs.writeFile(`/.ham/extensions/${id}/index.js`, code, 'user');
        }

        this.installedExtensions.add(id);
        this.save();
        
        await this.activateExtension(id);
    } catch (e) {
        throw e;
    }
  }

  public async uninstallExtension(id: string) {
    this.installedExtensions.delete(id);
    this.save();
    try {
        await vfs.deleteFile(`/.ham/extensions/${id}/index.js`);
    } catch (e) {
        // Ignore
    }
  }

  private async activateExtension(id: string) {
    try {
      let code: string | null = null;
      try {
          code = await vfs.readFile(`/.ham/extensions/${id}/index.js`);
      } catch (e) {
          // Not found
      }

      if (code) {
        const blob = new Blob([code], { type: 'application/javascript' });
        const url = URL.createObjectURL(blob);
        
        try {
            const module = await import(/* @vite-ignore */ url);
            if (module && typeof module.activate === 'function') {
                extensionService.registerExtension({
                    id,
                    name: id,
                    version: '1.0.0',
                    activate: module.activate,
                    deactivate: module.deactivate || (() => {})
                });
            }
        } finally {
            URL.revokeObjectURL(url);
        }
      } else {
        extensionService.registerExtension({
          id,
          name: id,
          version: '1.0.0',
          activate: (context) => {
             // Placeholder
          },
          deactivate: () => {}
        });
      }
    } catch (e) {
      // Failed to activate extension
    }
  }

  private save() {
    safeStorage.setItem('ham_installed_extensions', JSON.stringify(Array.from(this.installedExtensions)));
  }
}

export const marketplaceService = MarketplaceService.getInstance();
