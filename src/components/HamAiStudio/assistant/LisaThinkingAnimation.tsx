import React from 'react';

const LisaThinkingAnimation = () => {
  return (
    <div className="relative w-12 h-12 flex items-center justify-center">
      {/* Central Hex (Static/Small Pulse) */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-4 h-4 bg-gradient-to-br from-indigo-500 to-violet-500 rounded-sm rotate-45 animate-pulse shadow-[0_0_10px_rgba(139,92,246,0.5)]" />
      </div>

      {/* Orbiting Dots */}
      <div className="absolute inset-0 animate-[spin_3s_linear_infinite]">
        {[0, 60, 120, 180, 240, 300].map((deg, i) => (
          <div
            key={i}
            className="absolute top-1/2 left-1/2 w-1.5 h-1.5 bg-cyan-400 rounded-full shadow-[0_0_5px_rgba(34,211,238,0.8)]"
            style={{
              transform: `rotate(${deg}deg) translate(18px) rotate(-${deg}deg)`,
              opacity: 1 - (i * 0.1),
              animation: `pulse 1.5s ease-in-out infinite ${i * 0.2}s`
            }}
          />
        ))}
      </div>

      {/* Ripple Effects */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-full h-full border border-violet-500/20 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
        <div className="w-3/4 h-3/4 border border-cyan-500/10 rounded-full animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
      </div>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.3); opacity: 1; }
        }
      `}} />
    </div>
  );
};

export default LisaThinkingAnimation;
