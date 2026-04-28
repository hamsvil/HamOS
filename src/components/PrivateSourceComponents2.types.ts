export interface FileDetailsModalProps {
  file: any;
  onClose: () => void;
}

export interface RenameModalProps {
  name: string;
  onRename: (n: string) => void;
  onClose: () => void;
}

export interface CreateFolderModalProps {
  onCreate: (n: string) => void;
  onClose: () => void;
}

export interface UploadProgressProps {
  progress: number;
}

export interface FileActionMenuProps {
  actions: any[];
}

export interface SortDropdownProps {
  onSort: (k: string) => void;
}

export interface ViewModeToggleProps {
  mode: 'grid' | 'list';
  onToggle: () => void;
}

export interface FileExtensionBadgeProps {
  name: string;
}

export interface BreadcrumbItemProps {
  name: string;
  onClick: () => void;
}

export interface ErrorMessageProps {
  msg: string;
}

export interface SuccessToastProps {
  msg: string;
}

export interface PasswordInputProps {
  value: string;
  onChange: (v: string) => void;
}

export interface FileGridProps {
  children: React.ReactNode;
}

export interface FileListProps {
  children: React.ReactNode;
}

export interface ActionTooltipProps {
  text: string;
}

export interface FileContextMenuProps {
  x: number;
  y: number;
  onClose: () => void;
  actions: { label: string; icon: React.ReactNode; onClick: () => void; variant?: 'danger' | 'default' }[];
}
