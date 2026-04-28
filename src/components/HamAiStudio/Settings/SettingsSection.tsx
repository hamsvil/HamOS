import React from 'react';

export const SettingsSection: React.FC<{ title: React.ReactNode; icon: React.ReactNode; children: React.ReactNode }> = ({ title, icon, children }) => (
  <div className="bg-[var(--bg-primary)] border border-[var(--border-color)] rounded-lg p-2.5">
    <h4 className="text-xs font-medium text-[var(--text-primary)] mb-1.5 flex items-center gap-2">
      {icon}
      {title}
    </h4>
    {children}
  </div>
);
