import React from 'react';

const AssistantAvatar = ({ isThinking }: { isThinking?: boolean }) => {
  return (
    <div className="relative shrink-0">
      {isThinking && (
        <div
          className="absolute -inset-1 rounded-full bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 opacity-70 blur-[2px] animate-spin-slow"
        />
      )}
      <div className="relative w-8 h-8 rounded-full bg-[#1e1e1e] flex items-center justify-center border border-white/10 shadow-lg overflow-hidden">
        <svg viewBox="0 0 24 24" className="w-5 h-5 fill-none stroke-white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 4v16M18 4v16M6 12h12" />
          <path d="M12 4v2m0 12v2M4 12h2m12 0h2" strokeOpacity="0.5" strokeWidth="1.5" />
        </svg>
      </div>
      
      {/* Glow dot */}
      <div className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-[#1e1e1e] ${isThinking ? 'bg-cyan-400 animate-pulse' : 'bg-green-500'}`} />
    </div>
  );
};

export default AssistantAvatar;
