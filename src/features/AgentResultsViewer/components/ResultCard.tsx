import React from 'react';
import { AgentResult } from '../../../services/agentObservability/AgentObservabilityService';
import { Card, CardContent, CardFooter, CardHeader } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Pin, Trash2, Clock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

interface ResultCardProps {
  result: AgentResult;
  onClick: () => void;
  onDelete: () => void;
  onTogglePin: () => void;
  isSelected: boolean;
  onSelect: () => void;
}

export const ResultCard: React.FC<ResultCardProps> = ({ 
  result, onClick, onDelete, onTogglePin, isSelected, onSelect 
}) => {
  const timeStr = new Date(result.timestamp).toLocaleString();
  
  const isImage = result.mimeType.startsWith('image/');
  const isJSON = result.mimeType === 'application/json';

  return (
    <Card 
      className={`group relative overflow-hidden transition-all hover:shadow-lg hover:border-primary/50 cursor-pointer ${
        isSelected ? 'ring-2 ring-primary border-primary' : 'bg-[var(--bg-secondary)]/30'
      }`}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest('button')) return;
        onClick();
      }}
    >
      <div 
        className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => { e.stopPropagation(); onSelect(); }}
      >
        <input type="checkbox" checked={isSelected} readOnly className="w-4 h-4 rounded border-primary" />
      </div>

      <CardHeader className="p-3 pb-0 flex flex-row items-center justify-between space-y-0">
        <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-tighter">
          {result.agentName}
        </Badge>
        <div className="flex items-center gap-1">
          <button 
            className={`p-1 rounded hover:bg-white/10 transition-colors ${result.pinned ? 'text-yellow-500' : 'text-gray-500 opacity-0 group-hover:opacity-100'}`}
            onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
          >
            <Pin size={14} fill={result.pinned ? 'currentColor' : 'none'} />
          </button>
          <button 
            className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </CardHeader>
      
      <CardContent className="p-3">
        <div className="aspect-video mb-2 rounded bg-black/40 flex items-center justify-center overflow-hidden border border-white/5">
          {isImage ? (
             <img src={result.result} alt="Result Preview" className="w-full h-full object-cover" />
          ) : isJSON ? (
            <FileText size={32} className="text-blue-400 opacity-50" />
          ) : (
            <FileText size={32} className="text-gray-400 opacity-50" />
          )}
        </div>
        <h4 className="text-sm font-semibold line-clamp-1 mb-1">{result.task || 'Unnamed Task'}</h4>
        <p className="text-xs text-muted-foreground line-clamp-2 h-8">
          {result.result.substring(0, 100)}
        </p>
      </CardContent>
      
      <CardFooter className="p-3 pt-0 flex items-center justify-between text-[10px] text-muted-foreground">
        <div className="flex items-center gap-1">
          <Clock size={10} />
          {timeStr}
        </div>
        <div className="flex items-center gap-1">
          {result.status === 'ok' ? (
            <CheckCircle2 size={10} className="text-green-500" />
          ) : (
            <AlertCircle size={10} className="text-red-500" />
          )}
          {result.durationMs}ms
        </div>
      </CardFooter>
    </Card>
  );
};
