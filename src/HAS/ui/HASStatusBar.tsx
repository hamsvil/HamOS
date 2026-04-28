 
import React from 'react';
export const HASStatusBar = () => (
    <div className="fixed top-0 left-0 w-full bg-zinc-900 border-b border-zinc-800 text-zinc-300 text-xs px-4 py-1.5 flex justify-between items-center z-50 shadow-md">
        <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div> [SOVEREIGN T1]</span>
            <span className="text-zinc-500">|</span>
            <span className="text-zinc-400">Zero-Cost Pragmatism Active</span>
        </div>
        <div className="flex items-center gap-4">
            <span className="text-green-400">0 Errors</span>
            <span className="text-blue-400">120fps</span>
        </div>
    </div>
);