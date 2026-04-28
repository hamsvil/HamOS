 
import React, { useMemo } from 'react';
import { clsx } from 'clsx';
import { renderNode } from './AndroidXmlRendererHelpers';

interface AndroidXmlRendererProps {
  xmlContent: string;
}

export default function AndroidXmlRenderer({ xmlContent }: AndroidXmlRendererProps) {
  const parsedNode = useMemo(() => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlContent, "text/xml");
      // Check for parsing errors
      const parseError = xmlDoc.getElementsByTagName("parsererror");
      if (parseError.length > 0) {
        return (
          <div className="flex flex-col items-center justify-center h-full p-6 text-center">
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md">
              <h3 className="text-red-400 font-bold mb-2">XML Parsing Error</h3>
              <p className="text-red-300/80 text-xs font-mono break-words">{parseError[0].textContent}</p>
            </div>
          </div>
        );
      }
      return renderNode(xmlDoc.documentElement);
    } catch (e: any) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-6 text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 max-w-md">
            <h3 className="text-red-400 font-bold mb-2">Renderer Error</h3>
            <p className="text-red-300/80 text-xs font-mono break-words">{e.message}</p>
          </div>
        </div>
      );
    }
  }, [xmlContent]);

  return (
    <div className="w-full h-full bg-[#1e1e1e] flex flex-col overflow-hidden relative">
      {/* Android Status Bar */}
      <div className="h-6 bg-black/20 flex items-center justify-between px-4 shrink-0 text-[10px] font-medium text-white/70">
        <span>12:30</span>
        <div className="flex items-center gap-1.5">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h.01"/><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5 12.859a10 10 0 0 1 14 0"/><path d="M8.5 16.429a5 5 0 0 1 7 0"/></svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 18h.01"/><path d="M10 14h.01"/><path d="M14 10h.01"/><path d="M18 6h.01"/></svg>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="16" height="10" x="2" y="7" rx="2" ry="2"/><line x1="22" x2="22" y1="11" y2="13"/></svg>
        </div>
      </div>

      {/* App Content */}
      <div className="flex-1 overflow-y-auto bg-[#1e1e1e] relative text-white">
        {parsedNode || (
          <div className="flex flex-col items-center justify-center h-full text-gray-500 opacity-50">
            <p>No Preview Available</p>
          </div>
        )}
      </div>

      {/* Android Navigation Bar */}
      <div className="h-12 bg-black/40 flex items-center justify-around px-8 shrink-0 border-t border-white/5">
        <div className="w-3 h-3 border-2 border-white/40 rounded-sm rotate-45"></div>
        <div className="w-4 h-4 border-2 border-white/40 rounded-full"></div>
        <div className="w-3.5 h-3.5 border-2 border-white/40 rounded-md"></div>
      </div>
    </div>
  );
}

