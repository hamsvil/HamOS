import React from 'react';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { X, Check, GitMerge } from 'lucide-react';

interface DiffViewerProps {
  oldValue: string;
  newValue: string;
  oldTitle?: string;
  newTitle?: string;
  onClose: () => void;
  onAccept?: () => void;
}

export default function DiffViewer({ oldValue, newValue, oldTitle = 'Original', newTitle = 'Modified', onClose, onAccept }: DiffViewerProps) {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex flex-col p-8">
      <div className="bg-[#141414] border border-white/10 rounded-2xl flex flex-col h-full shadow-2xl overflow-hidden">
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-[#1a1a1a]">
          <div className="flex items-center gap-3">
            <GitMerge size={18} className="text-blue-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-widest">Visual Diff Viewer</h3>
          </div>
          <div className="flex items-center gap-2">
            {onAccept && (
              <button 
                onClick={onAccept}
                className="flex items-center gap-2 px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-500 transition-all"
              >
                <Check size={14} />
                Accept Changes
              </button>
            )}
            <button 
              onClick={onClose}
              className="p-1.5 hover:bg-white/10 rounded-md text-gray-400 hover:text-white transition-all"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4 bg-[#050505]">
          <ReactDiffViewer 
            oldValue={oldValue} 
            newValue={newValue} 
            splitView={true}
            leftTitle={oldTitle}
            rightTitle={newTitle}
            compareMethod={DiffMethod.WORDS}
            styles={{
              variables: {
                dark: {
                  diffViewerBackground: '#050505',
                  diffViewerColor: '#fff',
                  addedBackground: 'rgba(16, 185, 129, 0.1)',
                  addedColor: '#10b981',
                  removedBackground: 'rgba(239, 68, 68, 0.1)',
                  removedColor: '#ef4444',
                  wordAddedBackground: 'rgba(16, 185, 129, 0.2)',
                  wordRemovedBackground: 'rgba(239, 68, 68, 0.2)',
                  addedGutterBackground: 'rgba(16, 185, 129, 0.05)',
                  removedGutterBackground: 'rgba(239, 68, 68, 0.05)',
                  gutterBackground: '#141414',
                  gutterColor: '#4b5563',
                  codeFoldGutterBackground: '#1a1a1a',
                  codeFoldBackground: '#141414',
                  emptyLineBackground: '#050505',
                  diffViewerTitleBackground: '#1a1a1a',
                  diffViewerTitleColor: '#9ca3af',
                  diffViewerTitleBorderColor: '#374151',
                }
              }
            }}
            useDarkTheme={true}
          />
        </div>
      </div>
    </div>
  );
}
