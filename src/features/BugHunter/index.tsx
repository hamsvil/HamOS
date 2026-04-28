import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, ShieldAlert, Zap, Terminal, Bot, AlertTriangle, Info, CheckCircle2, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ErrorBoundary } from '@/components/ErrorBoundary';

interface BugItem {
  id: string;
  title: string;
  severity: 'critical' | 'warning' | 'info';
  status: 'open' | 'fixing' | 'resolved';
  timestamp: string;
  file: string;
}

const BugHunterContent: React.FC = () => {
  const [bugs, setBugs] = useState<BugItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Simulate real backend connection
    const fetchBugs = async () => {
      try {
        setIsLoading(true);
        // In real app, this would be an API call
        await new Promise(resolve => setTimeout(resolve, 1500));
        setBugs([
          { id: '1', title: 'Circular dependency in AIHub hooks', severity: 'critical', status: 'open', timestamp: new Date().toISOString(), file: 'src/components/AIHub/hooks/useAIHubChat.ts' },
          { id: '2', title: 'Potential memory leak in MediaStream cleanup', severity: 'warning', status: 'fixing', timestamp: new Date().toISOString(), file: 'src/features/HCamera/index.tsx' },
          { id: '3', title: 'Missing prop types validation', severity: 'info', status: 'resolved', timestamp: new Date().toISOString(), file: 'src/components/ui/button.tsx' },
        ]);
      } catch (err) {
        setError('Failed to sync with BugHunter engine');
      } finally {
        setIsLoading(false);
      }
    };

    fetchBugs();
  }, []);

  const getSeverityBadge = (severity: BugItem['severity']) => {
    switch (severity) {
      case 'critical': return <Badge variant="destructive" className="bg-red-500/20 text-red-400 border-red-500/50"><ShieldAlert size={12} className="mr-1" /> CRITICAL</Badge>;
      case 'warning': return <Badge variant="outline" className="bg-orange-500/20 text-orange-400 border-orange-500/50"><AlertTriangle size={12} className="mr-1" /> WARNING</Badge>;
      case 'info': return <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/50"><Info size={12} className="mr-1" /> INFO</Badge>;
    }
  };

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">
            Autonomous Bug Hunter
          </h1>
          <Badge variant="outline" className="bg-red-500/10 border-red-500/30 text-red-400 flex gap-2 items-center">
            <Bot size={12} />
            Agent: The Inquisitor
          </Badge>
        </div>
        <div className="flex items-center gap-2">
           {isLoading && <Loader2 className="w-4 h-4 animate-spin text-red-400" />}
           <div className="px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
            SWARM AUDIT ACTIVE
          </div>
        </div>
      </div>

      {error && (
        <Card className="bg-red-500/10 border-red-500/50">
          <CardContent className="p-4 text-red-400 flex items-center gap-2">
            <AlertTriangle size={16} />
            {error}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Scan Coverage</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">98.2%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Active Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{bugs.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Heal Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">85%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Uptime</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">100%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 bg-slate-900/50 border-red-500/20">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-bold">Vulnerability Ledger</CardTitle>
            <Button variant="ghost" size="sm" onClick={() => window.location.reload()} disabled={isLoading}>
              {isLoading ? <Loader2 className="animate-spin" /> : <Zap size={14} className="text-orange-400" />}
            </Button>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] pr-4">
              {isLoading && bugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4 py-20">
                  <Loader2 className="w-8 h-8 animate-spin text-red-500" />
                  <p className="text-slate-500 animate-pulse">Synchronizing with audit swarm...</p>
                </div>
              ) : bugs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-500">
                  <CheckCircle2 size={48} className="mb-4 opacity-20" />
                  <p>No active vulnerabilities detected.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {bugs.map((bug) => (
                    <div key={bug.id} className="p-4 rounded-lg bg-slate-800/50 border border-slate-700/50 hover:border-red-500/30 transition-all group">
                      <div className="flex justify-between items-start mb-2">
                        <div className="space-y-1">
                          <h3 className="font-bold text-slate-100 group-hover:text-red-400 transition-colors">{bug.title}</h3>
                          <p className="text-xs text-slate-500 font-mono">{bug.file}</p>
                        </div>
                        {getSeverityBadge(bug.severity)}
                      </div>
                      <div className="flex justify-between items-center text-[10px] text-slate-500">
                        <span className="flex items-center gap-1 uppercase tracking-tighter">
                          <Terminal size={10} /> {bug.status}
                        </span>
                        <span>{new Date(bug.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Terminal className="w-4 h-4 text-orange-400" />
              Real-time Inquisitor Logs
            </CardTitle>
          </CardHeader>
          <CardContent className="font-mono text-[10px] space-y-1 h-[400px] overflow-y-auto">
            <p className="text-slate-500">[08:42:01] Initializing Swarm Audit Pool (24 Units)...</p>
            <p className="text-slate-500">[08:42:02] Injecting AST Fuzzers into /src/services/hamEngine...</p>
            <p className="text-orange-400">[08:42:05] WARN: Deep recursion detected in CircularProxy, healing...</p>
            <p className="text-emerald-400">[08:42:06] SUCCESS: CircularProxy patched. Memory stable.</p>
            <p className="text-slate-500">[08:42:10] Scanning endpoint /api/health for timing attacks...</p>
            <p className="text-slate-500">[08:42:15] Fuzzing user input in SocialWorker composer...</p>
            <div className="animate-pulse text-red-500">_ SCANNING NODE TOPOLOGY...</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

const BugHunter: React.FC = () => (
  <ErrorBoundary>
    <BugHunterContent />
  </ErrorBoundary>
);

export default BugHunter;
