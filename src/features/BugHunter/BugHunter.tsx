import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bug, ShieldAlert, Zap, Terminal, Bot } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LisaBaseAgent } from '@/sAgent/coreAgents/LisaBaseAgent';
import { agentLogsRuleset } from '@/services/featureRules/rules/agentLogs';

const BugHunter: React.FC = () => {
  const [agent, setAgent] = useState<LisaBaseAgent | null>(null);

  useEffect(() => {
    const rawKey = (window as any).GEMINI_API_KEY;
    const bugHunterAgent = new LisaBaseAgent({
      id: 'bug-hunter-agent',
      featureId: 'agent-logs', // Using agent-logs for now as it's the closest audit role
      name: 'The Inquisitor',
      role: 'QA & Testing Engineer',
      systemInstruction: agentLogsRuleset.systemPromptOverlay,
      apiKeys: rawKey ? [rawKey] : [],
      featureRules: agentLogsRuleset,
      logFile: 'logs/agent_bug_hunter.log'
    });
    setAgent(bugHunterAgent);
    
    bugHunterAgent.executeWithAudit('Bug Hunter initialized and started scanning.', { status: 'active' });
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-screen text-slate-200">
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
        <div className="px-3 py-1 rounded bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
          SWARM AUDIT IN PROGRESS
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Fuzzing Intensity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-400">98.2%</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">XSS Vectors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">0 FOUND</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Race Conditions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">STABLE</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-900/50 border-red-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-[10px] uppercase tracking-widest text-slate-500">Leak Detection</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-400">0.00kb/s</div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-slate-900/50 border-red-500/20">
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Terminal className="w-4 h-4 text-orange-400" />
            Live Audit Stream
          </CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-[10px] space-y-1 h-[300px] overflow-y-auto">
          <p className="text-slate-500">[08:42:01] Initializing Swarm Audit Pool (24 Units)...</p>
          <p className="text-slate-500">[08:42:02] Injecting AST Fuzzers into /src/services/hamEngine...</p>
          <p className="text-orange-400">[08:42:05] WARN: Deep recursion detected in CircularProxy, healing...</p>
          <p className="text-emerald-400">[08:42:06] SUCCESS: CircularProxy patched. Memory stable.</p>
          <p className="text-slate-500">[08:42:10] Scanning endpoint /api/health for timing attacks...</p>
          <div className="animate-pulse">_</div>
          <div className="mt-8 text-center py-10 border border-dashed border-red-500/10 rounded">
             <p className="text-muted-foreground italic">Red-Team Simulation Environment Active</p>
             <p className="text-[10px] text-red-400/40 mt-2 font-mono">[STUB: Automated Fuzzing Mocked]</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BugHunter;
