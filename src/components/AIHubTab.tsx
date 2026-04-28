 
import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import AIHubSidebar from './AIHubSidebar';
import AIHubChat from './AIHubChat';
import CloneSelector from './AIHub/CloneSelector';
import { useAIHubLogic } from './AIHub/useAIHubLogic';
import { safeStorage } from '../utils/storage';
import { useSupremeProtocol } from '../hooks/useSupremeProtocol';
import { Activity, ShieldCheck, Zap } from 'lucide-react';
import { revokeAllBlobUrls } from '../utils/blobRegistry';
import { ErrorBoundary } from './ErrorBoundary';
import { GlobalDropzone } from './AIHub/GlobalDropzone';
import { DocumentVault } from './AIHub/DocumentVault';

export default function AIHubTab() {
  useSupremeProtocol();
  const logic = useAIHubLogic();

  useEffect(() => {
    return () => {
      revokeAllBlobUrls();
    };
  }, []);

  return (
    <ErrorBoundary>
      <GlobalDropzone onFilesDropped={logic.handleFileDrop} />
      <DocumentVault isOpen={logic.isVaultOpen} onClose={() => logic.setIsVaultOpen(false)} />
      <motion.div 
        initial={{ opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        className="flex h-full bg-zinc-950/40 backdrop-blur-md rounded-xl border border-zinc-800/50 overflow-hidden shadow-2xl relative"
      >
        {/* Singularity HUD v1.0-OMEGA Status */}
        <div className="absolute top-3 right-6 z-50 flex items-center gap-4 pointer-events-none">
          <div className="flex items-center gap-2">
            <ShieldCheck size={12} className="text-emerald-400" />
            <span className="text-[9px] font-bold text-emerald-400/80 uppercase tracking-widest">Hardened</span>
          </div>
          <div className="flex items-center gap-2">
            <Zap size={12} className="text-amber-400" />
            <span className="text-[9px] font-bold text-amber-400/80 uppercase tracking-widest">120FPS</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity size={10} className="text-violet-400 animate-pulse" />
            <span className="text-[8px] font-black text-violet-400 uppercase tracking-widest">Singularity Hub v1.0-OMEGA</span>
          </div>
        </div>
        
        <AIHubSidebar
          showHistory={logic.showHistory}
          setShowHistory={logic.setShowHistory}
          sessions={logic.sessions}
          currentSessionId={logic.currentSessionId}
          setCurrentSessionId={logic.setCurrentSessionId}
          createNewSession={logic.createNewSession}
          clearAllHistory={logic.clearAllHistory}
          deleteSession={logic.deleteSession}
        />

        <div className="flex-1 flex flex-col relative overflow-hidden">
          <CloneSelector
            activeClone={logic.activeClone}
            setActiveClone={logic.setActiveClone}
            isCloneMenuOpen={logic.isCloneMenuOpen}
            setIsCloneMenuOpen={logic.setIsCloneMenuOpen}
            showSettings={logic.showSettings}
            setShowSettings={logic.setShowSettings}
          />

          <AnimatePresence mode="wait">
            <motion.div
              key={logic.currentSessionId}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="flex-1 flex flex-col overflow-hidden"
            >
              <AIHubChat
                history={logic.history}
                isLoading={logic.isLoading}
                loadingProgress={logic.loadingProgress}
                handleCancel={logic.handleCancel}
                handleSend={logic.handleSend}
                input={logic.input}
                setInput={logic.setInput}
                selectedFiles={logic.selectedFiles}
                setSelectedFiles={logic.setSelectedFiles}
                isRecording={logic.isRecording}
                recordingTime={logic.recordingTime}
                startRecording={logic.startRecording}
                stopRecording={logic.stopRecording}
                isLiveCall={logic.isLiveCall}
                startLiveCall={logic.startLiveCall}
                setIsLiveCall={logic.setIsLiveCall}
                liveCallStatus={logic.liveCallStatus}
                activeClone={logic.activeClone}
                singularityMode={logic.singularityMode}
                syncStatus={logic.syncStatus}
                handleSyncMemory={logic.handleSyncMemory}
                showSettings={logic.showSettings}
                setShowSettings={logic.setShowSettings}
                externalApiKey={logic.externalApiKey}
                setExternalApiKey={logic.setExternalApiKey}
                customInstruction={logic.customInstruction}
                setCustomInstruction={logic.setCustomInstruction}
                messagesEndRef={logic.messagesEndRef}
                scrollToBottom={logic.scrollToBottom}
                visibleCount={logic.visibleCount}
                setVisibleCount={logic.setVisibleCount}
                fileInputRef={logic.fileInputRef}
                handleFileUpload={logic.handleFileUpload}
                setShowHistory={logic.setShowHistory}
                checkpoints={logic.checkpoints}
                createCheckpoint={logic.createCheckpoint}
                performRestore={logic.performRestore}
                loadCheckpoints={logic.loadCheckpoints}
                safeStorage={safeStorage}
                onShellExecute={logic.handleShellExecute}
                retryLastMessage={logic.retryLastMessage}
                isVaultOpen={logic.isVaultOpen}
                setIsVaultOpen={logic.setIsVaultOpen}
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </motion.div>
    </ErrorBoundary>
  );
}
