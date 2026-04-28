 
import React, { useState, useEffect } from 'react';
import { HardDrive } from 'lucide-react';
import { DiskUsageBar } from './PrivateSourceComponents';
import { DiskUsageProps } from './PrivateSourceDiskUsage.types';

export const PrivateSourceDiskUsage: React.FC<DiskUsageProps> = ({ apiCall }) => {
  const [totalSize, setTotalSize] = useState<number>(0);
  const MAX_SIZE = 100 * 1024 * 1024; // 100MB limit

  const fetchUsage = async () => {
    try {
      const data = await apiCall('disk-usage');
      setTotalSize(data.totalSize);
    } catch (err) {
      console.error('Failed to fetch disk usage', err);
    }
  };

  useEffect(() => {
    fetchUsage();
    const interval = setInterval(fetchUsage, 10000);
    return () => clearInterval(interval);
  }, []);

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const usagePercent = Math.min(100, (totalSize / MAX_SIZE) * 100);

  return (
    <div className="flex items-center gap-2 px-3 py-1.5 bg-[var(--bg-tertiary)] rounded-lg text-xs text-[var(--text-secondary)] border border-[var(--border-color)] whitespace-nowrap">
      <HardDrive size={14} className="text-blue-400" />
      <div className="flex flex-col gap-0.5">
        <div className="flex items-center gap-1">
          <span className="font-medium text-[var(--text-primary)]">{formatSize(totalSize)}</span>
          <span className="text-[9px] opacity-50">/ 100 MB</span>
        </div>
        <DiskUsageBar usage={usagePercent} />
      </div>
    </div>
  );
};
