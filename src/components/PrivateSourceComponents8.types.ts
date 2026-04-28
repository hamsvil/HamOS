export interface FileStorageQuotaBadgeProps {
  used: string;
  total: string;
}

export interface ServerHealthIndicatorProps {
  status: 'online' | 'offline' | 'degraded';
}
