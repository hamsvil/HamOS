export interface FilePathBreadcrumbProps {
  path: string;
  onCopy: (path: string) => void;
}

export interface FileStatusIndicatorProps {
  status: 'synced' | 'error' | 'syncing';
}
