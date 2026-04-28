 
import { useEffect, useRef } from 'react';
import { Monaco } from '@monaco-editor/react';
import { AiWorkerService } from '../../../services/aiWorkerService';

// LRU Cache for FIM to prevent redundant API calls
const fimCache = new Map<string, string>();

export const useFIMGhostText = (monaco: Monaco | null, editor: any, isEnabled: boolean = true) => {
  const providerRef = useRef<any>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!monaco || !editor || !isEnabled) return;

    providerRef.current = monaco.languages.registerInlineCompletionsProvider('*', {
      provideInlineCompletions: async (model, position, context, token) => {
        // Only trigger on automatic typing or explicit invoke
        if (context.triggerKind !== monaco.languages.InlineCompletionTriggerKind.Automatic && 
            context.triggerKind !== monaco.languages.InlineCompletionTriggerKind.Invoke) {
          return { items: [] };
        }

        const textUntilPosition = model.getValueInRange({
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column
        });

        const textAfterPosition = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: position.column,
          endLineNumber: model.getLineCount(),
          endColumn: model.getLineMaxColumn(model.getLineCount())
        });

        // Don't trigger on completely empty files
        if (textUntilPosition.trim() === '' && textAfterPosition.trim() === '') {
          return { items: [] };
        }

        // Check LRU Cache first (instant response)
        const cacheKey = textUntilPosition.slice(-50) + '|' + textAfterPosition.slice(0, 50);
        if (fimCache.has(cacheKey)) {
          const cachedText = fimCache.get(cacheKey);
          if (cachedText) {
            return {
              items: [{
                insertText: cachedText,
                range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
              }]
            };
          }
        }

        // Debounce to prevent spamming API on every keystroke
        return new Promise((resolve) => {
          if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
          
          debounceTimerRef.current = setTimeout(async () => {
            if (token.isCancellationRequested) {
              resolve({ items: [] });
              return;
            }

            try {
              const prompt = `You are an expert code completion engine.
I will provide the code BEFORE the cursor and the code AFTER the cursor.
You must provide ONLY the exact code that should be inserted at the cursor position to complete the logic.
Do NOT include markdown formatting, explanations, or repeat the before/after code.

BEFORE CURSOR:
${textUntilPosition.slice(-1500)}

AFTER CURSOR:
${textAfterPosition.slice(0, 1500)}

INSERTION:`;

              const response = await AiWorkerService.generateContent({
                model: 'gemini-2.5-flash', // Fast model for FIM
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                config: {
                  temperature: 0.1,
                  maxOutputTokens: 128,
                },
                fallbackProviders: ['anthropic', 'openai']
              });

              // Closure Token Cancellation: Drop response if user moved cursor
              if (token.isCancellationRequested) {
                resolve({ items: [] });
                return;
              }

              let completion = response.text.trim();
              
              // Clean up completion (remove markdown if AI ignored instructions)
              completion = completion.replace(/^```[\w]*\n/, '').replace(/\n```$/, '');

              if (completion) {
                // Update LRU Cache (max 50 items)
                if (fimCache.size >= 50) {
                  const firstKey = fimCache.keys().next().value;
                  if (firstKey) fimCache.delete(firstKey);
                }
                fimCache.set(cacheKey, completion);

                resolve({
                  items: [{
                    insertText: completion,
                    range: new monaco.Range(position.lineNumber, position.column, position.lineNumber, position.column)
                  }]
                });
                return;
              }
            } catch (error) {
              if (error instanceof Error && error.message !== 'ABORTED') {
                console.error("FIM Ghost Text Error:", error);
              }
            }
            resolve({ items: [] });
          }, 400); // 400ms debounce
        });
      },
      freeInlineCompletions: () => {}
    });

    return () => {
      if (providerRef.current) {
        providerRef.current.dispose();
      }
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [monaco, editor, isEnabled]);
};
