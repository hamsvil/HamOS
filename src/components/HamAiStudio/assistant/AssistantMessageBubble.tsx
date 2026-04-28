import React, { useMemo } from 'react';
import AssistantHeader from './AssistantHeader';
import MessageContentRenderer from './MessageContentRenderer';
import MessageActionsMenu from './MessageActionsMenu';
import FollowUpChips from './FollowUpChips';
import { AssistantStatus } from './assistantTypes';

interface AssistantMessageBubbleProps {
  content: string;
  isStreaming: boolean;
  status?: AssistantStatus;
  timestamp?: string;
  onCopy: () => void;
  onRegenerate?: () => void;
  suggestions?: string[];
  onSuggestionClick?: (text: string) => void;
}

const AssistantMessageBubble = ({
  content,
  isStreaming,
  timestamp,
  onCopy,
  onRegenerate,
  suggestions,
  onSuggestionClick
}: AssistantMessageBubbleProps) => {
  const currentStatus: AssistantStatus = isStreaming ? (content.includes('Executing') ? 'executing' : (content.includes('Planning') ? 'planning' : 'thinking')) : 'done';

  return (
    <div className="group relative flex flex-col w-full max-w-full animate-in fade-in slide-in-from-bottom-2 duration-300">
      <div className="relative overflow-hidden pl-1">
        <AssistantHeader status={currentStatus} timestamp={timestamp} />
        
        <div className="relative z-10 text-[var(--text-primary)] leading-relaxed pl-11">
          <MessageContentRenderer content={content} isStreaming={isStreaming} />
        </div>

        <div className="mt-2 flex items-center justify-start gap-4 pl-11 opacity-0 group-hover:opacity-100 transition-opacity">
          <MessageActionsMenu onCopy={onCopy} onRegenerate={onRegenerate} />
        </div>
      </div>

      {suggestions && suggestions.length > 0 && onSuggestionClick && (
        <div className="pl-11 mt-2">
          <FollowUpChips suggestions={suggestions} onSelect={onSuggestionClick} />
        </div>
      )}
    </div>
  );
};

export default AssistantMessageBubble;
