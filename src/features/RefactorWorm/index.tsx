import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Scissors, Zap, Trash2, Code, Loader2, FileCode, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface RefactorTask {
  id: string;
  file: string;
  operation: string;
  progress: number;
  status: 'pending' | 'active' | 'completed' | 'failed';
}

const RefactorWormContent: React.FC = () => {
  const [tasks, setTasks] = useState<RefactorTask[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1200));
        setTasks([
          { id: '1', file: 'src/services/aiHub/core/engine.ts', operation: 'Dead Code Elimination', progress: 100, status: 'completed' },
          { id: '2', file: 'src/components/HamAiStudio/index.tsx', operation: 'Tailwind Class Optimization', progress: 45, status: 'active' },
          { id: '3', file: 'src/lib/utils.ts', operation: 'Type Safety Audit', progress: 0, status: 'pending' },
          { id: '4', file: 'src/server.ts', operation: 'Middleware Refactor', progress: 0, status: 'pending' },
        ]);
      } catch (err) {
        setError('Refactor engine disconnected');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
            Auto-Refactoring Worms
          </h1>
          <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/30">QUANTUM OPTIMIZER</Badge>
        </div>
        <div className="flex items-center gap-2">
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />}
          <div className="px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-mono">
            OPFS BACKGROUND ACTIVE
          </div>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 text-red-400 flex items-center gap-2">
            <AlertCircle size={16} />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-indigo-950/20 border-indigo-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2">
              <Zap className="w-5 h-5 text-indigo-400" />
              Optimization Pipeline
            </CardTitle>
            <Button variant="outline" size="sm" className="border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
              Trigger Global Audit
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[450px] pr-4">
              {isLoading && tasks.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mb-4" />
                  <p className="text-slate-500">Injecting refactor worms into filesystem...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {tasks.map((task) => (
                    <div key={task.id} className="p-4 rounded-lg bg-slate-900/50 border border-indigo-500/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded bg-indigo-500/10 ${task.status === 'active' ? 'animate-pulse' : ''}`}>
                            <FileCode size={18} className="text-indigo-400" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-slate-100">{task.operation}</h3>
                            <p className="text-xs text-slate-500 font-mono">{task.file}</p>
                          </div>
                        </div>
                        {task.status === 'completed' ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <span className="text-[10px] font-mono text-indigo-400 uppercase">{task.status}</span>
                        )}
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-mono text-slate-500">
                          <span>PROGRESS</span>
                          <span>{task.progress}%</span>
                        </div>
                        <Progress value={task.progress} className="h-1 bg-indigo-500/10" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-indigo-950/20 border-indigo-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                Worm Activity Monitor
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex flex-col items-center justify-center border border-dashed border-indigo-500/20 rounded-lg">
                <div className="flex gap-1 justify-center mb-4">
                  {[...Array(12)].map((_, i) => (
                    <div 
                      key={i} 
                      className={`w-1 bg-indigo-500/40 rounded-full ${isLoading ? 'animate-bounce' : ''}`} 
                      style={{ 
                        height: `${20 + Math.random() * 60}%`,
                        animationDelay: `${i * 0.1}s` 
                      }} 
                    />
                  ))}
                </div>
                <p className="text-[10px] text-muted-foreground font-mono text-center px-4 uppercase tracking-widest">
                  Scanning abstract syntax trees for anti-patterns...
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-indigo-950/20 border-indigo-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Trash2 className="w-4 h-4 text-red-400" />
                Cleanup Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase">Lines Deleted</p>
                  <p className="text-xl font-bold text-red-400">1,242</p>
                </div>
                <div className="p-3 rounded bg-white/5 border border-white/5">
                  <p className="text-[10px] text-slate-500 uppercase">Files Healed</p>
                  <p className="text-xl font-bold text-emerald-400">48</p>
                </div>
              </div>
              <p className="text-[10px] text-indigo-400/40 font-mono text-center italic">
                Refactor worms auto-run at 02:00 AM UTC
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const RefactorWorm: React.FC = () => (
  <ErrorBoundary>
    <RefactorWormContent />
  </ErrorBoundary>
);

export default RefactorWorm;

const Badge: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className }) => (
  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${className}`}>
    {children}
  </span>
);
