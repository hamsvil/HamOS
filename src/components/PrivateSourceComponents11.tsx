 
import React from 'react';
import { AlertTriangle } from 'lucide-react';

export const FileWarningBadge = ({ message }: { message: string }) => (
  <div className="flex items-center gap-1 bg-yellow-500/10 px-2 py-1 rounded-lg border border-yellow-500/50 text-xs text-yellow-400">
    <AlertTriangle size={12} className="text-yellow-400" />
    <span>{message}</span>
  </div>
);
