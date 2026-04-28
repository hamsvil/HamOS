import React from 'react';

const StreamingCursor = () => {
  return (
    <span className="inline-flex items-center justify-center ml-1 align-middle">
      <span className="w-1.5 h-3 bg-cyan-400/80 rounded-sm animate-[pulse_0.8s_ease-in-out_infinite] shadow-[0_0_8px_rgba(34,211,238,0.6)]" />
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { opacity: 0.2; transform: scaleY(0.8); }
          50% { opacity: 1; transform: scaleY(1.1); }
        }
      `}} />
    </span>
  );
};

export default StreamingCursor;
