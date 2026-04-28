 
import React, { useState, useEffect } from 'react';
import { Play, Pause, Square, SkipForward, ArrowDown, Bug, X } from 'lucide-react';
import { debuggerService, DebugSession } from '../../../services/debuggerService';

interface DebuggerPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DebuggerPanel({ isOpen, onClose }: DebuggerPanelProps) {
  const [session, setSession] = useState<DebugSession | null>(null);
  const [output, setOutput] = useState<string[]>([]);

  useEffect(() => {
    if (isOpen) {
      const unsubscribe = debuggerService.subscribe((s) => {
        setSession(s);
        if (s.status === 'paused') {
            setOutput(prev => [...prev, `Paused at line ${s.currentLine}`]);
        } else if (s.status === 'running') {
            setOutput(prev => [...prev, 'Running...']);
        } else if (s.status === 'stopped') {
            setOutput(prev => [...prev, 'Stopped.']);
        }
      });
      return () => unsubscribe();
    }
  }, [isOpen]);

  const handleStart = () => {
    // For now, hardcode entry file or ask user?
    // We'll assume 'index.js' or 'src/index.ts' converted to js?
    // Or just run the currently open file?
    // Let's assume 'index.js' for simplicity or ask user to select.
    // But for this "Engine" demo, we'll try to run 'index.js'.
    debuggerService.startDebug('index.js');
  };

  const handleStop = () => {
    debuggerService.stop();
  };

  const handleContinue = () => {
    debuggerService.continue();
  };

  const handleStep = () => {
    debuggerService.stepOver();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 h-64 bg-[#141414] border-t border-white/10 z-[90] flex flex-col shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-b border-white/10">
        <div className="flex items-center gap-2">
          <Bug size={16} className="text-orange-400" />
          <span className="text-sm font-semibold text-gray-200">Debugger</span>
          {session && (
            <span className={`text-xs px-2 py-0.5 rounded-full ${
              session.status === 'running' ? 'bg-green-500/20 text-green-400' :
              session.status === 'paused' ? 'bg-yellow-500/20 text-yellow-400' :
              'bg-red-500/20 text-red-400'
            }`}>
              {session.status.toUpperCase()}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
            {!session || session.status === 'stopped' ? (
                <button onClick={handleStart} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors" title="Start Debugging">
                    <Play size={16} />
                </button>
            ) : (
                <>
                    {session.status === 'paused' ? (
                        <button onClick={handleContinue} className="p-1.5 bg-green-600 hover:bg-green-500 text-white rounded transition-colors" title="Continue">
                            <Play size={16} />
                        </button>
                    ) : (
                        <button onClick={() => {}} className="p-1.5 bg-yellow-600/50 text-white/50 rounded cursor-not-allowed" title="Pause (Not Implemented)">
                            <Pause size={16} />
                        </button>
                    )}
                    <button onClick={handleStep} disabled={session.status !== 'paused'} className="p-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors disabled:opacity-50" title="Step Over">
                        <SkipForward size={16} />
                    </button>
                    <button onClick={handleStop} className="p-1.5 bg-red-600 hover:bg-red-500 text-white rounded transition-colors" title="Stop">
                        <Square size={16} />
                    </button>
                </>
            )}
            <button onClick={onClose} className="ml-4 p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
                <X size={16} />
            </button>
        </div>
      </div>
      
      <div className="flex-1 flex overflow-hidden">
        {/* Variables / Call Stack (Placeholder) */}
        <div className="w-1/3 border-r border-white/10 bg-[#0a0a0a] p-2 overflow-y-auto">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Variables</h4>
            {session?.status === 'paused' ? (
                <div className="text-xs font-mono text-gray-300">
                    <div className="flex justify-between hover:bg-white/5 p-1 rounded">
                        <span className="text-blue-400">this</span>
                        <span className="text-gray-500">Object</span>
                    </div>
                    <div className="flex justify-between hover:bg-white/5 p-1 rounded">
                        <span className="text-blue-400">local</span>
                        <span className="text-yellow-400">undefined</span>
                    </div>
                    {/* Mock variables for demo */}
                    <div className="flex justify-between hover:bg-white/5 p-1 rounded">
                        <span className="text-blue-400">i</span>
                        <span className="text-green-400">0</span>
                    </div>
                </div>
            ) : (
                <p className="text-xs text-gray-600 italic">Variables available when paused.</p>
            )}
        </div>
        
        {/* Console / Output */}
        <div className="flex-1 bg-[#0a0a0a] p-2 overflow-y-auto font-mono text-xs">
            <h4 className="text-xs font-bold text-gray-500 uppercase mb-2">Debug Console</h4>
            {output.map((line, i) => (
                <div key={i} className="text-gray-300 border-b border-white/5 py-0.5">{line}</div>
            ))}
            {output.length === 0 && <p className="text-gray-600 italic">Debug output will appear here...</p>}
        </div>
      </div>
    </div>
  );
}
