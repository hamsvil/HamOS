 
import React from 'react';
import { HardDrive, Server } from 'lucide-react';
import { FileStorageQuotaBadgeProps, ServerHealthIndicatorProps } from './PrivateSourceComponents8.types';

export const FileStorageQuotaBadge = ({ used, total }: FileStorageQuotaBadgeProps) => (
  <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg border border-[var(--border-color)] text-xs text-[var(--text-primary)]">
    <HardDrive size={12} className="text-blue-400" />
    <span>{used} / {total}</span>
  </div>
);

export const ServerHealthIndicator = ({ status }: ServerHealthIndicatorProps) => (
  <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] px-2 py-1 rounded-lg border border-[var(--border-color)] text-xs">
    <Server size={12} className={status === 'online' ? 'text-emerald-400' : status === 'offline' ? 'text-red-400' : 'text-yellow-400'} />
    <span className={status === 'online' ? 'text-emerald-400' : status === 'offline' ? 'text-red-400' : 'text-yellow-400'}>{status.toUpperCase()}</span>
  </div>
);
