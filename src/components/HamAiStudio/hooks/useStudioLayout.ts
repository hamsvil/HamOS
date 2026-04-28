 
import { useState, useCallback } from 'react';

export type ActiveView = 'editor' | 'preview' | 'split' | 'database' | 'neural' | 'kanban' | 'whiteboard';
export type SidePanel = 'files' | 'search' | 'git' | 'debug' | 'extensions' | 'settings' | 'ai-chat' | 'none';

export function useStudioLayout() {
  const [activeView, setActiveView] = useState<ActiveView>('editor');
  const [leftPanel, setLeftPanel] = useState<SidePanel>('files');
  const [rightPanel, setRightPanel] = useState<SidePanel>('none');
  const [bottomPanelOpen, setBottomPanelOpen] = useState(true);
  const [activeBottomTab, setActiveBottomTab] = useState<'terminal' | 'problems' | 'output' | 'debug-console'>('terminal');
  
  const toggleLeftPanel = useCallback((panel: SidePanel) => {
    setLeftPanel(prev => prev === panel ? 'none' : panel);
  }, []);

  const toggleRightPanel = useCallback((panel: SidePanel) => {
    setRightPanel(prev => prev === panel ? 'none' : panel);
  }, []);

  const toggleBottomPanel = useCallback(() => {
    setBottomPanelOpen(prev => !prev);
  }, []);

  return {
    activeView,
    setActiveView,
    leftPanel,
    setLeftPanel: toggleLeftPanel,
    rightPanel,
    setRightPanel: toggleRightPanel,
    bottomPanelOpen,
    setBottomPanelOpen,
    toggleBottomPanel,
    activeBottomTab,
    setActiveBottomTab
  };
}
