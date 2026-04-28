 
import React from 'react';
import { 
  Sparkles, LayoutDashboard, MessageSquare, Folder, Trash2, Code, Search, 
  Package, GitBranch, Smartphone, Brain, Layout, Database, BarChart, Users, 
  Zap, CloudUpload, Settings, Clock, RefreshCw, ShieldCheck, Terminal, Globe, Bot
} from 'lucide-react';
import { STRINGS } from '../../constants/strings';
import { useProjectStore } from '../../store/projectStore';

interface StudioSidebarProps {
  activeView: 'chat' | 'preview' | 'dashboard';
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  handleSyncMemory: () => void;
  onClearChat: () => void;
  handleDeepScan: () => void;
}

export default function StudioSidebar({
  activeView, setActiveView,
  handleSyncMemory,
  onClearChat,
  handleDeepScan
}: StudioSidebarProps) {
  const isSidebarVisible = useProjectStore(state => state.uiState.isSidebarVisible);
  const activeSidePanel = useProjectStore(state => state.uiState.activeSidePanel);
  const isDeviceMonitorOpen = useProjectStore(state => state.uiState.isDeviceMonitorOpen);
  const isAiLogOpen = useProjectStore(state => state.uiState.isAiLogOpen);
  const isSideBySide = useProjectStore(state => state.uiState.isSideBySide);
  const isCollaborationPanelOpen = useProjectStore(state => state.uiState.isCollaborationPanelOpen);
  const syncStatus = useProjectStore(state => state.uiState.syncStatus);
  const isSyncing = useProjectStore(state => state.uiState.isSyncing);
  const isDeepScanning = useProjectStore(state => state.uiState.isDeepScanning);
  const setUiState = useProjectStore(state => state.setUiState);

  return (
    <div className="w-[52px] bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col items-center py-2 gap-2 z-[40]">
      {/* Logo / Home */}
      <div className="mb-1 p-1.5 bg-blue-500/10 rounded-lg text-blue-400">
        <Sparkles size={20} />
      </div>

      {/* Navigation Icons */}
      <div className="flex-1 flex flex-col gap-1.5 w-full px-1.5 overflow-y-auto scrollbar-none">
        <SidebarButton 
          active={activeView === 'dashboard'} 
          onClick={() => setActiveView('dashboard')} 
          icon={LayoutDashboard} 
          label={STRINGS.SIDEBAR.HOME} 
          activeColor="text-purple-400"
        />
        <SidebarButton 
          active={activeView === 'chat'} 
          onClick={() => setActiveView('chat')} 
          icon={MessageSquare} 
          label="Chat" 
        />
        <SidebarButton 
          active={isSidebarVisible} 
          onClick={() => setUiState({ isSidebarVisible: !isSidebarVisible })} 
          icon={Folder} 
          label={STRINGS.SIDEBAR.FILES} 
          activeColor="text-blue-400"
          activeBg="bg-blue-500/10"
        />
        <SidebarButton 
          active={false} 
          onClick={onClearChat} 
          icon={Trash2} 
          label={STRINGS.SIDEBAR.CLEAR_LOGS} 
          hoverColor="hover:text-red-400"
        />
        <SidebarButton 
          active={activeView === 'preview'} 
          onClick={() => setActiveView('preview')} 
          icon={Code} 
          label={STRINGS.SIDEBAR.PREVIEW} 
        />

        <div className="h-px bg-[var(--border-color)] w-full my-1" />

        <SidebarButton 
          active={activeSidePanel === 'search'} 
          onClick={() => setUiState({ activeSidePanel: activeSidePanel === 'search' ? 'none' : 'search' })} 
          icon={Search} 
          label={STRINGS.SIDEBAR.SEARCH} 
          activeColor="text-blue-400"
        />
        <SidebarButton 
          active={activeSidePanel === 'packages'} 
          onClick={() => setUiState({ activeSidePanel: activeSidePanel === 'packages' ? 'none' : 'packages' })} 
          icon={Package} 
          label="Package Manager" 
          activeColor="text-orange-400"
        />
        <SidebarButton 
          active={activeSidePanel === 'git'} 
          onClick={() => setUiState({ activeSidePanel: activeSidePanel === 'git' ? 'none' : 'git' })} 
          icon={GitBranch} 
          label={STRINGS.SIDEBAR.GIT} 
          activeColor="text-purple-400"
        />
        <SidebarButton 
          active={activeSidePanel === 'terminal'} 
          onClick={() => setUiState({ activeSidePanel: activeSidePanel === 'terminal' ? 'none' : 'terminal' })} 
          icon={Terminal} 
          label={STRINGS.SIDEBAR.TERMINAL} 
          activeColor="text-green-400"
        />
        <SidebarButton 
          active={isDeviceMonitorOpen} 
          onClick={() => setUiState({ isDeviceMonitorOpen: !isDeviceMonitorOpen })} 
          icon={Smartphone} 
          label="Device Monitor" 
          activeColor="text-green-400"
        />
        <SidebarButton 
          active={isAiLogOpen} 
          onClick={() => setUiState({ isAiLogOpen: !isAiLogOpen })} 
          icon={Brain} 
          label="AI Thought Log" 
          activeColor="text-purple-400"
        />
        <SidebarButton 
          active={isDeepScanning} 
          onClick={handleDeepScan} 
          icon={Search} 
          label="Architectural Deep Scan" 
          activeColor="text-blue-400"
          activeBg="bg-blue-500/10"
          isLoading={isDeepScanning}
        />
        <SidebarButton 
          active={isSideBySide} 
          onClick={() => setUiState({ isSideBySide: !isSideBySide })} 
          icon={LayoutDashboard} 
          label="Side-by-Side View" 
          activeColor="text-emerald-400"
        />

        <div className="h-px bg-[var(--border-color)] w-8 mx-auto my-2"></div>

        <SidebarButton onClick={() => setUiState({ isTemplateGalleryOpen: true })} icon={Layout} label="Templates" hoverColor="hover:text-blue-400" />
        <SidebarButton onClick={() => setUiState({ isDatabaseVisualizerOpen: true })} icon={Database} label="Database Schema" hoverColor="hover:text-orange-400" />
        <SidebarButton onClick={() => setUiState({ isAnalyticsDashboardOpen: true })} icon={BarChart} label="Analytics" hoverColor="hover:text-pink-400" />
        <SidebarButton 
          active={isCollaborationPanelOpen} 
          onClick={() => setUiState({ isCollaborationPanelOpen: !isCollaborationPanelOpen })} 
          icon={Users} 
          label="Collaboration" 
          activeColor="text-indigo-400"
          activeBg="bg-indigo-500/10"
        />
      </div>

      {/* Bottom Actions */}
      <div className="flex flex-col gap-2 w-full px-2">
        <SidebarButton onClick={() => setUiState({ isApkBuilderOpen: true })} icon={Zap} label={STRINGS.SIDEBAR.BUILD} hoverColor="hover:text-green-400" />
        <SidebarButton onClick={() => setUiState({ isExportManagerOpen: true })} icon={CloudUpload} label={STRINGS.SIDEBAR.EXPORT_PROJECT} hoverColor="hover:text-blue-400" />
        <SidebarButton onClick={() => setUiState({ isMarketplaceOpen: true })} icon={Package} label="Marketplace" hoverColor="hover:text-orange-400" />
        <SidebarButton onClick={() => setUiState({ isSettingsOpen: true })} icon={Settings} label={STRINGS.SIDEBAR.SETTINGS} />
        <SidebarButton onClick={() => setUiState({ isHistoryOpen: true })} icon={Clock} label="Restore Version" hoverColor="hover:text-yellow-400" />
        
        <button 
          onClick={handleSyncMemory}
          disabled={isSyncing}
          aria-label="Sync Memory"
          className={`p-2.5 rounded-lg transition-all group relative ${syncStatus === 'success' ? 'text-emerald-400 bg-emerald-500/10' : 'text-[var(--text-secondary)] hover:text-emerald-400 hover:bg-[var(--bg-tertiary)]'}`}
        >
          {syncStatus === 'syncing' ? (
            <RefreshCw size={18} className="animate-spin" />
          ) : syncStatus === 'success' ? (
            <ShieldCheck size={18} />
          ) : (
            <Zap size={18} />
          )}
          <span className="absolute left-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--border-color)] pointer-events-none z-50">
            {syncStatus === 'syncing' ? 'Syncing...' : syncStatus === 'success' ? 'Memory Synced' : 'Sync Core Memory'}
          </span>
        </button>
      </div>
    </div>
  );
}

function SidebarButton({ 
  active = false, 
  onClick, 
  icon: Icon, 
  label, 
  activeColor = 'text-[var(--text-primary)]', 
  activeBg = 'bg-[var(--bg-tertiary)]',
  hoverColor = 'hover:text-[var(--text-primary)]',
  isLoading = false
}: any) {
  return (
    <button 
      onClick={onClick}
      disabled={isLoading}
      aria-label={label}
      className={`p-2.5 rounded-lg transition-all group relative ${active ? `${activeBg} ${activeColor}` : `text-[var(--text-secondary)] ${hoverColor} hover:bg-[var(--bg-tertiary)]`} ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
      title={label}
    >
      {isLoading ? <RefreshCw size={18} className="animate-spin" /> : <Icon size={18} />}
      <span className="absolute left-12 bg-[var(--bg-secondary)] text-[var(--text-primary)] text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap border border-[var(--border-color)] pointer-events-none z-50">{label}</span>
    </button>
  );
}
