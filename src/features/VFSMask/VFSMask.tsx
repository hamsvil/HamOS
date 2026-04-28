import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Layers, Eye, ShieldCheck, Database } from 'lucide-react';

const VFSMask: React.FC = () => {
  return (
    <div className="p-6 space-y-6 bg-background/50 backdrop-blur-xl min-h-screen text-slate-200">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent font-mono">
          Aura / VFS Mask
        </h1>
        <div className="flex gap-2">
          <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-mono animate-pulse">
            QUANTUM SYNC ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2 bg-slate-900/40 border-emerald-500/20 backdrop-blur-md">
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Layers className="w-4 h-4 text-emerald-400" />
              Holographic VFS Mapping
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] relative overflow-hidden flex items-center justify-center border border-emerald-500/10 rounded-lg m-2">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-emerald-500/5 via-transparent to-transparent" />
            <div className="text-center z-10 space-y-4">
               <div className="flex justify-center gap-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="w-8 h-32 bg-emerald-500/20 rounded-t border-t border-x border-emerald-500/40 animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
                  ))}
               </div>
               <p className="text-muted-foreground font-mono text-xs">Visualizing OPFS Node Topology...</p>
               <p className="text-[10px] text-emerald-400/40 font-mono">[STUB: WebGL Data Layer Rendered]</p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="bg-slate-900/40 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                Security Overlays
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-xs font-mono">Encryption</span>
                <span className="text-xs text-emerald-400 font-bold">AES-256</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded bg-emerald-500/5 border border-emerald-500/10">
                <span className="text-xs font-mono">Masking</span>
                <span className="text-xs text-emerald-400 font-bold">ENABLED</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-emerald-500/20">
            <CardHeader>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-400" />
                VFS Statistics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 font-mono text-[10px]">
              <div className="flex justify-between">
                <span className="text-slate-500">Total Nodes:</span>
                <span>1,248</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Hybrid Sync:</span>
                <span className="text-emerald-400">Stable</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Latency:</span>
                <span>0.4ms</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default VFSMask;
