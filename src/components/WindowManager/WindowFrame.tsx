 
import React, { useRef } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { X, Minus, Square, Copy } from 'lucide-react';
import { WindowState } from '../../types/window';

interface WindowFrameProps {
  window: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onPositionChange: (id: string, x: number, y: number) => void;
  children: React.ReactNode;
}

export const WindowFrame: React.FC<WindowFrameProps> = React.memo(({
  window,
  onClose,
  onMinimize,
  onMaximize,
  onFocus,
  onPositionChange,
  children
}) => {
  const dragControls = useDragControls();
  const constraintsRef = useRef(null);

  if (window.isMinimized) return null;

  const isMaximized = window.isMaximized;

  return (
    <motion.div
      initial={false}
      animate={{
        x: isMaximized ? 0 : window.position.x,
        y: isMaximized ? 0 : window.position.y,
        width: isMaximized ? '100%' : window.size.width,
        height: isMaximized ? '100%' : window.size.height,
        zIndex: window.zIndex,
      }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, mass: 0.5 }}
      drag={!isMaximized}
      dragControls={dragControls}
      dragListener={false}
      dragMomentum={false}
      onDragEnd={(_, info) => {
        onPositionChange(window.id, window.position.x + info.offset.x, window.position.y + info.offset.y);
      }}
      onMouseDown={() => onFocus(window.id)}
      className={`absolute top-0 left-0 flex flex-col bg-[var(--bg-secondary)]/40 backdrop-blur-3xl border border-[var(--border-color)] rounded-2xl shadow-[0_0_40px_rgba(0,0,0,0.2)] overflow-hidden transition-shadow duration-500 ${isMaximized ? 'rounded-none border-none !w-full !h-full' : 'hover:shadow-[0_0_50px_rgba(0,255,204,0.1)]'} ${window.zIndex === 100 ? 'border-[#00ffcc]/30 shadow-[0_0_30px_rgba(0,255,204,0.05)]' : ''}`}
      style={{ pointerEvents: 'auto', willChange: 'transform, width, height' }}
    >
      {/* Window Header */}
      <div 
        className="h-11 bg-[var(--bg-tertiary)]/50 border-b border-[var(--border-color)] flex items-center justify-between px-4 cursor-default select-none shrink-0 group/header"
        onPointerDown={(e) => dragControls.start(e)}
      >
        <div className="flex items-center gap-3">
          <div className={`p-1.5 rounded-lg transition-colors ${window.zIndex === 100 ? 'bg-[#00ffcc]/10 text-[#00ffcc]' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'}`}>
            <window.icon size="1.2rem" />
          </div>
          <span className={`text-[11px] font-mono font-bold tracking-[0.1em] uppercase transition-colors ${window.zIndex === 100 ? 'text-[#00ffcc]' : 'text-[var(--text-secondary)]'}`}>
            {window.title}
          </span>
        </div>

        <div className="flex items-center gap-1.5 opacity-40 group-hover/header:opacity-100 transition-opacity">
          <button 
            onClick={() => onMinimize(window.id)}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90"
          >
            <Minus size="1.2rem" />
          </button>
          <button 
            onClick={() => onMaximize(window.id)}
            className="p-1.5 hover:bg-[var(--bg-tertiary)] rounded-lg transition-all text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:scale-90"
          >
            {isMaximized ? <Copy size="1rem" /> : <Square size="1rem" />}
          </button>
          <button 
            onClick={() => onClose(window.id)}
            className="p-1.5 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all text-[var(--text-secondary)] active:scale-90"
          >
            <X size="1.2rem" />
          </button>
        </div>
      </div>

      {/* Window Content */}
      <div 
        className="flex-1 overflow-hidden relative bg-gradient-to-b from-transparent to-[var(--bg-secondary)]/20"
        style={{ contentVisibility: window.zIndex === 100 ? 'visible' : 'auto' }}
      >
        {children}
        
        {/* Holographic Scanline Effect */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-50 bg-[length:100%_2px,3px_100%]" />
      </div>
    </motion.div>
  );
});
