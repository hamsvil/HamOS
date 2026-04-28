 
import React from 'react';
import { FileSelectionSummaryProps } from './PrivateSourceComponents12.types';

export const FileSelectionSummary = ({ count }: FileSelectionSummaryProps) => (
  <div className="text-xs text-blue-400 bg-blue-900/20 px-2 py-1 rounded-lg border border-blue-900/50">
    {count} item{count !== 1 ? 's' : ''} selected
  </div>
);
