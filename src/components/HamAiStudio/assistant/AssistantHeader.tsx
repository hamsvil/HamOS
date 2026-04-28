import React from 'react';
import AssistantAvatar from './AssistantAvatar';
import { AssistantStatus } from './assistantTypes';

interface AssistantHeaderProps {
  status: AssistantStatus;
  timestamp?: string;
}

const AssistantHeader = ({ status, timestamp }: AssistantHeaderProps) => {
  const isThinking = status === 'thinking' || status === 'planning' || status === 'executing';
  
  return (
    <div className="flex items-center gap-3 mb-2">
      <AssistantAvatar isThinking={isThinking} />
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-[var(--text-primary)]">HAM Assistant</span>
          {timestamp && <span className="text-[10px] text-[var(--text-secondary)] font-medium">{timestamp}</span>}
        </div>
      </div>
    </div>
  );
};

export default AssistantHeader;
