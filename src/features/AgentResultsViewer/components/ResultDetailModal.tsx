import React from 'react';
import { AgentResult } from '../../../services/agentObservability/AgentObservabilityService';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Badge } from '../../../components/ui/badge';
import { Download, ExternalLink } from 'lucide-react';

interface ResultDetailModalProps {
  result: AgentResult | null;
  onClose: () => void;
}

export const ResultDetailModal: React.FC<ResultDetailModalProps> = ({ result, onClose }) => {
  if (!result) return null;

  const isImage = result.mimeType.startsWith('image/');
  const isJSON = result.mimeType === 'application/json';
  const isMarkdown = result.mimeType === 'text/markdown';

  return (
    <Dialog open={!!result} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden bg-[var(--bg-secondary)] border-[var(--border-color)]">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">{result.agentName}</Badge>
              <DialogTitle className="text-xl">{result.task || 'Result Artifact'}</DialogTitle>
            </div>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(result.timestamp).toLocaleString()}</span>
              <span>•</span>
              <span>{result.durationMs}ms</span>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto p-6 pt-2">
          {isImage ? (
            <div className="flex justify-center bg-black/20 rounded-lg p-4">
              <img src={result.result} alt="Result" className="max-w-full h-auto rounded shadow-lg" />
            </div>
          ) : isJSON ? (
            <pre className="p-4 bg-black/40 rounded-lg border border-white/5 text-xs font-mono overflow-x-auto">
              {(() => {
                try { return JSON.stringify(JSON.parse(result.result), null, 2); }
                catch (e) { return result.result; }
              })()}
            </pre>
          ) : (
            <div className={`p-4 bg-black/20 rounded-lg border border-white/5 text-sm ${isMarkdown ? 'prose prose-invert max-w-none' : 'font-mono whitespace-pre-wrap'}`}>
              {result.result}
            </div>
          )}
          
          {result.metadata && (
            <div className="mt-6 border-t border-white/5 pt-4">
              <h4 className="text-xs font-bold uppercase text-muted-foreground mb-2 tracking-widest">Metadata</h4>
              <pre className="text-[10px] text-gray-400 bg-white/5 p-2 rounded">
                {JSON.stringify(result.metadata, null, 2)}
              </pre>
            </div>
          )}
        </div>

        <DialogFooter className="p-4 border-t border-white/5 bg-black/20">
          <Button variant="outline" size="sm" onClick={() => {
            const blob = new Blob([result.result], { type: result.mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `result_${result.id}.${result.mimeType.split('/')[1] || 'txt'}`;
            a.click();
          }}>
            <Download size={14} className="mr-2" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => {
            const win = window.open();
            win?.document.write(`<pre>${result.result}</pre>`);
          }}>
            <ExternalLink size={14} className="mr-2" /> Raw View
          </Button>
          <Button onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
