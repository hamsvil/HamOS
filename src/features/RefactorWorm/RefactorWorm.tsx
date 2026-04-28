import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Zap, Trash2, Code } from 'lucide-react';

const RefactorWorm: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-200">
       <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          Auto-Refactoring Worms
        </h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            OPFS BACKGROUND OPTIMIZATION
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-indigo-950/20 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              Optimization Queue
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-indigo-500/10">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm">Tailwind Class Deduplication</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">DONE</span>
            </div>
            <div className="flex items-center justify-between p-3 rounded bg-white/5 border border-indigo-500/10 opacity-60">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-slate-500" />
                <span className="text-sm text-slate-400">Dead Code Elimination (Nightly)</span>
              </div>
              <span className="text-[10px] text-slate-500 font-mono">WAITING</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-indigo-950/20 border-indigo-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Code className="w-4 h-4 text-indigo-400" />
              Worm Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[200px] flex items-center justify-center border border-dashed border-indigo-500/10 rounded">
             <div className="text-center">
               <div className="flex gap-1 justify-center mb-4">
                 {[...Array(8)].map((_, i) => (
                   <div key={i} className="w-1 h-8 bg-indigo-500/30 rounded-full animate-pulse" style={{ animationDelay: `${i * 0.1}s` }} />
                 ))}
               </div>
               <p className="text-xs text-muted-foreground font-mono">Crawling src/features for patterns...</p>
               <p className="text-[10px] text-indigo-400/40 mt-2 font-mono">[STUB: Background Worms Active]</p>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RefactorWorm;
