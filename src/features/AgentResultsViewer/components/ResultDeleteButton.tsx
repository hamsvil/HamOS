import React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { useConfirm } from '../../../context/ConfirmContext';

interface ResultDeleteButtonProps {
  onDelete: () => void;
  label?: string;
  isIconOnly?: boolean;
}

export const ResultDeleteButton: React.FC<ResultDeleteButtonProps> = ({ onDelete, label = "Delete", isIconOnly = false }) => {
  const { confirm } = useConfirm();

  const handleClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const confirmed = await confirm('Are you sure you want to permanently delete this result artifact?');
    
    if (confirmed) {
      onDelete();
    }
  };

  return (
    <Button variant="destructive" size="sm" onClick={handleClick}>
      <Trash2 size={14} className={isIconOnly ? "" : "mr-2"} />
      {!isIconOnly && label}
    </Button>
  );
};
