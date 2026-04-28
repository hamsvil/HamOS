export interface SidebarItem {
  id: string;
  title: string;
  icon: string;
  component: React.ComponentType;
}

export interface StatusBarItem {
  id: string;
  text: string;
  tooltip?: string;
  command?: string;
}

export interface ContextMenuAction {
  id: string;
  label: string;
  command: string;
}

export interface PluginAPI {
  registerSidebarItem: (item: SidebarItem) => void;
  registerStatusBarItem: (item: StatusBarItem) => void;
  registerContextMenuAction: (action: ContextMenuAction) => void;
  registerCommand: (id: string, callback: (...args: any[]) => void) => void;
  executeCommand: (id: string, ...args: any[]) => void;
  getActiveEditor: () => any;
  onDidOpenEditor: (callback: (editor: any) => void) => void;
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  getState: (key: string) => any;
  setState: (key: string, value: any) => void;
}
