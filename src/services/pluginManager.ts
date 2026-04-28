/* eslint-disable no-useless-assignment */
import { PluginAPI, SidebarItem, StatusBarItem, ContextMenuAction } from './plugin/PluginAPI';

export interface HamPlugin {
  id: string;
  name: string;
  version: string;
  activate: (api: PluginAPI) => void;
  deactivate: () => void;
}

export class PluginManager {
  private static instance: PluginManager;
  private plugins: Map<string, HamPlugin> = new Map();
  private sidebarItems: Map<string, SidebarItem> = new Map();
  private statusBarItems: Map<string, StatusBarItem> = new Map();
  private contextMenuActions: Map<string, ContextMenuAction> = new Map();
  private commands: Map<string, (...args: any[]) => void> = new Map();
  private state: Map<string, unknown> = new Map();

  private constructor() {}

  public static getInstance(): PluginManager {
    if (!PluginManager.instance) {
      PluginManager.instance = new PluginManager();
    }
    return PluginManager.instance;
  }

  private createAPI(pluginId: string): PluginAPI {
    return {
      registerSidebarItem: (item) => this.sidebarItems.set(item.id, item),
      registerStatusBarItem: (item) => this.statusBarItems.set(item.id, item),
      registerContextMenuAction: (action) => this.contextMenuActions.set(action.id, action),
      registerCommand: (id, callback) => this.commands.set(id, callback),
      executeCommand: (id, ...args) => {
        const cmd = this.commands.get(id);
        if (cmd) cmd(...args);
      },
      getActiveEditor: () => (window as unknown as { activeEditor?: any }).activeEditor,
      onDidOpenEditor: (callback) => {
        // Simple event listener for now
        window.addEventListener('ham-editor-opened', (e: Event) => callback((e as CustomEvent).detail.editor));
      },
      readFile: async (path) => {
        const { vfs } = await import('./vfsService');
        return await vfs.readFile(path);
      },
      writeFile: async (path, content) => {
        const { vfs } = await import('./vfsService');
        await vfs.writeFile(path, content);
      },
      getState: (key) => this.state.get(`${pluginId}.${key}`),
      setState: (key, value) => this.state.set(`${pluginId}.${key}`, value),
    };
  }

  public loadPlugin(plugin: HamPlugin) {
    if (this.plugins.has(plugin.id)) {
      return;
    }
    try {
      const api = this.createAPI(plugin.id);
      plugin.activate(api);
      this.plugins.set(plugin.id, plugin);
    } catch (error) {
      // Failed to activate plugin
    }
  }

  public unloadPlugin(id: string) {
    const plugin = this.plugins.get(id);
    if (plugin) {
      plugin.deactivate();
      this.plugins.delete(id);
      // Cleanup UI contributions
      for (const [key, item] of this.sidebarItems) {
        if (item.id.startsWith(id)) this.sidebarItems.delete(key);
      }
    }
  }

  public getSidebarItems(): SidebarItem[] {
    return Array.from(this.sidebarItems.values());
  }

  public getStatusBarItems(): StatusBarItem[] {
    return Array.from(this.statusBarItems.values());
  }

  public getContextMenuActions(): ContextMenuAction[] {
    return Array.from(this.contextMenuActions.values());
  }

  public getLoadedPlugins(): HamPlugin[] {
    return Array.from(this.plugins.values());
  }
}

export const pluginManager = PluginManager.getInstance();
