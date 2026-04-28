 
import React from 'react';

interface VirtualKeyboardProps {
  onKeyPress: (key: string) => void;
}

export default function VirtualKeyboard({ onKeyPress }: VirtualKeyboardProps) {
  const keys = ['ESC', 'TAB', 'CTRL', 'ALT', 'CTRL+C', 'CTRL+D', '/', '-', '|', 'HOME', 'END', 'PGUP', 'PGDN', 'DEL', 'UP', 'DOWN', 'LEFT', 'RIGHT'];

  return (
    <div className="flex gap-1 p-1 bg-[#2d2d2d] overflow-x-auto border-t border-white/10 scrollbar-hide">
      {keys.map(key => (
        <button
          key={key}
          onClick={() => onKeyPress(key)}
          className="px-3 py-1.5 bg-[#3d3d3d] text-white/80 text-xs rounded hover:bg-[#4d4d4d] active:bg-[#5d5d5d] transition-colors font-mono min-w-[40px] whitespace-nowrap"
        >
          {key}
        </button>
      ))}
    </div>
  );
}
