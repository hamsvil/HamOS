import React from 'react';
import { ChatMessage, SelectedFile } from '../types/ai';
import { CLONES } from '../constants/aiClones';
import { ChatHeader } from './AIHubChat/ChatHeader';
import { ChatSettings } from './AIHubChat/ChatSettings';
import { ChatMessageList } from './AIHubChat/ChatMessageList';
import { LiveCallOverlay } from './AIHubChat/LiveCallOverlay';
import { ChatInput } from './AIHubChat/ChatInput';
import { RestoreModal } from './AIHubChat/RestoreModal';
import { ErrorBoundary } from './ErrorBoundary';

interface AIHubChatProps {
  history: ChatMessage[];
  isLoading: boolean;
  loadingProgress: { progress: number; text: string } | null;
  handleCancel: () => void;
  handleSend: (e: React.FormEvent) => void;
  input: string;
  setInput: (val: string) => void;
  selectedFiles: SelectedFile[];
  setSelectedFiles: React.Dispatch<React.SetStateAction<SelectedFile[]>>;
  isRecording: boolean;
  recordingTime: number;
  startRecording: () => void;
  stopRecording: () => void;
  isLiveCall: boolean;
  startLiveCall: () => void;
  setIsLiveCall: (val: boolean) => void;
  liveCallStatus: string;
  activeClone: typeof CLONES[0];
  singularityMode: boolean;
  syncStatus: 'idle' | 'syncing' | 'success';
  handleSyncMemory: () => void;
  showSettings: boolean;
  setShowSettings: (val: boolean) => void;
  externalApiKey: string;
  setExternalApiKey: (val: string) => void;
  customInstruction: string;
  setCustomInstruction: (val: string) => void;
  messagesEndRef: React.RefObject<HTMLDivElement>;
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  visibleCount: number;
  setVisibleCount: React.Dispatch<React.SetStateAction<number>>;
  fileInputRef: React.RefObject<HTMLInputElement>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setShowHistory: (val: boolean) => void;
  checkpoints: any[];
  createCheckpoint: (type?: 'auto' | 'manual') => void;
  performRestore: (checkpoint: any) => void;
  loadCheckpoints: () => void;
   
  safeStorage: any;
  onShellExecute: (cmd: string) => void;
  retryLastMessage: () => void;
  isVaultOpen: boolean;
  setIsVaultOpen: (val: boolean) => void;
}

export default function AIHubChat({
  history,
  isLoading,
  loadingProgress,
  handleCancel,
  handleSend,
  input,
  setInput,
  selectedFiles,
  setSelectedFiles,
  isRecording,
  recordingTime,
  startRecording,
  stopRecording,
  isLiveCall,
  startLiveCall,
  setIsLiveCall,
  liveCallStatus,
  activeClone,
  singularityMode,
  syncStatus,
  handleSyncMemory,
  showSettings,
  setShowSettings,
  externalApiKey,
  setExternalApiKey,
  customInstruction,
  setCustomInstruction,
  messagesEndRef,
  scrollToBottom,
  visibleCount,
  setVisibleCount,
  fileInputRef,
  handleFileUpload,
  setShowHistory,
  checkpoints,
  createCheckpoint,
  performRestore,
  loadCheckpoints,
  safeStorage,
  onShellExecute,
  retryLastMessage,
  isVaultOpen,
  setIsVaultOpen
}: AIHubChatProps) {
  const [showRestore, setShowRestore] = React.useState(false);

  return (
    <div className="flex-1 flex flex-col relative w-full">
        <ErrorBoundary fallback={<div className="p-4 text-red-500">Header Error</div>}>
          <ChatHeader 
            setShowHistory={setShowHistory}
            onOpenRestore={() => {
              loadCheckpoints();
              setShowRestore(true);
            }}
            handleSyncMemory={handleSyncMemory}
            isLoading={isLoading}
            syncStatus={syncStatus}
            activeClone={activeClone}
            singularityMode={singularityMode}
            onOpenVault={() => setIsVaultOpen(true)}
          />
        </ErrorBoundary>

        {showRestore && (
          <ErrorBoundary fallback={<div className="p-4 text-red-500">Restore Modal Error</div>}>
            <RestoreModal
              checkpoints={checkpoints}
              onRestore={(cp) => {
                performRestore(cp);
                setShowRestore(false);
              }}
              onClose={() => setShowRestore(false)}
            />
          </ErrorBoundary>
        )}

        <ErrorBoundary fallback={<div className="p-4 text-red-500">Settings Error</div>}>
          <ChatSettings 
            showSettings={showSettings}
            setShowSettings={setShowSettings}
            externalApiKey={externalApiKey}
            setExternalApiKey={setExternalApiKey}
            safeStorage={safeStorage}
            customInstruction={customInstruction}
            setCustomInstruction={setCustomInstruction}
          />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="flex-1 p-4 text-red-500 overflow-auto">Message List Error. Please refresh.</div>}>
          <ChatMessageList 
            history={history}
            visibleCount={visibleCount}
            setVisibleCount={setVisibleCount}
            messagesEndRef={messagesEndRef}
            scrollToBottom={scrollToBottom}
            isLoading={isLoading}
            loadingProgress={loadingProgress}
            handleCancel={handleCancel}
            activeClone={activeClone}
            onShellExecute={onShellExecute}
            retryLastMessage={retryLastMessage}
          />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-4 text-red-500">Live Call Error</div>}>
          <LiveCallOverlay 
            isLiveCall={isLiveCall}
            setIsLiveCall={setIsLiveCall}
            liveCallStatus={liveCallStatus}
          />
        </ErrorBoundary>

        <ErrorBoundary fallback={<div className="p-4 text-red-500">Input Error</div>}>
          <ChatInput 
            handleSend={handleSend}
            selectedFiles={selectedFiles}
            setSelectedFiles={setSelectedFiles}
            fileInputRef={fileInputRef}
            handleFileUpload={handleFileUpload}
            input={input}
            setInput={setInput}
            isRecording={isRecording}
            recordingTime={recordingTime}
            startRecording={startRecording}
            stopRecording={stopRecording}
            startLiveCall={startLiveCall}
            isLoading={isLoading}
            activeClone={activeClone}
          />
        </ErrorBoundary>
    </div>
  );
}
