import React from 'react';
import { Pin } from 'lucide-react';
import { Button } from '../../../components/ui/button';

interface ResultPinButtonProps {
  isPinned: boolean;
  onToggle: () => void;
}

export const ResultPinButton: React.FC<ResultPinButtonProps> = ({ isPinned, onToggle }) => {
  return (
    <Button 
      variant={isPinned ? "default" : "outline"} 
      size="sm" 
      onClick={(e) => { e.stopPropagation(); onToggle(); }}
      className={isPinned ? "bg-yellow-500 hover:bg-yellow-600" : ""}
    >
      <Pin size={14} className="mr-1" fill={isPinned ? "currentColor" : "none"} />
      {isPinned ? "Pinned" : "Pin"}
    </Button>
  );
};
