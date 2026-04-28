/* eslint-disable no-useless-assignment */
import { EventEmitter } from 'events';
import { vfs } from './vfsService';

export interface Extension {
  id: string;
  name: string;
  version: string;
  activate: (context: ExtensionContext) => void;
  deactivate: () => void;
}

export interface ExtensionContext {
  registerCommand: (command: string, callback: (...args: any[]) => unknown) => void;
  registerView: (viewId: string, component: React.ComponentType) => void;
  vfs: typeof import('./vfsService').vfs;
  showToast: (message: string, type?: 'success' | 'error' | 'info' | 'warning') => void;
  subscriptions: { dispose: () => void }[];
}

class ExtensionService extends EventEmitter {
  private static instance: ExtensionService;
  private extensions: Map<string, Extension> = new Map();
  private commands: Map<string, (...args: any[]) => unknown> = new Map();
  private views: Map<string, React.ComponentType> = new Map();

  private constructor() {
    super();
  }

  public static getInstance(): ExtensionService {
    if (!ExtensionService.instance) {
      ExtensionService.instance = new ExtensionService();
    }
    return ExtensionService.instance;
  }

  public registerExtension(extension: Extension) {
    if (this.extensions.has(extension.id)) {
      // Extension is already registered
      return;
    }

    const context: ExtensionContext = {
      registerCommand: (command, callback) => {
        this.commands.set(command, callback);
      },
      registerView: (viewId, component) => {
        this.views.set(viewId, component);
        this.emit('viewRegistered', viewId);
      },
      vfs: vfs,
      showToast: (message, type = 'info') => {
        window.dispatchEvent(new CustomEvent('ham-toast', { detail: { message, type } }));
      },
      subscriptions: []
    };

    try {
      extension.activate(context);
      this.extensions.set(extension.id, extension);
    } catch (error) {
      // Failed to activate extension
    }
  }

  public executeCommand(command: string, ...args: any[]) {
    const callback = this.commands.get(command);
    if (callback) {
      return callback(...args);
    } else {
      // Command not found
    }
  }

  public getView(viewId: string) {
    return this.views.get(viewId);
  }

  public getExtensions() {
    return Array.from(this.extensions.values());
  }
}

export const extensionService = ExtensionService.getInstance();
