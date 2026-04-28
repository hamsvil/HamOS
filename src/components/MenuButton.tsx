import React from 'react';

interface MenuButtonProps {
  icon: any;
  label: string;
  onClick: () => void;
  variant?: 'default' | 'danger';
}

export default function MenuButton({ icon: Icon, label, onClick, variant = 'default' }: MenuButtonProps) {
  return (
    <button 
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all ${
        variant === 'danger' 
          ? 'text-red-400 hover:bg-red-500/10' 
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-primary)]'
      }`}
    >
      {Icon ? <Icon size="1.2rem" /> : <div className="w-[1.2rem] h-[1.2rem] border border-dashed opacity-50 rounded" />}
      <span className="font-medium">{label}</span>
    </button>
  );
}
