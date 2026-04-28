 
import { useEffect, useRef } from 'react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';
import { yjsService } from '../../../services/yjsService';

interface UseYjsSyncProps {
  projectId?: string;
  path: string;
  editorRef: React.MutableRefObject<any>;
  monacoRef: React.MutableRefObject<any>;
  value: string;
  onToggleBreakpoint?: (line: number) => void;
  isEditorReady?: boolean;
}

export const useYjsSync = ({
  projectId,
  path,
  editorRef,
  monacoRef,
  value,
  onToggleBreakpoint,
  isEditorReady
}: UseYjsSyncProps) => {
  const providerRef = useRef<WebsocketProvider | null>(null);
  const docRef = useRef<Y.Doc | null>(null);
  const bindingRef = useRef<MonacoBinding | null>(null);

  useEffect(() => {
    if (projectId && path && editorRef.current && isEditorReady) {
      // Cleanup previous binding
      if (bindingRef.current) bindingRef.current.destroy();

      yjsService.setProjectId(projectId);
      const doc = yjsService.getDoc(path);
      const provider = yjsService.getProvider(path);

      if (!provider) return;

      const type = doc.getText('monaco');
      
      // Initialize text if empty and we have a value
      if (type.length === 0 && value) {
        type.insert(0, value);
      }

      const binding = new MonacoBinding(
        type,
        editorRef.current.getModel(),
        new Set([editorRef.current]),
        provider.awareness
      );

      // Sync Breakpoints
      const breakpointsMap = doc.getMap('breakpoints');
      
      // Initial load
      const remoteBreakpoints = breakpointsMap.get(path) as number[] || [];
      if (remoteBreakpoints.length > 0 && onToggleBreakpoint) {
        // We can't easily update parent state from here without causing loops if not careful
        // For now, we'll just listen to remote changes
      }

      const observer = (event: any) => {
        if (event.keysChanged.has(path)) {
          const newBreakpoints = breakpointsMap.get(path) as number[];
          // Update decorations
          if (editorRef.current && monacoRef.current) {
            const monaco = monacoRef.current;
            const editor = editorRef.current;
            const model = editor.getModel();
            if (!model) return;
            
            const newDecorations = (newBreakpoints || []).map((line: number) => ({
              range: new monaco.Range(line, 1, line, 1),
              options: {
                isWholeLine: true,
                glyphMarginClassName: 'breakpoint-glyph',
                glyphMarginHoverMessage: { value: 'Breakpoint (Shared)' }
              }
            }));

            const oldDecorations = model.getAllDecorations()
              .filter((d: any) => d.options.glyphMarginClassName === 'breakpoint-glyph')
              .map((d: any) => d.id);

            editor.deltaDecorations(oldDecorations, newDecorations);
          }
        }
      };

      breakpointsMap.observe(observer);

      docRef.current = doc;
      providerRef.current = provider;
      bindingRef.current = binding;

      return () => {
        breakpointsMap.unobserve(observer);
        if (bindingRef.current) bindingRef.current.destroy();
        // Do not destroy doc/provider here, let YjsService manage their lifecycle
      };
    }
  }, [projectId, path, isEditorReady]);

  return { docRef, providerRef, bindingRef };
};
