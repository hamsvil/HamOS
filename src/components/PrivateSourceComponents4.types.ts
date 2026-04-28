export interface SelectionCheckboxProps {
  selected: boolean;
  onToggle: () => void;
}

export interface SelectAllCheckboxProps {
  selected: boolean;
  onToggle: () => void;
}

export interface BulkActionToolbarProps {
  count: number;
  onDelete: () => void;
  onZip: () => void;
  onDownload: () => void;
}
