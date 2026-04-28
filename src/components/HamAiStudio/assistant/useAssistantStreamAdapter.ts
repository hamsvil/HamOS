import { useState, useEffect, useCallback, useRef } from 'react';
import { AssistantEvent, AssistantStatus, ToolCall, FileEdit, StepItem } from './assistantTypes';

export const useAssistantStreamAdapter = (rawContent: string, isStreaming: boolean) => {
  const [events, setEvents] = useState<AssistantEvent[]>([]);
  const lastProcessedRef = useRef(0);
  const accumulatedRef = useRef('');

  const parseContent = useCallback((content: string) => {
    const newEvents: AssistantEvent[] = [];
    
    // Simple text chunking for now
    // In a real implementation, we would use regex to detect tool calls, file edits, etc.
    // Based on useAgenticAiSend, the model might emit XML tags or markdown
    
    // Regex for tool calls (approximate based on XmlParser)
    const toolCallRegex = /<tool_call name="([^"]+)">([\s\S]*?)<\/tool_call>/g;
    const fileEditRegex = /<(?:code|edit) path="([^"]+)">([\s\S]*?)<\/(?:code|edit)>/g;
    const thoughtRegex = /<thought>([\s\S]*?)<\/thought>/g;

    // For simplicity in this UI overhaul, we'll treat the whole content as text_chunk 
    // but we can try to separate some known structures if they exist.
    
    // 1. Detect Status
    let status: AssistantStatus = 'thinking';
    if (content.includes('<executing') || content.includes('Executing')) status = 'executing';
    if (content.includes('<planning') || content.includes('Planning')) status = 'planning';
    if (!isStreaming) status = 'done';
    
    newEvents.push({ type: 'status_change', status });

    // 2. Text Content (Legacy fallback + progress)
    // We'll treat the whole thing as a text chunk for the MessageContentRenderer to handle markdown
    newEvents.push({ type: 'text_chunk', content });

    // 3. Extract tool calls if they are finished
    let match;
    while ((match = toolCallRegex.exec(content)) !== null) {
      try {
        const args = JSON.parse(match[2] || '{}');
        newEvents.push({
          type: 'tool_call_end',
          toolCall: {
            id: `tool-${match.index}`,
            name: match[1],
            arguments: args,
            status: 'success'
          }
        });
      } catch (e) {
        // partial or invalid JSON
      }
    }

    return newEvents;
  }, [isStreaming]);

  useEffect(() => {
    if (rawContent !== accumulatedRef.current) {
      accumulatedRef.current = rawContent;
      const parsed = parseContent(rawContent);
      setEvents(parsed);
    }
  }, [rawContent, parseContent]);

  return events;
};
