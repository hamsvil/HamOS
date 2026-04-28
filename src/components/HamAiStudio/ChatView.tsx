 
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MessageSquare, Play, Layout, LayoutDashboard, Trash2, Sparkles, ChevronDown, Clock } from 'lucide-react';
import { Virtuoso, VirtuosoHandle } from 'react-virtuoso';
import ChatMessage from './ChatMessage';
import ChatInput from './ChatInput';
import NeuralNetworkVisualizer from './NeuralNetworkVisualizer';
import { ChatMessageData, ProjectData, AgentActivity } from './types';
import { safeStorage } from '../../utils/storage';
import { useConfirm } from '../../context/ConfirmContext';

interface ChatViewProps {
  isSplitView: boolean;
  isLoading: boolean;
  history: ChatMessageData[];
  agentActivities: AgentActivity[];
  timer: number;
  progress: number;
  input: string;
  setInput: (value: string) => void;
  handleSend: (e?: React.FormEvent, promptOverride?: string) => void;
  showSuggestions: boolean;
  handleSuggestionClick: (text: string) => void;
  handleMicClick: () => void;
  handleAttachClick: () => void;
  handlePlanningClick?: () => void;
  handleManualPlanningClick?: () => void;
  handleManualInstructionClick?: () => void;
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  setShowSuggestions: React.Dispatch<React.SetStateAction<boolean>>;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  handleRestore: (project: ProjectData) => void;
  handleViewChanges: (project: ProjectData) => void;
  handleCancel: () => void;
  activeView: 'chat' | 'preview' | 'dashboard';
  setActiveView: (view: 'chat' | 'preview' | 'dashboard') => void;
  isMobile: boolean;
  setIsSplitView: (isSplit: boolean) => void;
  isLocalMode: boolean;
  setIsLocalMode: (isLocal: boolean) => void;
  setIsHistoryOpen: (isOpen: boolean) => void;
  isBuildDisabled?: boolean;
  buildError?: string | null;
  selectedFile?: any;
}

import { useProjectStore } from '../../store/projectStore';

export default function ChatView({
  isSplitView, isLoading, history, agentActivities, timer, progress, input, setInput, handleSend,
  showSuggestions, handleSuggestionClick, handleMicClick, handleAttachClick, handlePlanningClick, handleManualPlanningClick, handleManualInstructionClick, handleFileChange,
  fileInputRef, setShowSuggestions, messagesEndRef,
  handleRestore, handleViewChanges, handleCancel, activeView, setActiveView, isMobile, setIsSplitView,
  isLocalMode, setIsLocalMode, setIsHistoryOpen,
  isBuildDisabled, buildError, selectedFile
}: ChatViewProps) {
  const virtuosoRef = useRef<VirtuosoHandle>(null);
  const [_engineName, setEngineName] = useState('Ham Engine Quantum');
  const [_isEngineDropdownOpen, setIsEngineDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { confirm } = useConfirm();
  const setHistory = useProjectStore(state => state.setHistory);

  const handleFixError = useCallback((errorMsg: string) => {
    handleSend(undefined, `Tolong perbaiki error berikut:\n\n${errorMsg}`);
  }, [handleSend]);

  const handleIgnoreError = useCallback((messageId: string) => {
    setHistory(prev => prev.filter(msg => msg.id !== messageId));
  }, [setHistory]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsEngineDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const _handleEngineSelect = (modelId: string) => {
    safeStorage.setItem('ham_ai_model', modelId);
    setIsEngineDropdownOpen(false);
    setEngineName('Ham Agentic Shadow');
  };

  useEffect(() => {
    const updateEngineName = () => {
      setEngineName('Ham Agentic Shadow');
    };
    
    updateEngineName();
    const interval = setInterval(updateEngineName, 2000);
    return () => clearInterval(interval);
  }, []);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;
    if (history.length > 0) {
      // Small delay to ensure rendering is done
      timeoutId = setTimeout(() => {
        virtuosoRef.current?.scrollToIndex({ index: history.length - 1, align: 'end', behavior: 'smooth' });
      }, 100);
    }
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [history.length, isLoading]);

  // Internal Timer Logic removed as it's now handled by parent hook

  const virtuosoContext = React.useMemo(() => ({
    isLoading,
    agentActivities,
    timer,
    progress,
    handleCancel,
    isBuildDisabled,
    buildError,
    selectedFile
  }), [isLoading, agentActivities, timer, progress, handleCancel, isBuildDisabled, buildError, selectedFile]);

  const VirtuosoFooter = useCallback(({ context }: any) => (
    <div className="pb-4">
      {context.isLoading && (
        <div className="px-3 md:px-4 py-2">
          <ChatMessage 
            message={{ role: 'ai', content: '' }} 
            isLoading={true} 
            activities={context.agentActivities} 
            timer={context.timer}
            progress={context.progress}
            _onCancel={context.handleCancel}
            onFixError={handleFixError}
            onIgnoreError={handleIgnoreError}
            isBuildDisabled={context.isBuildDisabled}
            buildError={context.buildError}
            selectedFile={context.selectedFile}
          />
        </div>
      )}
      <div ref={messagesEndRef} />
    </div>
  ), [handleFixError, handleIgnoreError, messagesEndRef]);

  const virtuosoComponents = React.useMemo(() => ({
    Footer: VirtuosoFooter
  }), [VirtuosoFooter]);

  const handleClearChat = async () => {
    if (await confirm('Are you sure you want to clear the chat history?')) {
      // We need a way to clear history. We can do it by passing a clearHistory function or just setting history to [] if we have the setter.
      // But we don't have setHistory here. We can dispatch an event or add a prop.
      // For now, let's dispatch a custom event that MainContent or StudioSidebar can listen to.
      window.dispatchEvent(new CustomEvent('ham-clear-chat'));
    }
  };

  return (
    <div className={`flex-1 flex flex-col bg-[var(--bg-primary)] overflow-hidden relative ${isSplitView ? 'border-r border-[var(--border-color)]' : ''}`}>
      {isLoading && <NeuralNetworkVisualizer />}
      
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-[var(--border-color)] bg-[var(--bg-secondary)]/50 backdrop-blur-sm z-20">
        <div className="relative" ref={dropdownRef}>
          <div className="flex items-center gap-3 bg-[var(--bg-tertiary)] px-3 py-2 rounded border border-blue-500/20">
            <Sparkles size={16} className="text-blue-400 animate-pulse" />
            <span className="text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wider">Super Assistant (Ham Agentic Shadow)</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button 
              onClick={handleClearChat}
              className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
              title="Clear Chat History"
            >
              <Trash2 size={14} />
              Clear
            </button>
          )}
          <button 
            onClick={() => setIsHistoryOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:text-blue-400 hover:bg-blue-500/10 rounded transition-colors"
            title="Restore Version / History"
          >
            <Clock size={14} />
            Restore Version
          </button>
        </div>
      </div>
      
      <div className="flex-1 min-h-0 relative z-10">
        {history.length === 0 && !isLoading ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
            <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20 shadow-lg shadow-blue-500/5">
              <Sparkles size={36} className="text-blue-400" />
            </div>
            <h3 className="text-xl font-bold text-[var(--text-primary)] mb-3">How can I help you today?</h3>
            <p className="text-base text-[var(--text-secondary)] max-w-lg">
              I'm Ham Engine Singularity, your AI coding assistant. I can build apps, fix bugs, explain code, and help you design your project.
            </p>
          </div>
        ) : (
          <Virtuoso
            ref={virtuosoRef}
            style={{ height: '100%' }}
            data={history}
            context={virtuosoContext}
            followOutput={'auto'}
            itemContent={(index, msg) => (
              <div className="px-4 md:px-6 py-3">
                <ChatMessage 
                  key={msg.id || index} 
                  message={msg} 
                  isStreaming={isLoading && index === history.length - 1 && msg.role === 'ai'}
                  onRestore={handleRestore}
                  onViewChanges={handleViewChanges}
                  onFixError={handleFixError}
                  onIgnoreError={handleIgnoreError}
                  isBuildDisabled={isBuildDisabled}
                  buildError={buildError}
                  selectedFile={selectedFile}
                />
              </div>
            )}
            components={virtuosoComponents}
          />
        )}
      </div>
      
      <div className="bg-[var(--bg-primary)] pt-3 pb-4 px-4 md:px-6 z-20 border-t border-[var(--border-color)] relative">
        <ChatInput 
          input={input} 
          setInput={setInput} 
          handleSend={handleSend} 
          handleCancel={handleCancel}
          isLoading={isLoading} 
          handleMicClick={handleMicClick}
          handleAttachClick={handleAttachClick}
          handlePlanningClick={handlePlanningClick}
          handleManualPlanningClick={handleManualPlanningClick}
          handleManualInstructionClick={handleManualInstructionClick}
          showSuggestions={showSuggestions && history.length === 0}
          setShowSuggestions={setShowSuggestions}
          handleSuggestionClick={handleSuggestionClick}
          handleFileChange={handleFileChange}
          fileInputRef={fileInputRef}
          _isLocalMode={isLocalMode}
          setIsLocalMode={setIsLocalMode}
        />
        
        {/* Toggle Chat / Preview - Full Width */}
        <div className="flex mt-3 gap-3 w-full">
          <div className="bg-[var(--bg-secondary)] p-1 rounded-full border border-[var(--border-color)] flex items-center shadow-lg w-full">
            <button 
              onClick={() => setActiveView('dashboard')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'dashboard' ? 'bg-purple-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <LayoutDashboard size={14} />
              Dash
            </button>
            <button 
              onClick={() => setActiveView('chat')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'chat' ? 'bg-blue-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <MessageSquare size={14} />
              Chat
            </button>
            <button 
              onClick={() => setActiveView('preview')}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${activeView === 'preview' ? 'bg-green-600 text-white shadow-sm' : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'}`}
            >
              <Play size={14} />
              Code
            </button>
          </div>
          {!isMobile && (
            <button 
              onClick={() => setIsSplitView(!isSplitView)}
              className={`p-2 rounded-full border border-[var(--border-color)] transition-all ${isSplitView ? 'bg-blue-600 text-white' : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}
              title={isSplitView ? "Exit Split View" : "Split View"}
            >
              <Layout size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
