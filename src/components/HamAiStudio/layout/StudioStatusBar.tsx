import React from 'react';
import { GitBranch, AlertCircle, CheckCircle, Bell, Wifi, WifiOff, RefreshCw, UserCheck } from 'lucide-react';
import { agentPersonaRegistry } from '../../../sAgent/AgentPersonaRegistry';

interface StudioStatusBarProps {
  branch?: string;
  isOnline?: boolean;
  errorCount?: number;
  warningCount?: number;
  isSaving?: boolean;
  progress?: number;
  timer?: number;
}

export const StudioStatusBar: React.FC<StudioStatusBarProps> = ({
  branch = 'main',
  isOnline = true,
  errorCount = 0,
  warningCount = 0,
  isSaving = false,
  progress = 0,
  timer = 0
}) => {
  const persona = agentPersonaRegistry.getPersona('lisa-core');

  return (
    <footer className="h-6 bg-[#007acc] text-white flex items-center justify-between px-3 text-[10px] select-none">
      <div className="flex items-center gap-4">
        {persona && (
          <div className="flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded-full border border-white/30 text-[9px] font-bold">
            <UserCheck size={10} />
            <span>Agent Persona Active: {persona.name}</span>
          </div>
        )}
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <GitBranch size={10} />
          <span>{branch}</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <AlertCircle size={10} />
          <span>{errorCount}</span>
          <div className="w-[1px] h-3 bg-white/30 mx-1" />
          <CheckCircle size={10} />
          <span>{warningCount}</span>
        </div>
        {isSaving && (
          <div className="flex items-center gap-2 px-2 bg-white/10 rounded ml-2">
            <RefreshCw size={10} className="animate-spin" />
            <span className="font-bold">AI Progress: {progress}%</span>
            <span className="opacity-70">({timer}s)</span>
          </div>
        )}
      </div>

      <div className="flex items-center gap-4">
        {isSaving && <span className="animate-pulse">Saving...</span>}
        <div className="flex items-center gap-1">
          <span>UTF-8</span>
        </div>
        <div className="flex items-center gap-1">
          <span>TypeScript React</span>
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer" title={isOnline ? "Online" : "Offline"}>
          {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
        </div>
        <div className="flex items-center gap-1 hover:bg-white/10 px-1 rounded cursor-pointer">
          <Bell size={12} />
        </div>
      </div>
    </footer>
  );
};
