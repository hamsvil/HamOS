import React from 'react';

export default function KeygenTab() {
  return (
    <div className="w-full h-full flex flex-col bg-[var(--bg-secondary)] rounded-xl overflow-hidden relative">
      <div className="p-4 border-b border-[var(--border-color)] bg-black/40 flex justify-between items-center z-10">
        <h2 className="text-xl font-bold font-orbitron text-[var(--accent-primary)] flex items-center gap-2">
          <span className="text-2xl">🔑</span> HAM KEY GEN
        </h2>
        <a 
          href="/keygen-app/" 
          target="_blank" 
          rel="noreferrer"
          className="px-3 py-1 bg-[var(--accent-primary)]/20 text-[var(--accent-primary)] rounded hover:bg-[var(--accent-primary)]/40 transition-colors text-sm"
        >
          Open Standalone
        </a>
      </div>
      
      {/* We serve the Keygen App inside an iframe to prevent CSS/Routing conflicts */}
      <div className="flex-1 w-full bg-black">
        <iframe 
          src="/src/Keygen/artifacts/ham-key-gen/index.html" 
          className="w-full h-full border-none"
          title="Ham Key Gen Application"
        />
      </div>
    </div>
  );
}
