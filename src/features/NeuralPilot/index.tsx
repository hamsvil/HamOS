import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bot, Navigation, Zap, Shield, Loader2, Compass, Target, Activity, AlertCircle, Cpu } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ErrorBoundary } from '@/components/ErrorBoundary';

const NeuralPilotContent: React.FC = () => {
  const [isEngaged, setIsEngaged] = useState(false);
  const [altitude, setAltitude] = useState(32000);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initPilot = async () => {
      try {
        setIsLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1500));
      } catch (err) {
        setError('Neural Link failed: Synchronization error');
      } finally {
        setIsLoading(false);
      }
    };
    initPilot();
  }, []);

  return (
    <div className="p-6 space-y-6 bg-slate-950 min-h-full text-slate-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Neural Pilot
          </h1>
          <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/30">AUTOPILOT LVL 5</Badge>
        </div>
        <div className="flex items-center gap-2">
           {isLoading && <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />}
           <div className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-mono">
            COGNITIVE LINK ACTIVE
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
        <Card className="md:col-span-2 bg-slate-900/40 border-cyan-500/20 overflow-hidden relative">
          <CardHeader className="border-b border-cyan-500/10 bg-slate-900/60">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Compass className="w-4 h-4 text-cyan-400" />
              Navigation Matrix
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] p-0 flex items-center justify-center bg-black/40">
             <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-cyan-500/5 via-transparent to-transparent opacity-50" />
             <div className="z-10 text-center space-y-8">
                <div className="relative inline-block">
                   <div className={`w-48 h-48 rounded-full border-2 border-dashed border-cyan-500/30 flex items-center justify-center ${isEngaged ? 'animate-[spin_10s_linear_infinite]' : ''}`}>
                      <div className="w-32 h-32 rounded-full border border-cyan-400/20 flex items-center justify-center">
                         <Target size={32} className={`text-cyan-500 ${isEngaged ? 'animate-pulse' : 'opacity-40'}`} />
                      </div>
                   </div>
                   <div className="absolute top-0 left-0 w-full h-full flex items-center justify-center">
                      <div className="w-full h-[1px] bg-cyan-500/10" />
                      <div className="w-[1px] h-full bg-cyan-500/10 absolute" />
                   </div>
                </div>
                <div className="space-y-2">
                   <p className="text-[10px] font-mono text-cyan-400/60 uppercase tracking-[0.4em]">Spatial Awareness Protocol</p>
                   <Button 
                    variant={isEngaged ? 'destructive' : 'default'}
                    className={isEngaged ? '' : 'bg-cyan-600 hover:bg-cyan-500'}
                    onClick={() => setIsEngaged(!isEngaged)}
                    disabled={isLoading}
                   >
                     {isEngaged ? 'Disengage Pilot' : 'Engage Neural Link'}
                   </Button>
                </div>
             </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/40 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                Flight Telemetry
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>ALTITUDE</span>
                    <span className="text-cyan-400">{altitude} FT</span>
                  </div>
                  <Progress value={65} className="h-1 bg-cyan-500/10" />
               </div>
               <div className="space-y-2">
                  <div className="flex justify-between text-[10px] font-mono text-slate-500">
                    <span>COGNITIVE LOAD</span>
                    <span className="text-amber-400">22%</span>
                  </div>
                  <Progress value={22} className="h-1 bg-amber-500/10 [&>[role=progressbar]]:bg-amber-500" />
               </div>
               <div className="pt-4 border-t border-slate-800 space-y-3 font-mono text-[10px]">
                  <div className="flex justify-between">
                    <span className="text-slate-500">LATENCY:</span>
                    <span className="text-emerald-400">12ms</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">STABILITY:</span>
                    <span className="text-emerald-400">99.9%</span>
                  </div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-cyan-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Shield size={16} className="text-emerald-400" />
                Sentinel Defense
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
               <div className="p-3 rounded bg-emerald-500/5 border border-emerald-500/10 flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-xs text-slate-300 font-medium">Collision Avoidance Active</span>
               </div>
               <div className="grid grid-cols-2 gap-2 text-[10px] font-mono uppercase">
                  <div className="p-2 rounded bg-slate-800/50 border border-slate-700 text-center">Ghost Mode</div>
                  <div className="p-2 rounded bg-cyan-500/10 border border-cyan-500/20 text-center text-cyan-400">Stealth</div>
               </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-cyan-500/20">
            <CardContent className="p-4 flex items-center gap-3">
               <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                  <Cpu size={20} />
               </div>
               <div>
                  <p className="text-xs font-bold text-slate-200 uppercase tracking-tighter">Neural Engine v9</p>
                  <p className="text-[10px] text-slate-500 font-mono">Quantum Processing Link</p>
               </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

const NeuralPilot: React.FC = () => (
  <ErrorBoundary>
    <NeuralPilotContent />
  </ErrorBoundary>
);

export default NeuralPilot;
