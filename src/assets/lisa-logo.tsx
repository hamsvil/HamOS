import React from 'react';

export const LisaLogo = ({ className = "w-6 h-6", pulse = false }: { className?: string; pulse?: boolean }) => {
  return (
    <svg 
      viewBox="0 0 100 100" 
      className={className}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <path 
        d="M50 5L89.5 27.5V72.5L50 95L10.5 72.5V27.5L50 5Z" 
        stroke="currentColor" 
        strokeWidth="2"
        className="text-violet-500"
      />
      <path 
        d="M50 15L80.5 32.5V67.5L50 85L19.5 67.5V32.5L50 15Z" 
        stroke="currentColor" 
        strokeWidth="1"
        strokeDasharray="4 4"
        className="text-cyan-400 opacity-50"
      />
      <circle 
        cx="50" 
        cy="50" 
        r="8" 
        fill="currentColor" 
        className={`text-indigo-600 ${pulse ? 'animate-pulse' : ''}`} 
      />
      <circle 
        cx="50" 
        cy="50" 
        r="4" 
        fill="currentColor" 
        className="text-violet-300" 
      />
      <g className="text-cyan-300">
        <circle cx="50" cy="25" r="2" fill="currentColor" />
        <circle cx="71.5" cy="37.5" r="2" fill="currentColor" />
        <circle cx="71.5" cy="62.5" r="2" fill="currentColor" />
        <circle cx="50" cy="75" r="2" fill="currentColor" />
        <circle cx="28.5" cy="62.5" r="2" fill="currentColor" />
        <circle cx="28.5" cy="37.5" r="2" fill="currentColor" />
      </g>
    </svg>
  );
};
