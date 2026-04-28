import React from 'react';
import { ExternalLink, FileText, Globe } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export interface CitationSource {
  id: string;
  title: string;
  url?: string;
  snippet?: string;
  type: 'web' | 'doc' | 'local';
}

interface CitationProps {
  source: CitationSource;
  index: number;
}

export const Citation: React.FC<CitationProps> = ({ source, index }) => {
  const [isHovered, setIsHovered] = React.useState(false);

  return (
    <span className="relative inline-block mx-0.5 align-baseline">
      <motion.button
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="inline-flex items-center justify-center w-5 h-5 text-[10px] font-bold rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30 hover:bg-blue-500 hover:text-white transition-colors cursor-help"
      >
        {index}
      </motion.button>

      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] shadow-2xl z-50 pointer-events-none"
          >
            <div className="flex items-start gap-2 mb-2">
              <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 shrink-0">
                {source.type === 'web' ? <Globe size={14} /> : <FileText size={14} />}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-bold text-[var(--text-primary)] truncate">
                  {source.title}
                </h4>
                {source.url && (
                  <div className="flex items-center gap-1 text-[10px] text-blue-400 truncate">
                    <ExternalLink size={10} />
                    <span>{new URL(source.url).hostname}</span>
                  </div>
                )}
              </div>
            </div>
            
            {source.snippet && (
              <p className="text-[10px] text-[var(--text-secondary)] line-clamp-3 leading-relaxed italic">
                "{source.snippet}"
              </p>
            )}
            
            <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-[var(--bg-secondary)] border-r border-b border-[var(--border-color)] rotate-45" />
          </motion.div>
        )}
      </AnimatePresence>
    </span>
  );
};
